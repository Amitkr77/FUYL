import { UserModel } from '../../identity/models/user.model';
import { OrderModel } from '../../order/models/order.model';
import { RoleEnum, OrderStatus } from '../../../shared/enums';
import { NotFoundError } from '../../../shared/errors';
import { fromPaise, toPaise } from '../../../shared/utils';
import { netRevenueStages, recognizedRevenueMatch, validOrderMatch } from '../../../shared/utils/orderFinancials';

class AdminCustomersService {
  async stats() {
    const activeCustomerMatch = {
      'customer.role': RoleEnum.CUSTOMER,
      'customer.isDeleted': false,
    };
    const customerLookup = {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'customer',
      },
    } as const;

    const [totalCustomers, orderStats, revenueStats] = await Promise.all([
      UserModel.countDocuments({ role: RoleEnum.CUSTOMER, isDeleted: false }),
      OrderModel.aggregate([
        { $match: validOrderMatch() },
        { $group: { _id: '$customerId', orders: { $sum: 1 } } },
        customerLookup,
        { $unwind: '$customer' },
        { $match: activeCustomerMatch },
        {
          $group: {
            _id: null,
            purchasingCustomers: { $sum: 1 },
            repeatCustomers: { $sum: { $cond: [{ $gt: ['$orders', 1] }, 1, 0] } },
          },
        },
      ]),
      OrderModel.aggregate([
        { $match: recognizedRevenueMatch() },
        ...netRevenueStages,
        { $group: { _id: '$customerId', totalSpent: { $sum: '$_netRevenue' } } },
        customerLookup,
        { $unwind: '$customer' },
        { $match: activeCustomerMatch },
        { $group: { _id: null, totalRevenue: { $sum: '$totalSpent' } } },
      ]),
    ]);

    return {
      totalCustomers,
      purchasingCustomers: orderStats[0]?.purchasingCustomers ?? 0,
      repeatCustomers: orderStats[0]?.repeatCustomers ?? 0,
      totalRevenue: fromPaise(toPaise(revenueStats[0]?.totalRevenue ?? 0)),
    };
  }

  /**
   * Paginated customer list with order-count/lifetime-spend aggregated per
   * customer. No admin customer-lookup endpoint existed before this — the
   * admin dashboard's Customers pages had nothing to call.
   */
  async list(page = 1, limit = 20, search?: string) {
    const filter: Record<string, unknown> = { role: RoleEnum.CUSTOMER, isDeleted: false };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = { $regex: escaped, $options: 'i' };
      filter.$or = [{ emailLower: re }, { firstName: re }, { lastName: re }];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      UserModel.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const [orderCounts, spendStats] = await Promise.all([OrderModel.aggregate([
      { $match: validOrderMatch({ customerId: { $in: userIds } }) },
      { $group: { _id: '$customerId', orders: { $sum: 1 } } },
    ]), OrderModel.aggregate([
      { $match: recognizedRevenueMatch({ customerId: { $in: userIds } }) },
      ...netRevenueStages,
      { $group: { _id: '$customerId', totalSpent: { $sum: '$_netRevenue' } } },
    ])]);
    const statsById = new Map(orderCounts.map((s) => [s._id.toString(), { orders: s.orders, totalSpent: 0 }]));
    for (const spend of spendStats) {
      const id = spend._id.toString();
      statsById.set(id, { orders: statsById.get(id)?.orders ?? 0, totalSpent: spend.totalSpent });
    }

    const items = users.map((u) => {
      const stats = statsById.get(u._id.toString());
      return {
        id: u._id,
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
        email: u.email,
        phone: u.phone,
        joined: u.createdAt,
        orders: stats?.orders ?? 0,
        totalSpent: fromPaise(toPaise(stats?.totalSpent ?? 0)),
      };
    });

    return { items, total, page, limit };
  }

  async getById(id: string) {
    const user = await UserModel.findOne({ _id: id, role: RoleEnum.CUSTOMER, isDeleted: false });
    if (!user) throw new NotFoundError('Customer');

    const [orders, spend] = await Promise.all([
      OrderModel.find({ customerId: id }).sort({ placedAt: -1 }),
      OrderModel.aggregate([
        { $match: recognizedRevenueMatch({ customerId: user._id }) },
        ...netRevenueStages,
        { $group: { _id: null, total: { $sum: '$_netRevenue' } } },
      ]),
    ]);
    const validOrdersCount = await OrderModel.countDocuments(validOrderMatch({ customerId: user._id }));

    return {
      id: user._id,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
      email: user.email,
      phone: user.phone,
      joined: user.createdAt,
      ordersCount: validOrdersCount,
      totalSpent: fromPaise(toPaise(spend[0]?.total ?? 0)),
      orders: orders.map((o) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        date: o.placedAt,
        itemCount: o.items.length,
        total: fromPaise(toPaise(o.grandTotal)),
        status: o.status,
      })),
    };
  }
}

export const adminCustomersService = new AdminCustomersService();
