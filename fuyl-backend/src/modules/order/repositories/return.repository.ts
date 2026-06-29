import { FilterQuery, Types } from 'mongoose';
import { IReturn, ReturnModel } from '../models/return.model';
import { IRefund, RefundModel } from '../models/refund.model';
import { IInvoice, InvoiceModel } from '../models/invoice.model';

export class ReturnRepository {
  async create(data: Partial<IReturn>): Promise<IReturn> {
    return ReturnModel.create(data);
  }
  async findById(id: string | Types.ObjectId): Promise<IReturn | null> {
    return ReturnModel.findById(id);
  }
  async findByOrder(orderId: string | Types.ObjectId): Promise<IReturn[]> {
    return ReturnModel.find({ orderId: new Types.ObjectId(orderId) }).sort({ createdAt: -1 });
  }
  async findByCustomer(customerId: string | Types.ObjectId): Promise<IReturn[]> {
    return ReturnModel.find({ customerId: new Types.ObjectId(customerId) }).sort({ createdAt: -1 });
  }
  async update(id: string | Types.ObjectId, patch: Partial<IReturn>): Promise<IReturn | null> {
    return ReturnModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }
  async paginate(filter: FilterQuery<IReturn> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ReturnModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ReturnModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}

export class RefundRepository {
  async create(data: Partial<IRefund>): Promise<IRefund> {
    return RefundModel.create(data);
  }
  async findById(id: string | Types.ObjectId): Promise<IRefund | null> {
    return RefundModel.findById(id);
  }
  async findByOrder(orderId: string | Types.ObjectId): Promise<IRefund[]> {
    return RefundModel.find({ orderId: new Types.ObjectId(orderId) }).sort({ createdAt: -1 });
  }
  async update(id: string | Types.ObjectId, patch: Partial<IRefund>): Promise<IRefund | null> {
    return RefundModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }
}

export class InvoiceRepository {
  async create(data: Partial<IInvoice>): Promise<IInvoice> {
    return InvoiceModel.create(data);
  }
  async findById(id: string | Types.ObjectId): Promise<IInvoice | null> {
    return InvoiceModel.findById(id);
  }
  async findByOrder(orderId: string | Types.ObjectId): Promise<IInvoice[]> {
    return InvoiceModel.find({ orderId: new Types.ObjectId(orderId) }).sort({ createdAt: -1 });
  }
  async findByInvoiceNumber(invoiceNumber: string): Promise<IInvoice | null> {
    return InvoiceModel.findOne({ invoiceNumber });
  }
  async update(id: string | Types.ObjectId, patch: Partial<IInvoice>): Promise<IInvoice | null> {
    return InvoiceModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }
}
