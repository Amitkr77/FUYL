import { FilterQuery, Types } from 'mongoose';
import { IPayment, PaymentModel } from '../models/payment.model';
import { ITransaction, TransactionModel } from '../models/transaction.model';

export class PaymentRepository {
  async create(data: Partial<IPayment>): Promise<IPayment> {
    return PaymentModel.create(data);
  }
  async findById(id: string | Types.ObjectId): Promise<IPayment | null> {
    return PaymentModel.findById(id);
  }
  async findByPaymentNumber(paymentNumber: string): Promise<IPayment | null> {
    return PaymentModel.findOne({ paymentNumber });
  }
  async findByOrder(orderId: string | Types.ObjectId): Promise<IPayment[]> {
    return PaymentModel.find({ orderId: new Types.ObjectId(orderId) }).sort({ createdAt: -1 });
  }
  async findByRazorpayOrderId(id: string): Promise<IPayment | null> {
    return PaymentModel.findOne({ razorpayOrderId: id });
  }
  async findByRazorpayPaymentId(id: string): Promise<IPayment | null> {
    return PaymentModel.findOne({ razorpayPaymentId: id });
  }
  async update(id: string | Types.ObjectId, patch: Partial<IPayment>): Promise<IPayment | null> {
    return PaymentModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }
  async paginate(filter: FilterQuery<IPayment> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      PaymentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PaymentModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
  async statsForAdmin() {
    const [totalPayments, successCount, failedCount, refundedCount, totalAmountAgg] = await Promise.all([
      PaymentModel.countDocuments({}),
      PaymentModel.countDocuments({ status: 'success' }),
      PaymentModel.countDocuments({ status: 'failed' }),
      PaymentModel.countDocuments({ status: { $in: ['refunded', 'partially_refunded'] } }),
      PaymentModel.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);
    return {
      totalPayments,
      successCount,
      failedCount,
      refundedCount,
      totalAmount: totalAmountAgg[0]?.total ?? 0,
    };
  }
}

export class TransactionRepository {
  async create(data: Partial<ITransaction>): Promise<ITransaction> {
    return TransactionModel.create(data);
  }
  async findById(id: string | Types.ObjectId): Promise<ITransaction | null> {
    return TransactionModel.findById(id);
  }
  async findByPayment(paymentId: string | Types.ObjectId): Promise<ITransaction[]> {
    return TransactionModel.find({ paymentId: new Types.ObjectId(paymentId) }).sort({ createdAt: -1 });
  }
  async findByOrder(orderId: string | Types.ObjectId): Promise<ITransaction[]> {
    return TransactionModel.find({ orderId: new Types.ObjectId(orderId) }).sort({ createdAt: -1 });
  }
  async findByCustomer(customerId: string | Types.ObjectId, limit = 50): Promise<ITransaction[]> {
    return TransactionModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}
