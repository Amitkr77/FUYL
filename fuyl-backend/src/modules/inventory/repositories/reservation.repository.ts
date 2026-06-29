import { Types } from 'mongoose';
import { IStockReservation, StockReservationModel } from '../models/reservation.model';

export class StockReservationRepository {
  async create(data: Partial<IStockReservation>): Promise<IStockReservation> {
    return StockReservationModel.create(data);
  }

  async findByCart(cartId: string | Types.ObjectId) {
    return StockReservationModel.find({
      cartId: new Types.ObjectId(cartId.toString()),
      status: 'active',
    });
  }

  async findByOrder(orderId: string | Types.ObjectId) {
    return StockReservationModel.find({
      orderId: new Types.ObjectId(orderId.toString()),
    });
  }

  async findExpired(): Promise<IStockReservation[]> {
    return StockReservationModel.find({
      status: 'active',
      expiresAt: { $lt: new Date() },
    });
  }

  async markFulfilled(id: string | Types.ObjectId): Promise<void> {
    await StockReservationModel.findByIdAndUpdate(id, {
      $set: { status: 'fulfilled', fulfilledAt: new Date() },
    });
  }

  async markReleased(id: string | Types.ObjectId): Promise<void> {
    await StockReservationModel.findByIdAndUpdate(id, {
      $set: { status: 'released', releasedAt: new Date() },
    });
  }

  async markExpired(id: string | Types.ObjectId): Promise<void> {
    await StockReservationModel.findByIdAndUpdate(id, {
      $set: { status: 'expired' },
    });
  }

  async releaseByCart(cartId: string | Types.ObjectId): Promise<IStockReservation[]> {
    const reservations = await this.findByCart(cartId);
    for (const r of reservations) {
      await this.markReleased(r._id);
    }
    return reservations;
  }

  async fulfillByOrder(orderId: string | Types.ObjectId): Promise<IStockReservation[]> {
    const reservations = await StockReservationModel.find({
      orderId: new Types.ObjectId(orderId.toString()),
      status: 'active',
    });
    for (const r of reservations) {
      await this.markFulfilled(r._id);
    }
    return reservations;
  }
}
