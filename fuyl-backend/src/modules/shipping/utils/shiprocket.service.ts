import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { BadRequestError } from '../../../shared/errors';

/**
 * Shiprocket External API v1 client (serviceability, rate, order booking,
 * AWB assignment, tracking). Replaces the earlier Delhivery integration —
 * same public shape (isConfigured/checkServiceability/getRate/createShipment/
 * track/getPackingSlipUrl/requestReattempt) so shipping.service.ts and
 * carrierProvider.ts didn't need a structural rewrite to switch carriers.
 *
 * Auth is a login-for-JWT flow (not a static token like Delhivery's) — the
 * token is cached in memory and re-fetched when missing/expired or after a
 * 401, rather than logging in on every request.
 *
 * ⚠️ VERIFY endpoint paths / field names against your Shiprocket account
 * before going live — Shiprocket's API has revved field names across
 * versions in the past (NDR action endpoint in particular).
 */

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

export interface ShiprocketConsignee {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface ShiprocketCreateInput {
  orderNumber: string;
  consignee: ShiprocketConsignee;
  paymentMode: 'Prepaid' | 'COD';
  codAmount?: number;      // rupees, required when paymentMode = COD
  declaredValue: number;   // rupees — order value
  weightGrams: number;
  dimensionsCm?: { length: number; width: number; height: number };
  productsDesc?: string;
}

export interface ShiprocketCreateResult {
  waybill: string;         // AWB code
  trackingUrl: string;
  providerOrderId?: string;
  providerShipmentId: string;
  courierId?: string;
}

export interface ShiprocketServiceability {
  serviceable: boolean;
  prepaid: boolean;
  cod: boolean;
  etdDays: number | null; // estimated delivery days (min across available couriers)
}

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

class ShiprocketService {
  private cachedToken: CachedToken | null = null;

  /** True only when login credentials AND a registered pickup location are configured. */
  isConfigured(): boolean {
    return Boolean(env.shiprocket.email && env.shiprocket.password && env.shiprocket.pickupLocationName);
  }

  trackingUrl(awb: string): string {
    return `https://shiprocket.co/tracking/${awb}`;
  }

  /**
   * Logs in and caches the JWT (valid ~10 days per Shiprocket's docs — we
   * refresh a little early to avoid racing the real expiry).
   */
  private async getToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.token;
    }
    if (!env.shiprocket.email || !env.shiprocket.password) {
      throw new BadRequestError('Shiprocket credentials not configured');
    }
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env.shiprocket.email, password: env.shiprocket.password }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.token) {
      logger.error('[shiprocket] login failed', json);
      throw new BadRequestError('Could not authenticate with Shiprocket');
    }
    // Cache for 9 days even though the token is valid ~10 — refresh a day early.
    this.cachedToken = { token: json.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
    return json.token;
  }

  private async request(path: string, init: RequestInit = {}, _isRetry = false): Promise<any> {
    const token = await this.getToken();
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Cached token expired/invalidated server-side — force one fresh login
    // and retry exactly once, same one-retry pattern used elsewhere in this
    // codebase for token refresh (e.g. the storefront's apiFetch).
    if (res.status === 401 && !_isRetry) {
      this.cachedToken = null;
      return this.request(path, init, true);
    }

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      logger.error(`[shiprocket] ${init.method ?? 'GET'} ${path} failed`, json);
      throw new BadRequestError(json?.message ?? 'Shiprocket request failed');
    }
    return json;
  }

  async checkServiceability(pincode: string, weightGrams = 500, cod = false): Promise<ShiprocketServiceability> {
    const qs = new URLSearchParams({
      pickup_postcode: env.shiprocket.pickupPincode,
      delivery_postcode: pincode,
      weight: String(Math.max(0.1, weightGrams / 1000)),
      cod: cod ? '1' : '0',
    });
    const json = await this.request(`/courier/serviceability/?${qs.toString()}`);
    const couriers = json?.data?.available_courier_companies ?? [];
    if (!couriers.length) return { serviceable: false, prepaid: false, cod: false, etdDays: null };
    const days = couriers
      .map((c: any) => Number(c.estimated_delivery_days))
      .filter((d: number) => Number.isFinite(d) && d > 0);
    const etdDays = days.length ? Math.min(...days) : null;
    return {
      serviceable: true,
      prepaid: true,
      cod: couriers.some((c: any) => c.cod === 1 || c.is_cod === 1) || cod,
      etdDays,
    };
  }

  /**
   * Cheapest quoted rate (rupees) to `destPin`, or null if no courier quotes one.
   */
  async getRate(params: {
    destPin: string;
    weightGrams: number;
    paymentMode: 'Prepaid' | 'COD';
  }): Promise<number | null> {
    const qs = new URLSearchParams({
      pickup_postcode: env.shiprocket.pickupPincode,
      delivery_postcode: params.destPin,
      weight: String(Math.max(0.1, params.weightGrams / 1000)),
      cod: params.paymentMode === 'COD' ? '1' : '0',
    });
    const json = await this.request(`/courier/serviceability/?${qs.toString()}`);
    const couriers = json?.data?.available_courier_companies ?? [];
    if (!couriers.length) return null;
    const rates = couriers.map((c: any) => Number(c.rate)).filter((r: number) => !Number.isNaN(r));
    return rates.length ? Math.min(...rates) : null;
  }

  /**
   * Books a shipment: creates the Shiprocket order, assigns the
   * cheapest/recommended courier's AWB, and (best-effort) schedules pickup.
   */
  async createShipment(input: ShiprocketCreateInput): Promise<ShiprocketCreateResult> {
    const c = input.consignee;
    const weightKg = Math.max(0.1, input.weightGrams / 1000);

    const orderPayload = {
      order_id: input.orderNumber,
      order_date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      pickup_location: env.shiprocket.pickupLocationName,
      billing_customer_name: c.name,
      billing_last_name: '',
      billing_address: c.line1,
      billing_address_2: c.line2 ?? '',
      billing_city: c.city,
      billing_pincode: c.pincode,
      billing_state: c.state,
      billing_country: c.country ?? 'India',
      billing_phone: c.phone,
      shipping_is_billing: true,
      order_items: [
        {
          name: input.productsDesc ?? 'FUYL order',
          sku: input.orderNumber,
          units: 1,
          selling_price: input.declaredValue,
        },
      ],
      payment_method: input.paymentMode === 'COD' ? 'COD' : 'Prepaid',
      sub_total: input.declaredValue,
      length: input.dimensionsCm?.length ?? 15,
      breadth: input.dimensionsCm?.width ?? 10,
      height: input.dimensionsCm?.height ?? 5,
      weight: weightKg,
    };

    const created = await this.request('/orders/create/adhoc', {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    });
    const shipmentId = created?.shipment_id;
    if (!shipmentId) {
      logger.error('[shiprocket] order create returned no shipment_id', created);
      throw new BadRequestError('Shiprocket booking failed: no shipment created');
    }

    // Auto-assign the best-rated courier (omitting courier_id lets Shiprocket pick).
    const assigned = await this.request('/courier/assign/awb', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: shipmentId }),
    });
    const awb = assigned?.response?.data?.awb_code;
    if (!awb) {
      logger.error('[shiprocket] AWB assignment failed', assigned);
      throw new BadRequestError('Shiprocket booking failed: could not assign a courier/AWB');
    }

    // Best-effort — a failed pickup request shouldn't fail the whole booking;
    // it can be retried/scheduled manually from the Shiprocket panel.
    try {
      await this.request('/courier/generate/pickup', {
        method: 'POST',
        body: JSON.stringify({ shipment_id: [shipmentId] }),
      });
    } catch (err) {
      logger.warn(`[shiprocket] pickup scheduling failed for shipment ${shipmentId}`, err);
    }

    return {
      waybill: awb,
      trackingUrl: this.trackingUrl(awb),
      providerOrderId: created?.order_id?.toString(),
      providerShipmentId: shipmentId.toString(),
      courierId: assigned?.response?.data?.courier_company_id?.toString(),
    };
  }

  /** Shipping-label PDF URL for an AWB, generated on demand. */
  async getPackingSlipUrl(awb: string): Promise<string | null> {
    try {
      // Shiprocket's label endpoint takes shipment_id, not the AWB directly —
      // look the shipment up via tracking first to recover it.
      const tracked = await this.request(`/courier/track/awb/${encodeURIComponent(awb)}`);
      const shipmentId = tracked?.tracking_data?.shipment_id;
      if (!shipmentId) return null;
      const label = await this.request('/courier/generate/label', {
        method: 'POST',
        body: JSON.stringify({ shipment_id: [shipmentId] }),
      });
      return label?.label_url ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Request a delivery re-attempt for an undelivered (NDR) shipment.
   * Best-effort — returns false on any failure rather than throwing.
   * ⚠️ VERIFY the NDR action endpoint/payload for your account — Shiprocket
   * has changed this endpoint's shape across API versions.
   */
  async requestReattempt(awb: string): Promise<boolean> {
    try {
      await this.request('/ndr', {
        method: 'POST',
        body: JSON.stringify({ action: 're-attempt', awb: [awb], comment: 'Customer requested re-delivery' }),
      });
      return true;
    } catch (err) {
      logger.error(`[shiprocket] re-attempt request failed for ${awb}`, err);
      return false;
    }
  }

  /** Best-effort current status for an AWB. */
  async track(awb: string): Promise<{ status?: string; location?: string; timestamp?: string } | null> {
    const json = await this.request(`/courier/track/awb/${encodeURIComponent(awb)}`);
    const activities = json?.tracking_data?.shipment_track_activities;
    const latest = activities?.[0];
    const status = json?.tracking_data?.shipment_track?.[0]?.current_status ?? latest?.status;
    if (!status) return null;
    return { status, location: latest?.location, timestamp: latest?.date };
  }
}

export const shiprocketService = new ShiprocketService();
