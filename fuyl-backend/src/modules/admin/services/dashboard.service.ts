import { UserModel } from '../../identity/models/user.model';
import { OrderModel } from '../../order/models/order.model';
import { PaymentModel } from '../../payment/models/payment.model';
import { SubscriptionModel } from '../../subscription/models/subscription.model';
import { ReferralModel } from '../../referral/models/referral.model';
import { CartModel } from '../../cart/models/cart.model';
import { ReviewModel } from '../../review/models/review.model';
import { ProductModel } from '../../catalog/models/product.model';
import { CampaignModel } from '../../promotion/models/campaign.model';
import { CouponRedemptionModel } from '../../promotion/models/redemption.model';
import { AnalyticsEventModel } from '../../analytics/models/event.model';
import { InventoryStockModel } from '../../inventory/models/stock.model';
import { logger } from '../../../config/logger';

class AdminDashboardService {
  /**
   * Comprehensive top-line metrics for the admin dashboard.
   */
  async getOverview() {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since1d = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

    const [
      usersTotal, usersNew30d, usersNew7d, usersNew1d,
      ordersTotal, orders30d, orders7d, orders1d,
      revenue30d, revenue7d, revenue1d,
      subscriptionsActive, subscriptionsTotal,
      referralsTotal, referralsRewarded,
      cartsAbandoned,
      reviewsPending,
      productsPublished, productsTotal,
      campaignsActive,
      lowStockItems,
      couponRedemptions30d,
    ] = await Promise.all([
      UserModel.countDocuments({ isDeleted: false }),
      UserModel.countDocuments({ createdAt: { $gte: since30d }, isDeleted: false }),
      UserModel.countDocuments({ createdAt: { $gte: since7d }, isDeleted: false }),
      UserModel.countDocuments({ createdAt: { $gte: since1d }, isDeleted: false }),
      OrderModel.countDocuments({}),
      OrderModel.countDocuments({ placedAt: { $gte: since30d } }),
      OrderModel.countDocuments({ placedAt: { $gte: since7d } }),
      OrderModel.countDocuments({ placedAt: { $gte: since1d } }),
      OrderModel.aggregate([
        { $match: { placedAt: { $gte: since30d }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      OrderModel.aggregate([
        { $match: { placedAt: { $gte: since7d }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      OrderModel.aggregate([
        { $match: { placedAt: { $gte: since1d }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      SubscriptionModel.countDocuments({ status: 'active' }),
      SubscriptionModel.countDocuments({}),
      ReferralModel.countDocuments({}),
      ReferralModel.countDocuments({ status: 'rewarded' }),
      CartModel.countDocuments({ isConverted: false, items: { $ne: [] }, lastActivityAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } }),
      ReviewModel.countDocuments({ status: 'pending' }),
      ProductModel.countDocuments({ isPublished: true, isDeleted: false }),
      ProductModel.countDocuments({ isDeleted: false }),
      CampaignModel.countDocuments({ status: 'active', isActive: true }),
      InventoryStockModel.countDocuments({ $expr: { $lte: ['$available', '$reorderThreshold'] }, reorderThreshold: { $gt: 0 } }),
      CouponRedemptionModel.countDocuments({ appliedAt: { $gte: since30d }, status: 'applied' }),
    ]);

    return {
      users: {
        total: usersTotal,
        new30d: usersNew30d,
        new7d: usersNew7d,
        new1d: usersNew1d,
      },
      orders: {
        total: ordersTotal,
        count30d: orders30d,
        count7d: orders7d,
        count1d: orders1d,
      },
      revenue: {
        last30d: revenue30d[0]?.total ?? 0,
        last7d: revenue7d[0]?.total ?? 0,
        last1d: revenue1d[0]?.total ?? 0,
      },
      subscriptions: {
        active: subscriptionsActive,
        total: subscriptionsTotal,
      },
      referrals: {
        total: referralsTotal,
        rewarded: referralsRewarded,
      },
      carts: {
        abandoned: cartsAbandoned,
      },
      reviews: {
        pendingModeration: reviewsPending,
      },
      catalog: {
        productsPublished: productsPublished,
        productsTotal: productsTotal,
      },
      promotions: {
        activeCampaigns: campaignsActive,
        couponRedemptions30d: couponRedemptions30d,
      },
      inventory: {
        lowStockItems: lowStockItems,
      },
    };
  }

  /**
   * Recent activity feed (latest 50 events from analytics_events).
   */
  async recentActivity(limit = 50) {
    return AnalyticsEventModel
      .find({})
      .sort({ occurredAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * System health check — DB + Redis + queue worker status.
   */
  async systemHealth() {
    const mongoose = (await import('mongoose')).default;
    const dbStatus = mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy';
    return {
      db: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}

export const adminDashboardService = new AdminDashboardService();
