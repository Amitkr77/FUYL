import { FilterQuery } from 'mongoose';
import { IOrder } from '../../modules/order/models/order.model';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../enums';

const TERMINAL_NON_ORDER_STATUSES = [OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED];
const PAID_STATUSES = [PaymentStatus.SUCCESS, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED];
const COD_RECOGNIZED_STATUSES = [OrderStatus.DELIVERED, OrderStatus.CLOSED, OrderStatus.COMPLETED];

/** Orders that represent a genuine purchase, rather than a failed/pending online attempt. */
export function validOrderMatch(extra: FilterQuery<IOrder> = {}): FilterQuery<IOrder> {
  return {
    ...extra,
    status: { $nin: TERMINAL_NON_ORDER_STATUSES },
    $or: [
      { paymentStatus: { $in: PAID_STATUSES } },
      { paymentMethod: PaymentMethod.COD },
    ],
  };
}

/** Orders whose value can be recognized as revenue. COD is recognized on delivery. */
export function recognizedRevenueMatch(extra: FilterQuery<IOrder> = {}): FilterQuery<IOrder> {
  return {
    ...extra,
    status: { $nin: [...TERMINAL_NON_ORDER_STATUSES, OrderStatus.RETURNED] },
    $or: [
      { paymentStatus: { $in: [PaymentStatus.SUCCESS, PaymentStatus.PARTIALLY_REFUNDED] } },
      { paymentMethod: PaymentMethod.COD, status: { $in: COD_RECOGNIZED_STATUSES } },
    ],
  };
}

/** Adds `_netRevenue`, subtracting any persisted partial refunds from the order total. */
export const netRevenueStages = [
  {
    $lookup: {
      from: 'payments',
      localField: '_id',
      foreignField: 'orderId',
      as: '_financialPayments',
    },
  },
  {
    $set: {
      _netRevenue: {
        $max: [
          0,
          {
            $subtract: [
              '$grandTotal',
              { $sum: { $map: { input: '$_financialPayments', as: 'payment', in: { $ifNull: ['$$payment.refundedAmount', 0] } } } },
            ],
          },
        ],
      },
    },
  },
] as const;
