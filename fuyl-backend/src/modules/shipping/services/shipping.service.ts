import { ShipmentRepository } from '../repositories/shipment.repository';
import { createShipmentWithCarrier } from '../utils/carrierProvider';
import { shiprocketService } from '../utils/shiprocket.service';
import { nextNumber } from '../../order/utils/counter';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import { OrderStatus, ShipmentStatus } from '../../../shared/enums';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';
import { Types } from 'mongoose';
import { CreateShipmentDTO, UpdateShipmentStatusDTO } from '../validators';

const shipmentRepo = new ShipmentRepository();

// Forward ordering of the "happy path" scan states — used by tracking sync to
// decide whether a carrier-reported status is a forward move.
const STATUS_ORDER: string[] = [
  ShipmentStatus.PENDING, ShipmentStatus.LABEL_CREATED, ShipmentStatus.PICKED_UP,
  ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED,
];
const TERMINAL: string[] = [ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED_TO_ORIGIN, ShipmentStatus.CANCELLED];
const INTERMEDIATE: string[] = [ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY];

const STATUS_LABELS: Record<string, string> = {
  picked_up: 'Picked up', in_transit: 'In transit', out_for_delivery: 'Out for delivery',
  delivered: 'Delivered', failed: 'Delivery failed', returned_to_origin: 'Returned to origin', cancelled: 'Cancelled',
};

/** Map a Shiprocket scan status string to our ShipmentStatus (null if unknown). */
function mapShiprocketStatus(raw: string): typeof ShipmentStatus[keyof typeof ShipmentStatus] | null {
  const s = raw.toLowerCase();
  if (s.includes('deliver') && s.includes('out')) return ShipmentStatus.OUT_FOR_DELIVERY;
  if (s.includes('delivered')) return ShipmentStatus.DELIVERED;
  if (s.includes('rto') || s.includes('return')) return ShipmentStatus.RETURNED_TO_ORIGIN;
  if (s.includes('cancel')) return ShipmentStatus.CANCELLED;
  if (s.includes('pickup') || s.includes('picked')) return ShipmentStatus.PICKED_UP;
  if (s.includes('transit') || s.includes('dispatch')) return ShipmentStatus.IN_TRANSIT;
  if (s.includes('undeliver') || s.includes('fail')) return ShipmentStatus.FAILED;
  return null;
}

// Statuses that legally follow each shipment status — prevents skipping
// straight to "delivered" from "pending" or moving a terminal shipment
// backward. Cancellation is allowed from any non-terminal state.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['label_created', 'cancelled'],
  label_created: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'failed', 'cancelled'],
  in_transit: ['out_for_delivery', 'failed'],
  out_for_delivery: ['delivered', 'failed'],
  delivered: [],
  failed: ['returned_to_origin', 'in_transit'],
  returned_to_origin: [],
  cancelled: [],
};

class ShippingService {
  /**
   * Book a shipment for an order — creates the Shipment record via the
   * carrier abstraction, then drives the order's existing status/tracking
   * fields through orderService.updateStatus() so the already-tested
   * ORDER_SHIPPED event (-> inventory fulfillment, customer notification)
   * fires exactly as it does for a manual admin status change. The
   * shipment module adds granular multi-state carrier tracking on top —
   * it doesn't replace the order's own shipped/delivered fields, it feeds them.
   */
  async createFromOrder(dto: CreateShipmentDTO, actorId: string, actorRole: string): Promise<any> {
    const { orderService } = await import('../../order/services/order.service');
    const order = await orderService.getById(dto.orderId);

    if (actorRole === 'seller' && !order.sellerIds.some((s: Types.ObjectId) => s.toString() === actorId)) {
      throw new ForbiddenError('Not your order');
    }
    const shippableStatuses: string[] = [OrderStatus.CONFIRMED, OrderStatus.PACKED];
    if (!shippableStatuses.includes(order.status)) {
      throw new BadRequestError(`Cannot ship an order in "${order.status}" state — must be confirmed or packed first`);
    }

    // Seller: explicit → order's seller → the actor (single-seller store).
    const sellerId = dto.sellerId ?? order.sellerIds[0]?.toString() ?? actorId;

    const shipmentNumber = await nextNumber('SHP');
    const addr = order.shippingAddress;
    const isCod = order.paymentMethod === 'cod';
    const booking = await createShipmentWithCarrier({
      carrier: dto.carrier,
      shipmentNumber,
      orderNumber: order.orderNumber,
      consignee: {
        name: addr.fullName,
        phone: addr.phone,
        line1: addr.line1,
        line2: addr.line2,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        country: addr.country,
      },
      paymentMode: isCod ? 'COD' : 'Prepaid',
      codAmount: isCod ? order.grandTotal : 0,
      declaredValue: order.grandTotal,
      weightGrams: dto.weightGrams,
      dimensionsCm: dto.dimensionsCm,
      productsDesc: `Order ${order.orderNumber}`,
    });

    const shipment = await shipmentRepo.create({
      shipmentNumber,
      orderId: new Types.ObjectId(dto.orderId),
      sellerId: new Types.ObjectId(sellerId),
      customerId: order.customerId,
      status: ShipmentStatus.LABEL_CREATED,
      carrier: dto.carrier,
      trackingNumber: booking.trackingNumber,
      trackingUrl: booking.trackingUrl,
      labelUrl: booking.labelUrl,
      shippingAddress: order.shippingAddress,
      weightGrams: dto.weightGrams,
      dimensionsCm: dto.dimensionsCm,
      currency: order.currency,
      timeline: [{ status: ShipmentStatus.LABEL_CREATED, at: new Date(), note: 'Shipment booked' }],
    } as any);

    // Sync the order's own tracking fields + fire ORDER_SHIPPED.
    await orderService.updateStatus(dto.orderId, {
      status: OrderStatus.SHIPPED,
      trackingNumber: booking.trackingNumber,
      trackingUrl: booking.trackingUrl,
      carrier: dto.carrier,
    }, actorId);

    logger.info(`[shipping] created shipment ${shipmentNumber} for order ${dto.orderId} via ${dto.carrier}`);
    return shipment;
  }

  /**
   * Is a pincode deliverable? When no carrier is configured (dev), default to
   * serviceable so checkout isn't blocked locally.
   */
  async checkServiceability(pincode: string) {
    if (!shiprocketService.isConfigured()) {
      return { serviceable: true, prepaid: true, cod: true };
    }
    return shiprocketService.checkServiceability(pincode);
  }

  /**
   * Quote a shipping charge (rupees) to a pincode. Returns cost: 0 when no
   * carrier is configured, and serviceable:false when the pincode isn't covered.
   */
  async quoteRate(params: { pincode: string; weightGrams?: number; paymentMode?: 'Prepaid' | 'COD' }) {
    if (!shiprocketService.isConfigured()) {
      return { serviceable: true, cost: 0 as number | null };
    }
    const serv = await shiprocketService.checkServiceability(params.pincode, params.weightGrams ?? 500, params.paymentMode === 'COD');
    if (!serv.serviceable) return { serviceable: false, cost: null as number | null };
    const cost = await shiprocketService.getRate({
      destPin: params.pincode,
      weightGrams: params.weightGrams ?? 500,
      paymentMode: params.paymentMode ?? 'Prepaid',
    });
    return { serviceable: true, cost };
  }

  async getById(id: string) {
    const s = await shipmentRepo.findById(id);
    if (!s) throw new NotFoundError('Shipment');
    return s;
  }

  async listByOrder(orderId: string) {
    return shipmentRepo.findByOrder(orderId);
  }

  async listBySeller(sellerId: string, page = 1, limit = 20) {
    return shipmentRepo.paginate({ sellerId: new Types.ObjectId(sellerId) }, page, limit);
  }

  async listAllForAdmin(filter: Record<string, unknown> = {}, page = 1, limit = 20) {
    return shipmentRepo.paginate(filter, page, limit);
  }

  async statsForAdmin() {
    return shipmentRepo.statsForAdmin();
  }

  async updateStatus(id: string, dto: UpdateShipmentStatusDTO, actorId: string, actorRole: string): Promise<any> {
    const shipment = await this.getById(id);
    if (actorRole === 'seller' && shipment.sellerId.toString() !== actorId) {
      throw new ForbiddenError('Not your shipment');
    }

    const allowed = ALLOWED_TRANSITIONS[shipment.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestError(`Cannot move shipment from "${shipment.status}" to "${dto.status}"`);
    }
    return this.applyStatus(shipment, dto.status, actorId, dto.note, dto.location);
  }

  /**
   * Applies a status change with all side-effects (timeline entry, order sync
   * on delivery, intermediate customer notification). Shared by manual
   * updateStatus (adjacency-checked) and carrier tracking sync (rank-checked).
   */
  private async applyStatus(
    shipment: any,
    status: typeof ShipmentStatus[keyof typeof ShipmentStatus],
    actorId: string,
    note?: string,
    location?: string,
  ): Promise<any> {
    // 'system' isn't a valid ObjectId — order-status calls take undefined for
    // automated (carrier-sync) transitions.
    const orderActor = actorId === 'system' ? undefined : actorId;

    const extraPatch: Record<string, unknown> = {};
    if (status === ShipmentStatus.DELIVERED) extraPatch.deliveredAt = new Date();
    // NDR: count each failed delivery attempt and record the latest reason.
    if (status === ShipmentStatus.FAILED) {
      extraPatch.deliveryAttempts = (shipment.deliveryAttempts ?? 0) + 1;
      if (note) extraPatch.lastNdrReason = note;
    }

    const updated = await shipmentRepo.addTimelineEvent(
      shipment.id,
      { status, note, location },
      extraPatch
    );

    // Keep the order's own status in sync on delivery — same mechanism
    // createFromOrder() uses, so ORDER_DELIVERED fires normally too.
    if (status === ShipmentStatus.DELIVERED) {
      const { orderService } = await import('../../order/services/order.service');
      try {
        await orderService.updateStatus(shipment.orderId.toString(), { status: OrderStatus.DELIVERED }, orderActor);
      } catch (err) {
        logger.warn(`[shipping] could not sync order ${shipment.orderId} to delivered`, err);
      }
    }

    // RTO: reconcile the order (mark returned + refund prepaid).
    if (status === ShipmentStatus.RETURNED_TO_ORIGIN) {
      const { orderService } = await import('../../order/services/order.service');
      try {
        await orderService.handleRtoReturn(shipment.orderId.toString());
      } catch (err) {
        logger.error(`[shipping] RTO reconciliation failed for order ${shipment.orderId}`, err);
      }
    }

    // Notify the customer on intermediate scans (shipped/delivered already
    // have their own order-level emails via ORDER_SHIPPED/ORDER_DELIVERED).
    if (INTERMEDIATE.includes(status)) {
      eventBus.publish(Events.SHIPMENT_STATUS_UPDATED, {
        shipmentId: shipment.id,
        orderId: shipment.orderId.toString(),
        userId: shipment.customerId.toString(),
        status,
        statusLabel: STATUS_LABELS[status] ?? status,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
        carrier: shipment.carrier,
      });
    }

    logger.info(`[shipping] shipment ${shipment.shipmentNumber} -> ${status}`);
    return updated;
  }

  /**
   * Pull the latest scan status from Shiprocket and advance the shipment if
   * the carrier reports a forward move. No-op when Shiprocket isn't
   * configured, the shipment is terminal, or the reported status isn't a
   * forward transition.
   */
  async syncTracking(id: string): Promise<any> {
    const shipment = await this.getById(id);
    if (!shipment.trackingNumber || !shiprocketService.isConfigured()) return shipment;
    if (TERMINAL.includes(shipment.status)) return shipment;

    const t = await shiprocketService.track(shipment.trackingNumber);
    const mapped = t?.status ? mapShiprocketStatus(t.status) : null;
    if (!mapped || mapped === shipment.status) return shipment;
    if (!this.canAdvanceTo(shipment.status, mapped)) return shipment;

    return this.applyStatus(shipment, mapped, 'system', `Auto-synced from Shiprocket: ${t?.status}`, t?.location);
  }

  /**
   * Push-based counterpart to syncTracking() — advances a shipment the
   * instant Shiprocket calls our webhook, instead of waiting for the next
   * scheduled poll. Same forward-only guard (canAdvanceTo) either way, so a
   * webhook and a poll landing for the same shipment can never conflict or
   * double-apply.
   *
   * ⚠️ VERIFY the payload field names below against what your Shiprocket
   * webhook actually sends — `awb` and `current_status` are the commonly
   * documented ones, but Shiprocket has varied this across API versions.
   */
  async handleShiprocketWebhook(payload: Record<string, any>): Promise<any> {
    const awb = payload?.awb ?? payload?.awb_code;
    const rawStatus = payload?.current_status ?? payload?.shipment_status;
    if (!awb || !rawStatus) {
      logger.warn('[shipping] shiprocket webhook missing awb/status', payload);
      return null;
    }

    const shipment = await shipmentRepo.findByTrackingNumber(String(awb));
    if (!shipment) {
      // Not necessarily an error — could be a shipment booked/managed
      // outside this app, or a stale test webhook. Nothing to update.
      logger.info(`[shipping] shiprocket webhook for unknown AWB ${awb}`);
      return null;
    }
    if (TERMINAL.includes(shipment.status)) return shipment;

    const mapped = mapShiprocketStatus(String(rawStatus));
    if (!mapped || mapped === shipment.status) return shipment;
    if (!this.canAdvanceTo(shipment.status, mapped)) return shipment;

    return this.applyStatus(shipment, mapped, 'system', `Webhook from Shiprocket: ${rawStatus}`, payload?.current_status_location ?? payload?.location);
  }

  /** Batch tracking sync for all non-terminal shipments (scheduler-driven). */
  async syncActiveShipments(limit = 200): Promise<{ synced: number }> {
    if (!shiprocketService.isConfigured()) return { synced: 0 };
    const active = await shipmentRepo.findActiveTracked(limit);
    let synced = 0;
    for (const s of active) {
      try { await this.syncTracking(s.id); synced++; }
      catch (err) { logger.warn(`[shipping] tracking sync failed for ${s.shipmentNumber}`, err); }
    }
    return { synced };
  }

  /**
   * Re-attempt delivery for a failed (NDR) shipment: ask Shiprocket to retry
   * (best-effort) and move the shipment back to in_transit so it re-enters the
   * tracking flow.
   */
  async requestReattempt(id: string, actorId: string): Promise<any> {
    const shipment = await this.getById(id);
    if (shipment.status !== ShipmentStatus.FAILED) {
      throw new BadRequestError('Only a failed shipment can be re-attempted');
    }
    if (shiprocketService.isConfigured() && shipment.trackingNumber) {
      await shiprocketService.requestReattempt(shipment.trackingNumber);
    }
    return this.applyStatus(shipment, ShipmentStatus.IN_TRANSIT, actorId, 'Delivery re-attempt requested');
  }

  /** Shipping-label URL for a shipment (Shiprocket packing slip), if available. */
  async getLabelUrl(id: string): Promise<{ url: string | null }> {
    const shipment = await this.getById(id);
    if (shipment.labelUrl) return { url: shipment.labelUrl };
    if (!shipment.trackingNumber || !shiprocketService.isConfigured()) return { url: null };
    const url = await shiprocketService.getPackingSlipUrl(shipment.trackingNumber);
    if (url) await shipmentRepo.update(id, { labelUrl: url } as any);
    return { url };
  }

  private canAdvanceTo(current: string, next: string): boolean {
    // Terminal branches (failed / RTO / cancelled) are always allowed.
    if (TERMINAL.includes(next) || next === ShipmentStatus.FAILED) return true;
    const ci = STATUS_ORDER.indexOf(current);
    const ni = STATUS_ORDER.indexOf(next);
    return ci >= 0 && ni > ci;
  }
}

export const shippingService = new ShippingService();
