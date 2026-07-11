import { FilterQuery, Types } from 'mongoose';
import { IShipment, ShipmentModel } from '../models/shipment.model';

export class ShipmentRepository {
  async create(data: Partial<IShipment>): Promise<IShipment> {
    return ShipmentModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<IShipment | null> {
    return ShipmentModel.findById(id);
  }

  async findByOrder(orderId: string | Types.ObjectId): Promise<IShipment[]> {
    return ShipmentModel.find({ orderId: new Types.ObjectId(orderId.toString()) }).sort({ createdAt: -1 });
  }

  async findByTrackingNumber(trackingNumber: string): Promise<IShipment | null> {
    return ShipmentModel.findOne({ trackingNumber });
  }

  async paginate(filter: FilterQuery<IShipment> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ShipmentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ShipmentModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async addTimelineEvent(
    id: string | Types.ObjectId,
    event: { status: string; note?: string; location?: string },
    extraPatch: Record<string, unknown> = {}
  ): Promise<IShipment | null> {
    return ShipmentModel.findByIdAndUpdate(
      id,
      {
        $set: { status: event.status, ...extraPatch },
        $push: { timeline: { status: event.status, at: new Date(), note: event.note, location: event.location } },
      },
      { new: true }
    );
  }

  async statsForAdmin() {
    const [pending, inTransit, delivered, failed] = await Promise.all([
      ShipmentModel.countDocuments({ status: { $in: ['pending', 'label_created'] } }),
      ShipmentModel.countDocuments({ status: { $in: ['picked_up', 'in_transit', 'out_for_delivery'] } }),
      ShipmentModel.countDocuments({ status: 'delivered' }),
      ShipmentModel.countDocuments({ status: { $in: ['failed', 'returned_to_origin'] } }),
    ]);
    return { pending, inTransit, delivered, failed };
  }
}
