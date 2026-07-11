import { UserModel } from '../../identity/models/user.model';
import { OrderModel } from '../../order/models/order.model';
import { RoleEnum, OrderStatus } from '../../../shared/enums';
import { NotFoundError } from '../../../shared/errors';

class AdminCustomersService {
  /**
   * Paginated customer list with order-count/lifetime-spend aggregated per
   * customer. No admin customer-lookup endpoint existed before this — the
   * admin dashboard's Customers pages had nothing to call.
   */
  async list(page = 1, limit = 20, search?: string) {
    const filter: Record<string, unknown> = { role: RoleEnum.CUSTOMER, isDeleted: false };
    if (search) {
      const re = { $regex: search, $options: 'i' };
      filter.$or = [{ emailLower: re }, { firstName: re }, { lastName: re }];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      UserModel.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const orderStats = await OrderModel.aggregate([
      { $match: { customerId: { $in: userIds }, status: { $ne: OrderStatus.CANCELLED } } },
      { $group: { _id: '$customerId', orders: { $sum: 1 }, totalSpent: { $sum: '$grandTotal' } } },
    ]);
    const statsById = new Map(orderStats.map((s) => [s._id.toString(), s]));

    const items = users.map((u) => {
      const stats = statsById.get(u._id.toString());
      return {
        id: u._id,
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
        email: u.email,
        phone: u.phone,
        joined: u.createdAt,
        orders: stats?.orders ?? 0,
        totalSpent: stats?.totalSpent ?? 0,
      };
    });

    return { items, total, page, limit };
  }

  async getById(id: string) {
    const user = await UserModel.findOne({ _id: id, role: RoleEnum.CUSTOMER, isDeleted: false });
    if (!user) throw new NotFoundError('Customer');

    const orders = await OrderModel.find({ customerId: id }).sort({ placedAt: -1 });
    const totalSpent = orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + o.grandTotal, 0);

    return {
      id: user._id,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
      email: user.email,
      phone: user.phone,
      joined: user.createdAt,
      ordersCount: orders.length,
      totalSpent,
      orders: orders.map((o) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        date: o.placedAt,
        itemCount: o.items.length,
        total: o.grandTotal,
        status: o.status,
      })),
    };
  }
}

export const adminCustomersService = new AdminCustomersService();
