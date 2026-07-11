import { FilterQuery, Types } from 'mongoose';
import { IOrder, OrderModel } from '../models/order.model';
import { OrderStatus } from '../../../shared/enums';

export class OrderRepository {
  async create(data: Partial<IOrder>): Promise<IOrder> {
    return OrderModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<IOrder | null> {
    return OrderModel.findById(id);
  }

  async findByOrderNumber(orderNumber: string): Promise<IOrder | null> {
    return OrderModel.findOne({ orderNumber });
  }

  async findByCustomer(customerId: string | Types.ObjectId, filter: FilterQuery<IOrder> = {}) {
    return OrderModel
      .find({ customerId: new Types.ObjectId(customerId), ...filter })
      .sort({ createdAt: -1 });
  }

  async findBySubscription(subscriptionId: string | Types.ObjectId) {
    return OrderModel
      .find({ subscriptionId: new Types.ObjectId(subscriptionId) })
      .sort({ createdAt: -1 });
  }

  async findByRazorpayOrderId(razorpayOrderId: string): Promise<IOrder | null> {
    return OrderModel.findOne({ razorpayOrderId });
  }

  async update(id: string | Types.ObjectId, patch: Partial<IOrder>): Promise<IOrder | null> {
    return OrderModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  }

  /**
   * BUG FIXED (found live-testing the shipping module): `patch` here used
   * to be silently discarded — order.service.ts's updateStatus() builds a
   * patch with confirmedAt/packedAt/shippedAt/deliveredAt/completedAt and,
   * for SHIPPED, trackingNumber/trackingUrl/carrier, but this method's
   * signature never accepted it, so only `status` (via the hardcoded $set
   * below) and the timeline entry were ever persisted. Every one of those
   * timestamp/tracking fields has been silently no-op on every order
   * status change. Confirmed live: booking a shipment correctly moved the
   * order to "shipped" but left trackingNumber/carrier empty on the order
   * document even though they were passed in.
   */
  async appendTimeline(
    id: string | Types.ObjectId,
    event: { status: string; note?: string; actor?: Types.ObjectId },
    patch: Partial<IOrder> = {}
  ) {
    return OrderModel.findByIdAndUpdate(
      id,
      {
        $push: { timeline: { ...event, at: new Date() } },
        $set: { ...patch, status: event.status },
      },
      { new: true }
    );
  }

  async paginate(filter: FilterQuery<IOrder> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      OrderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      OrderModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async statsForAdmin() {
    const [pending, confirmed, shipped, delivered, completed, cancelled] = await Promise.all([
      OrderModel.countDocuments({ status: OrderStatus.PENDING }),
      OrderModel.countDocuments({ status: OrderStatus.CONFIRMED }),
      OrderModel.countDocuments({ status: OrderStatus.SHIPPED }),
      OrderModel.countDocuments({ status: OrderStatus.DELIVERED }),
      OrderModel.countDocuments({ status: OrderStatus.COMPLETED }),
      OrderModel.countDocuments({ status: OrderStatus.CANCELLED }),
    ]);
    const revenueAgg = await OrderModel.aggregate([
      { $match: { status: { $in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]);
    return {
      pending, confirmed, shipped, delivered, completed, cancelled,
      revenue: revenueAgg[0]?.total ?? 0,
    };
  }
}
