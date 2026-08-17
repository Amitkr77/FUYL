import mongoose, { Types } from 'mongoose';
import { connectTestDatabase, disconnectTestDatabase, resetTestDatabase } from './helpers/database';
import { WalletModel } from '../../src/modules/wallet/models/wallet.model';
import { WalletTransactionModel } from '../../src/modules/wallet/models/transaction.model';
import { walletService } from '../../src/modules/wallet/services/wallet.service';
import { InventoryStockModel, StockMovementModel, StockReservationModel } from '../../src/modules/inventory/models';
import { inventoryService } from '../../src/modules/inventory/services/inventory.service';
import { CashbackPolicyModel } from '../../src/modules/cashback/models/cashbackPolicy.model';
import { CashbackEarningModel } from '../../src/modules/cashback/models/cashbackEarning.model';
import { cashbackService } from '../../src/modules/cashback/services/cashback.service';

jest.setTimeout(60_000);

beforeAll(async () => {
  await connectTestDatabase();
  await Promise.all([
    WalletModel.syncIndexes(),
    WalletTransactionModel.syncIndexes(),
    InventoryStockModel.syncIndexes(),
    StockReservationModel.syncIndexes(),
    CashbackPolicyModel.syncIndexes(),
    CashbackEarningModel.syncIndexes(),
  ]);
});

beforeEach(resetTestDatabase);
afterAll(disconnectTestDatabase);

describe('wallet transaction concurrency', () => {
  it('applies a reference-bound credit exactly once under concurrent delivery', async () => {
    const userId = new Types.ObjectId();
    const referenceId = new Types.ObjectId();

    const results = await Promise.all(Array.from({ length: 8 }, () => walletService.credit({
      userId,
      amount: 25.55,
      source: 'order_cashback',
      description: 'Concurrent cashback test',
      referenceType: 'cashback_earning',
      referenceId,
    })));

    const wallet = await WalletModel.findOne({ userId });
    expect(wallet?.balance).toBe(25.55);
    expect(await WalletTransactionModel.countDocuments({ userId, type: 'credit' })).toBe(1);
    expect(new Set(results.map((result) => result.transaction._id.toString())).size).toBe(1);
  });

  it('releases a hold exactly once when release requests race', async () => {
    const userId = new Types.ObjectId();
    const orderId = new Types.ObjectId();
    await walletService.credit({ userId, amount: 100, source: 'topup', description: 'Test funding' });
    const held = await walletService.hold(userId, 40, 'order', orderId.toString(), 'Order hold');

    const releases = await Promise.all([
      walletService.releaseHold(held.transaction._id, 'Cancelled'),
      walletService.releaseHold(held.transaction._id, 'Cancelled'),
    ]);

    const wallet = await WalletModel.findOne({ userId });
    expect(wallet?.balance).toBe(100);
    expect(wallet?.heldBalance).toBe(0);
    expect(await WalletTransactionModel.countDocuments({ userId, type: 'release' })).toBe(1);
    expect(releases[0].transaction._id.toString()).toBe(releases[1].transaction._id.toString());
  });
});

describe('inventory reservation concurrency', () => {
  it('reserves and releases one cart line exactly once under concurrent requests', async () => {
    const productId = new Types.ObjectId();
    const sellerId = new Types.ObjectId();
    const cartId = new Types.ObjectId();
    await InventoryStockModel.create({ productId, sellerId, warehouseId: 'default', onHand: 5, available: 5, reserved: 0 });
    const request = {
      items: [{ productId: productId.toString(), sellerId: sellerId.toString(), quantity: 3 }],
      cartId: cartId.toString(),
      ttlMinutes: 15,
    };

    const attempts = await Promise.all([
      inventoryService.reserveStock(request),
      inventoryService.reserveStock(request),
    ]);
    expect(attempts.every((attempt) => attempt.failed.length === 0)).toBe(true);

    let stock = await InventoryStockModel.findOne({ productId });
    expect(stock?.reserved).toBe(3);
    expect(stock?.available).toBe(2);
    expect(await StockReservationModel.countDocuments({ cartId })).toBe(1);

    await Promise.all([
      inventoryService.releaseReservations({ cartId: cartId.toString() }),
      inventoryService.releaseReservations({ cartId: cartId.toString() }),
    ]);
    stock = await InventoryStockModel.findOne({ productId });
    expect(stock?.reserved).toBe(0);
    expect(stock?.available).toBe(5);
    expect(await StockMovementModel.countDocuments({ referenceId: cartId, type: 'release' })).toBe(1);
  });
});

describe('cashback budget concurrency', () => {
  it('does not exceed a finite policy budget when earnings race', async () => {
    const policy = await CashbackPolicyModel.create({
      name: 'Limited budget', mode: 'standalone', type: 'flat', value: 7,
      scope: 'all', creditTiming: 'on_order', expiryDays: 90,
      isActive: true, maxUsesPerUser: 0, totalBudget: 10, usedBudget: 0,
    });
    const earnings = await CashbackEarningModel.create([
      { orderId: new Types.ObjectId(), userId: new Types.ObjectId(), policyId: policy._id, cashbackBase: 100, cashbackAmount: 7, status: 'pending', creditTiming: 'on_order', scheduledCreditAt: new Date(), expiresAt: new Date(Date.now() + 86400000) },
      { orderId: new Types.ObjectId(), userId: new Types.ObjectId(), policyId: policy._id, cashbackBase: 100, cashbackAmount: 7, status: 'pending', creditTiming: 'on_order', scheduledCreditAt: new Date(), expiresAt: new Date(Date.now() + 86400000) },
    ]);

    await Promise.all(earnings.map((earning) => cashbackService.creditEarning(earning._id.toString())));

    const updatedPolicy = await CashbackPolicyModel.findById(policy._id);
    expect(updatedPolicy?.usedBudget).toBe(7);
    expect(await CashbackEarningModel.countDocuments({ status: 'credited' })).toBe(1);
    expect(await CashbackEarningModel.countDocuments({ status: 'pending' })).toBe(1);
    expect((await WalletModel.find({})).reduce((sum, wallet) => sum + wallet.balance, 0)).toBe(7);
  });
});
