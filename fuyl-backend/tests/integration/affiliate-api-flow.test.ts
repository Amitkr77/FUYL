import express from 'express';
// Supertest is already a development dependency. Use its CommonJS export so
// the test suite does not require a separate runtime-free @types package.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

jest.mock('../../src/shared/services/audit.service', () => ({
  auditService: { write: jest.fn() },
}));

// Import the router directly. The module barrel also exports production
// schedulers, which eagerly initialise Redis and are not part of this API test.
import { affiliateRouter } from '../../src/modules/affiliate/routes/affiliate.routes';
import { errorMiddleware } from '../../src/shared/middleware/error.middleware';
import { signAccessToken } from '../../src/modules/identity/utils/crypto';
import { UserModel } from '../../src/modules/identity/models/user.model';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase,
} from './helpers/database';

const app = express();
app.use(express.json());
app.use('/api/v1', affiliateRouter);
app.use(errorMiddleware);

describe('affiliate admin-to-portal API flow', () => {
  let adminToken: string;
  let customerToken: string;

  beforeAll(async () => {
    await connectTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    const [admin, customer] = await UserModel.create([
      {
        email: 'admin@fuyl.test', emailLower: 'admin@fuyl.test', passwordHash: 'test',
        role: 'admin', isEmailVerified: true, isActive: true, isDeleted: false,
      },
      {
        email: 'amit@fuyl.test', emailLower: 'amit@fuyl.test', passwordHash: 'test',
        role: 'customer', firstName: 'Amit', isEmailVerified: true, isActive: true, isDeleted: false,
      },
    ]);
    adminToken = signAccessToken({ userId: admin._id.toString(), role: 'admin', email: admin.email });
    customerToken = signAccessToken({ userId: customer._id.toString(), role: 'customer', email: customer.email });
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('protects admin affiliate routes from anonymous and customer accounts', async () => {
    await request(app).get('/api/v1/admin/affiliate-programs').expect(401);
    await request(app)
      .get('/api/v1/admin/affiliate-programs')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('creates and assigns an advanced program that is accurately reflected in the affiliate portal', async () => {
    const programResponse = await request(app)
      .post('/api/v1/admin/affiliate-programs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Creator Plus',
        description: 'Advanced creator commission',
        commissionType: 'flat_per_item',
        tierBasis: 'order_value',
        defaultRate: 25,
        tiers: [
          { minOrderAmount: 0, rate: 25 },
          { minOrderAmount: 2000, rate: 40 },
        ],
        excludeShipping: true,
        excludeProductTax: true,
        advancedCommissions: {
          newCustomer: { enabled: true, rate: 50 },
          lifetime: { enabled: false, rate: 0 },
          specialCoupon: { enabled: false, rate: 0 },
        },
        attributionWindowDays: 45,
        minPayoutAmount: 1000,
        autoApproveAfterDays: 10,
      })
      .expect(201);

    const program = programResponse.body.data.program;
    expect(program.isDefault).toBe(true);

    const affiliateResponse = await request(app)
      .post('/api/v1/admin/affiliates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Amit Creator',
        email: 'amit@fuyl.test',
        programId: program._id,
        status: 'approved',
      })
      .expect(201);

    const affiliate = affiliateResponse.body.data.affiliate;
    expect(affiliate.programId).toBe(program._id);

    const portalProgramResponse = await request(app)
      .get('/api/v1/affiliate/program')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(portalProgramResponse.body.data).toMatchObject({
      name: 'Creator Plus',
      commissionType: 'flat_per_item',
      tierBasis: 'order_value',
      defaultRate: 25,
      attributionWindowDays: 45,
      minPayoutAmount: 1000,
      autoApproveAfterDays: 10,
      excludeShipping: true,
      excludeProductTax: true,
    });
    expect(portalProgramResponse.body.data.tiers).toHaveLength(2);

    const linkResponse = await request(app)
      .post('/api/v1/affiliate/links')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ destination: '/products/complete', label: 'Complete product', code: 'AMIT-COMPLETE' })
      .expect(201);

    expect(linkResponse.body.data).toMatchObject({
      code: 'AMIT-COMPLETE',
      destination: '/products/complete',
    });

    await request(app)
      .post('/api/v1/affiliate/links')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ destination: 'https://malicious.example', code: 'BAD-LINK' })
      .expect(400);
  });

  it('issues a one-time, affiliate-scoped admin impersonation session', async () => {
    const programResponse = await request(app)
      .post('/api/v1/admin/affiliate-programs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Standard', commissionType: 'percent_of_sale', defaultRate: 10 })
      .expect(201);
    const affiliateResponse = await request(app)
      .post('/api/v1/admin/affiliates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Amit Creator', email: 'amit@fuyl.test', programId: programResponse.body.data.program._id, status: 'approved' })
      .expect(201);
    const affiliateId = affiliateResponse.body.data.affiliate._id;

    const impersonationResponse = await request(app)
      .post(`/api/v1/admin/affiliates/${affiliateId}/impersonate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const code = impersonationResponse.body.data.code;

    const exchangeResponse = await request(app)
      .post('/api/v1/affiliate/impersonation/exchange')
      .send({ code })
      .expect(200);
    const impersonationToken = exchangeResponse.body.data.accessToken;

    await request(app)
      .get('/api/v1/affiliate/me')
      .set('Authorization', `Bearer ${impersonationToken}`)
      .expect(200);
    await request(app)
      .get('/api/v1/admin/affiliates')
      .set('Authorization', `Bearer ${impersonationToken}`)
      .expect(401);
    await request(app)
      .post('/api/v1/affiliate/impersonation/exchange')
      .send({ code })
      .expect(400);
  });
});
