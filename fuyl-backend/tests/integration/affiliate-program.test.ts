import { Types } from 'mongoose';
import { connectTestDatabase, disconnectTestDatabase, resetTestDatabase } from './helpers/database';
import { AffiliateProgramModel, IAffiliateProgram } from '../../src/modules/affiliate/models/program.model';
import { AffiliateModel } from '../../src/modules/affiliate/models/affiliate.model';
import { CommissionModel } from '../../src/modules/affiliate/models/commission.model';
import { CommissionEventModel } from '../../src/modules/affiliate/models/commission-event.model';
import { commissionService } from '../../src/modules/affiliate/services/commission.service';
import { trackingService } from '../../src/modules/affiliate/services/tracking.service';
import { affiliateService } from '../../src/modules/affiliate/services/affiliate.service';
import { OrderModel } from '../../src/modules/order/models/order.model';
import { AffiliateSettingsModel } from '../../src/modules/affiliate/models/settings.model';
import { CommissionStatus } from '../../src/shared/enums';

jest.mock('../../src/shared/services/audit.service', () => ({ auditService: { write: jest.fn() } }));

jest.setTimeout(60_000);

beforeAll(async () => {
  await connectTestDatabase();
  await Promise.all([
    AffiliateProgramModel.syncIndexes(), AffiliateModel.syncIndexes(),
    CommissionModel.syncIndexes(), CommissionEventModel.syncIndexes(),
  ]);
});
beforeEach(resetTestDatabase);
afterAll(async () => {
  await disconnectTestDatabase();
});

const productA = new Types.ObjectId();
const productB = new Types.ObjectId();
const productC = new Types.ObjectId();

async function setupProgram(overrides: Partial<IAffiliateProgram> = {}) {
  const program = await AffiliateProgramModel.create({
    name: `Program ${new Types.ObjectId()}`, isActive: true, isDefault: false,
    commissionType: 'percent_of_sale', tierBasis: 'order_value', defaultRate: 10,
    commissionBase: 'subtotal', attributionWindowDays: 30,
    tiers: [{ minOrderAmount: 0, rate: 10 }], specialProductCommissions: [],
    excludedProductIds: [], excludeProductTax: true, excludeShipping: true,
    advancedCommissions: {
      newCustomer: { enabled: false, rate: 0 }, lifetime: { enabled: false, rate: 0 },
      specialCoupon: { enabled: false, rate: 0 },
    }, minPayoutAmount: 500, autoApproveAfterDays: 7, ...overrides,
  });
  const affiliate = await AffiliateModel.create({
    programId: program._id, name: 'Affiliate Test', email: `${new Types.ObjectId()}@test.local`,
    channels: [], couponCodes: [], status: 'approved',
  });
  return { program, affiliate };
}

async function createCommission(overrides: Partial<Parameters<typeof commissionService.createForOrder>[0]> = {}) {
  const { affiliate } = await setupProgram((overrides as any).programOverrides ?? {});
  const orderId = new Types.ObjectId();
  await commissionService.createForOrder({
    orderId: orderId.toString(), affiliateId: affiliate._id.toString(),
    attributionId: new Types.ObjectId().toString(), subtotal: 1000, grandTotal: 1180,
    itemQuantity: 1, items: [{ productId: productA.toString(), quantity: 1, totalPrice: 1000, discount: 0, tax: 180 }],
    shippingTotal: 0, discountTotal: 0, customerId: new Types.ObjectId().toString(),
    orderNumber: 'FUL-TEST-1', ...overrides,
  });
  return { orderId, affiliate, commission: await CommissionModel.findOne({ orderId }) };
}

describe('affiliate commission program calculation', () => {
  it('uses the highest qualifying order-value percentage level', async () => {
    const result = await createCommission({
      subtotal: 3000, grandTotal: 3000, itemQuantity: 1,
      items: [{ productId: productA.toString(), quantity: 1, totalPrice: 3000, discount: 0, tax: 0 }],
      programOverrides: { tiers: [{ minOrderAmount: 0, rate: 10 }, { minOrderAmount: 2000, rate: 15 }] },
    } as any);
    expect(result.commission?.amount).toBe(450);
    expect(result.commission?.snapshotRate).toBe(15);
  });

  it('calculates a flat commission per item quantity', async () => {
    const result = await createCommission({
      itemQuantity: 3,
      items: [{ productId: productA.toString(), quantity: 3, totalPrice: 3000, discount: 0, tax: 0 }],
      programOverrides: { commissionType: 'flat_per_item', defaultRate: 50, tiers: [{ minOrderAmount: 0, rate: 50 }] },
    } as any);
    expect(result.commission?.amount).toBe(150);
    expect(result.commission?.snapshotItemQuantity).toBe(3);
  });

  it('calculates one flat commission per order', async () => {
    const result = await createCommission({
      itemQuantity: 5,
      items: [{ productId: productA.toString(), quantity: 5, totalPrice: 5000, discount: 0, tax: 0 }],
      programOverrides: { commissionType: 'flat_per_order', defaultRate: 125, tiers: [{ minOrderAmount: 0, rate: 125 }] },
    } as any);
    expect(result.commission?.amount).toBe(125);
  });

  it('applies a product override and removes excluded products', async () => {
    const result = await createCommission({
      subtotal: 1800, grandTotal: 1800, itemQuantity: 3,
      items: [
        { productId: productA.toString(), quantity: 1, totalPrice: 1000, discount: 0, tax: 0 },
        { productId: productB.toString(), quantity: 1, totalPrice: 500, discount: 0, tax: 0 },
        { productId: productC.toString(), quantity: 1, totalPrice: 300, discount: 0, tax: 0 },
      ],
      programOverrides: {
        specialProductCommissions: [{ productId: productA, rate: 20 }], excludedProductIds: [productC],
      },
    } as any);
    expect(result.commission?.amount).toBe(250);
    expect(result.commission?.baseAmount).toBe(1500);
  });

  it('lets a matching special coupon override product and default rules', async () => {
    const result = await createCommission({
      couponCode: 'AMIT10', subtotal: 1500, grandTotal: 1500, itemQuantity: 2,
      items: [
        { productId: productA.toString(), quantity: 1, totalPrice: 1000, discount: 0, tax: 0 },
        { productId: productB.toString(), quantity: 1, totalPrice: 500, discount: 0, tax: 0 },
      ],
      programOverrides: {
        specialProductCommissions: [{ productId: productA, rate: 20 }],
        advancedCommissions: {
          newCustomer: { enabled: false, rate: 0 }, lifetime: { enabled: false, rate: 0 },
          specialCoupon: { enabled: true, rate: 25, couponCode: 'AMIT10' },
        },
      },
    } as any);
    expect(result.commission?.amount).toBe(375);
    expect(result.commission?.metadata?.appliedRule).toBe('special_coupon');
  });

  it('applies the new-customer override', async () => {
    const result = await createCommission({
      programOverrides: {
        advancedCommissions: {
          newCustomer: { enabled: true, rate: 20 }, lifetime: { enabled: false, rate: 0 },
          specialCoupon: { enabled: false, rate: 0 },
        },
      },
    } as any);
    expect(result.commission?.amount).toBe(200);
    expect(result.commission?.metadata?.appliedRule).toBe('new_customer');
  });

  it('is idempotent for duplicate order completion delivery', async () => {
    const { affiliate } = await setupProgram();
    const input = {
      orderId: new Types.ObjectId().toString(), affiliateId: affiliate._id.toString(), attributionId: new Types.ObjectId().toString(),
      subtotal: 1000, grandTotal: 1000, itemQuantity: 1,
      items: [{ productId: productA.toString(), quantity: 1, totalPrice: 1000, discount: 0, tax: 0 }],
      shippingTotal: 0, discountTotal: 0, customerId: new Types.ObjectId().toString(), orderNumber: 'FUL-IDEMPOTENT',
    };
    await Promise.all([commissionService.createForOrder(input), commissionService.createForOrder(input)]);
    expect(await CommissionModel.countDocuments({ orderId: input.orderId })).toBe(1);
    expect((await AffiliateModel.findById(affiliate._id))?.stats.totalOrders).toBe(1);
  });

  it('prorates an unpaid commission after a partial refund', async () => {
    const result = await createCommission();
    await commissionService.adjustForRefund(result.orderId.toString(), 400, 1000);
    const adjusted = await CommissionModel.findById(result.commission?._id);
    expect(adjusted?.baseAmount).toBe(600);
    expect(adjusted?.amount).toBe(60);
  });

  it('uses cumulative referred-order count to qualify levels', async () => {
    const { affiliate } = await setupProgram({
      tierBasis: 'order_count', tiers: [{ minOrderAmount: 1, rate: 10 }, { minOrderAmount: 5, rate: 15 }],
    });
    await AffiliateModel.updateOne({ _id:affiliate._id }, { $set:{ 'stats.totalOrders':4 } });
    const orderId=new Types.ObjectId();
    await commissionService.createForOrder({
      orderId:orderId.toString(),affiliateId:affiliate._id.toString(),attributionId:new Types.ObjectId().toString(),
      subtotal:1000,grandTotal:1000,itemQuantity:1,items:[{productId:productA.toString(),quantity:1,totalPrice:1000,discount:0,tax:0}],
      shippingTotal:0,discountTotal:0,customerId:new Types.ObjectId().toString(),orderNumber:'FUL-COUNT-5',
    });
    expect((await CommissionModel.findOne({orderId}))?.amount).toBe(150);
  });

  it('does not create commission when every product is excluded', async () => {
    const result=await createCommission({ programOverrides:{ excludedProductIds:[productA] } } as any);
    expect(result.commission).toBeNull();
    expect((await AffiliateModel.findById(result.affiliate._id))?.stats.totalOrders).toBe(0);
  });

  it('automatically excludes shipping and product tax', async () => {
    const result=await createCommission({grandTotal:1280,shippingTotal:100,items:[{productId:productA.toString(),quantity:1,totalPrice:1000,discount:0,tax:180}]});
    expect(result.commission?.baseAmount).toBe(1000);
    expect(result.commission?.amount).toBe(100);
  });

  it('uses lifetime rate only for lifetime attribution', async () => {
    const rules={newCustomer:{enabled:false,rate:0},lifetime:{enabled:true,rate:18},specialCoupon:{enabled:false,rate:0}};
    const lifetime=await createCommission({attributionMethod:'lifetime',programOverrides:{advancedCommissions:rules}} as any);
    expect(lifetime.commission?.amount).toBe(180);
    expect(lifetime.commission?.metadata?.appliedRule).toBe('lifetime');
    await resetTestDatabase();
    const normal=await createCommission({attributionMethod:'link',programOverrides:{advancedCommissions:rules}} as any);
    expect(normal.commission?.amount).toBe(100);
  });

  it('cancels an unpaid commission on order cancellation or full refund', async () => {
    const cancelled=await createCommission();
    await commissionService.cancel(cancelled.orderId.toString(),'Order cancelled');
    expect((await CommissionModel.findById(cancelled.commission?._id))?.status).toBe(CommissionStatus.CANCELLED);
    expect((await AffiliateModel.findById(cancelled.affiliate._id))?.stats.totalCommissionEarned).toBe(0);
    await resetTestDatabase();
    const refunded=await createCommission();
    await commissionService.adjustForRefund(refunded.orderId.toString(),1000,1000);
    expect((await CommissionModel.findById(refunded.commission?._id))?.status).toBe(CommissionStatus.CANCELLED);
  });

  it('resolves a repeat buyer through lifetime attribution', async () => {
    const {program,affiliate}=await setupProgram({advancedCommissions:{newCustomer:{enabled:false,rate:0},lifetime:{enabled:true,rate:18},specialCoupon:{enabled:false,rate:0}}});
    const customerId=new Types.ObjectId();
    const address={fullName:'Buyer',phone:'9999999999',line1:'Test',city:'Kota',state:'Rajasthan',pincode:'324001',country:'India',type:'home'};
    await OrderModel.create({orderNumber:'FUL-LIFETIME-1',customerId,affiliateId:affiliate._id,sellerIds:[],items:[{productId:productA,name:'A',sku:'A',quantity:1,unitPrice:1000,totalPrice:1000,discount:0,tax:0,currency:'INR'}],status:'confirmed',currency:'INR',subtotal:1000,discountTotal:0,taxTotal:0,shippingTotal:0,grandTotal:1000,paymentStatus:'success',paymentMethod:'cashfree',shippingAddress:address,billingAddress:address,isSubscriptionOrder:false,timeline:[],staffComments:[],placedAt:new Date()});
    const resolved=await trackingService.resolveForCheckout({userId:customerId.toString()});
    expect(resolved?.affiliateId).toBe(affiliate._id.toString());
    expect(resolved?.method).toBe('lifetime');
    expect(program.advancedCommissions.lifetime.enabled).toBe(true);
  });

  it('keeps the program default and signup default synchronized', async () => {
    const program=await affiliateService.createProgram({name:'First default',defaultRate:10,commissionType:'percent_of_sale',tierBasis:'order_value',tiers:[{minOrderAmount:0,rate:10}]} as any);
    expect(program?.isDefault).toBe(true);
    const settings=await AffiliateSettingsModel.findOne({key:'default'});
    expect(settings?.defaultProgramId?.toString()).toBe(program?._id.toString());
    await expect(affiliateService.updateProgram(program!._id.toString(),{isActive:false})).rejects.toThrow('Choose another default program');
  });
});
