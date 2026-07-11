import { ShipmentRepository } from '../repositories/shipment.repository';
import { createShipmentWithCarrier } from '../utils/carrierProvider';
import { nextNumber } from '../../order/utils/counter';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import { OrderStatus, ShipmentStatus } from '../../../shared/enums';
import { logger } from '../../../config/logger';
import { Types } from 'mongoose';
import { CreateShipmentDTO, UpdateShipmentStatusDTO } from '../validators';

const shipmentRepo = new ShipmentRepository();

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

    const shipmentNumber = await nextNumber('SHP');
    const booking = await createShipmentWithCarrier({
      carrier: dto.carrier,
      shipmentNumber,
      weightGrams: dto.weightGrams,
    });

    const shipment = await shipmentRepo.create({
      shipmentNumber,
      orderId: new Types.ObjectId(dto.orderId),
      sellerId: new Types.ObjectId(dto.sellerId),
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

    const extraPatch: Record<string, unknown> = {};
    if (dto.status === ShipmentStatus.DELIVERED) extraPatch.deliveredAt = new Date();

    const updated = await shipmentRepo.addTimelineEvent(
      id,
      { status: dto.status, note: dto.note, location: dto.location },
      extraPatch
    );

    // Keep the order's own status in sync on delivery — same mechanism
    // createFromOrder() uses, so ORDER_DELIVERED fires normally too.
    if (dto.status === ShipmentStatus.DELIVERED) {
      const { orderService } = await import('../../order/services/order.service');
      try {
        await orderService.updateStatus(shipment.orderId.toString(), { status: OrderStatus.DELIVERED }, actorId);
      } catch (err) {
        // Order may already be delivered/completed via another path — don't
        // fail the shipment update over a redundant order-status conflict.
        logger.warn(`[shipping] could not sync order ${shipment.orderId} to delivered`, err);
      }
    }

    logger.info(`[shipping] shipment ${shipment.shipmentNumber} -> ${dto.status}`);
    return updated;
  }
}

export const shippingService = new ShippingService();
