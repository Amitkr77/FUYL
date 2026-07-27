import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { BadRequestError } from '../../../shared/errors';

/**
 * Delhivery B2C API client (serviceability, rate, waybill creation, tracking).
 *
 * ⚠️ VERIFY endpoint paths / field names against your Delhivery account &
 * onboarding docs, and test in staging first. Auth is `Authorization: Token
 * <API_TOKEN>`. Base host differs by environment.
 */

export interface DelhiveryConsignee {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface DelhiveryCreateInput {
  orderNumber: string;
  consignee: DelhiveryConsignee;
  paymentMode: 'Prepaid' | 'COD';
  codAmount?: number;      // rupees, required when paymentMode = COD
  declaredValue: number;   // rupees — order value
  weightGrams: number;
  dimensionsCm?: { length: number; width: number; height: number };
  productsDesc?: string;
}

export interface DelhiveryCreateResult {
  waybill: string;
  trackingUrl: string;
}

export interface DelhiveryServiceability {
  serviceable: boolean;
  prepaid: boolean;
  cod: boolean;
}

class DelhiveryService {
  private get baseUrl(): string {
    return env.delhivery.mode === 'production'
      ? 'https://track.delhivery.com'
      : 'https://staging-express.delhivery.com';
  }

  /** True only when a token AND a registered pickup location are configured. */
  isConfigured(): boolean {
    return Boolean(env.delhivery.apiToken && env.delhivery.pickup.name && env.delhivery.pickup.pincode);
  }

  private get authHeaders(): Record<string, string> {
    if (!env.delhivery.apiToken) throw new BadRequestError('Delhivery API token not configured');
    return { Authorization: `Token ${env.delhivery.apiToken}`, Accept: 'application/json' };
  }

  trackingUrl(waybill: string): string {
    return `https://www.delhivery.com/track/package/${waybill}`;
  }

  async checkServiceability(pincode: string): Promise<DelhiveryServiceability> {
    const url = `${this.baseUrl}/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pincode)}`;
    const json = await this.get(url);
    const pc = json?.delivery_codes?.[0]?.postal_code;
    if (!pc) return { serviceable: false, prepaid: false, cod: false };
    return {
      serviceable: true,
      prepaid: pc.pre_paid === 'Y',
      cod: pc.cod === 'Y',
    };
  }

  /**
   * Shipping charge in rupees for a parcel to `destPin`. `md`: 'S' (surface)
   * or 'E' (express). Returns null if Delhivery doesn't quote a price.
   */
  async getRate(params: {
    destPin: string;
    weightGrams: number;
    paymentMode: 'Prepaid' | 'COD';
    mode?: 'S' | 'E';
  }): Promise<number | null> {
    const qs = new URLSearchParams({
      md: params.mode ?? 'S',
      cgm: String(Math.max(1, Math.round(params.weightGrams))),
      o_pin: env.delhivery.pickup.pincode,
      d_pin: params.destPin,
      ss: 'Delivered',
      pt: params.paymentMode === 'COD' ? 'COD' : 'Pre-paid',
    });
    const url = `${this.baseUrl}/api/kinko/v1/invoice/charges/.json?${qs.toString()}`;
    const json = await this.get(url);
    const total = Array.isArray(json) ? json[0]?.total_amount : json?.total_amount;
    return typeof total === 'number' ? total : null;
  }

  async createShipment(input: DelhiveryCreateInput): Promise<DelhiveryCreateResult> {
    const pickup = env.delhivery.pickup;
    const c = input.consignee;
    const payload = {
      pickup_location: { name: pickup.name },
      shipments: [
        {
          name: c.name,
          add: [c.line1, c.line2].filter(Boolean).join(', '),
          pin: c.pincode,
          city: c.city,
          state: c.state,
          country: c.country ?? 'India',
          phone: c.phone,
          order: input.orderNumber,
          payment_mode: input.paymentMode,
          cod_amount: input.paymentMode === 'COD' ? (input.codAmount ?? input.declaredValue) : 0,
          total_amount: input.declaredValue,
          products_desc: input.productsDesc ?? 'FUYL order',
          weight: Math.max(1, Math.round(input.weightGrams)),
          shipment_length: input.dimensionsCm?.length,
          shipment_width: input.dimensionsCm?.width,
          shipment_height: input.dimensionsCm?.height,
        },
      ],
    };

    // Delhivery's create endpoint expects form-encoded `format=json&data=<json>`.
    const body = `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;
    const res = await fetch(`${this.baseUrl}/api/cmu/create.json`, {
      method: 'POST',
      headers: { ...this.authHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json: any = await res.json().catch(() => ({}));
    const pkg = json?.packages?.[0];
    if (!res.ok || !pkg?.waybill || pkg?.status === 'Fail') {
      logger.error('[delhivery] create shipment failed', json);
      throw new BadRequestError(
        `Delhivery booking failed: ${pkg?.remarks ?? json?.rmk ?? 'unknown error'}`
      );
    }
    return { waybill: pkg.waybill, trackingUrl: this.trackingUrl(pkg.waybill) };
  }

  /**
   * Best-effort shipping-label / packing-slip URL for a waybill.
   * ⚠️ VERIFY the packing-slip response shape for your account.
   */
  async getPackingSlipUrl(waybill: string): Promise<string | null> {
    const url = `${this.baseUrl}/api/p/packing_slip?wbns=${encodeURIComponent(waybill)}&pdf=true`;
    try {
      const json = await this.get(url);
      const pkg = json?.packages?.[0];
      return pkg?.pdf_download_link ?? json?.pdf_download_link ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Request a delivery re-attempt for an undelivered (NDR) shipment.
   * Best-effort — returns false on any failure rather than throwing.
   * ⚠️ VERIFY the NDR action endpoint/payload for your account.
   */
  async requestReattempt(waybill: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/p/update`, {
        method: 'POST',
        headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [{ waybill, act: 'RE-ATTEMPT' }] }),
      });
      if (!res.ok) logger.warn(`[delhivery] re-attempt request returned ${res.status} for ${waybill}`);
      return res.ok;
    } catch (err) {
      logger.error(`[delhivery] re-attempt request failed for ${waybill}`, err);
      return false;
    }
  }

  /** Best-effort current status for a waybill. */
  async track(waybill: string): Promise<{ status?: string; location?: string; timestamp?: string } | null> {
    const url = `${this.baseUrl}/api/v1/packages/json/?waybill=${encodeURIComponent(waybill)}`;
    const json = await this.get(url);
    const shipment = json?.ShipmentData?.[0]?.Shipment;
    const st = shipment?.Status;
    if (!st) return null;
    return { status: st.Status, location: st.StatusLocation, timestamp: st.StatusDateTime };
  }

  private async get(url: string): Promise<any> {
    try {
      const res = await fetch(url, { headers: this.authHeaders });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        logger.error(`[delhivery] GET ${url} failed`, json);
        throw new BadRequestError('Delhivery request failed');
      }
      return json;
    } catch (err) {
      logger.error(`[delhivery] request failed ${url}`, err);
      throw err;
    }
  }
}

export const delhiveryService = new DelhiveryService();
