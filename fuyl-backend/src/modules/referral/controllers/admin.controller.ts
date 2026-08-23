import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { programService } from '../services/program.service';
import { success, created, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { createProgramSchema, updateProgramSchema, reviewFraudSchema } from '../validators';
import { requirePermission, Permissions } from '../../../shared/middleware/rbac.middleware';
import { ReferralRepository } from '../repositories/referral.repository';
import { FraudFlagRepository } from '../repositories/fraudFlag.repository';
import { ReferralStatus } from '../../../shared/enums';

const referralRepo = new ReferralRepository();
const fraudFlagRepo = new FraudFlagRepository();

export class AdminReferralController {
  // Programs
  createProgram = [
    requirePermission(Permissions.REFERRALS_MANAGE),
    validate(createProgramSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return created(res, await programService.create(req.body));
      } catch (err) { next(err); }
    },
  ];

  listPrograms = [
    requirePermission(Permissions.REFERRALS_MANAGE),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const r = await programService.list(page, limit);
        return paginate(res, r.items, r.total, r.page, r.limit);
      } catch (err) { next(err); }
    },
  ];

  getProgram = [
    requirePermission(Permissions.REFERRALS_MANAGE),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await programService.get(req.params.id));
      } catch (err) { next(err); }
    },
  ];

  updateProgram = [
    requirePermission(Permissions.REFERRALS_MANAGE),
    validate(updateProgramSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await programService.update(req.params.id, req.body));
      } catch (err) { next(err); }
    },
  ];

  deactivateProgram = [
    requirePermission(Permissions.REFERRALS_MANAGE),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        await programService.deactivate(req.params.id);
        return success(res, { deactivated: true });
      } catch (err) { next(err); }
    },
  ];

  // Stats
  stats = [
    requirePermission(Permissions.REFERRALS_MANAGE),
    async (_req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await referralRepo.statsForAdmin());
      } catch (err) { next(err); }
    },
  ];

  listAll = [
    requirePermission(Permissions.REFERRALS_MANAGE),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const filter: Record<string, unknown> = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.referrerId) filter.referrerId = req.query.referrerId;
        const r = await referralRepo.paginate(filter, page, limit);
        return paginate(res, r.items, r.total, r.page, r.limit);
      } catch (err) { next(err); }
    },
  ];

  // Moderation
  listFraudFlags = [
    requirePermission(Permissions.REFERRALS_MANAGE),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const r = await fraudFlagRepo.paginate(page, limit);
        return paginate(res, r.items, r.total, r.page, r.limit);
      } catch (err) { next(err); }
    },
  ];

  listPendingFraud = [
    requirePermission(Permissions.REFERRALS_MANAGE),
    async (_req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await fraudFlagRepo.findPending(100));
      } catch (err) { next(err); }
    },
  ];

  reviewFraudFlag = [
    requirePermission(Permissions.REFERRALS_MANAGE),
    validate(reviewFraudSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const updated = await fraudFlagRepo.review(
          req.params.id,
          req.body.decision,
          req.user!.userId,
          req.body.note
        );
        // If rejected, also reverse the referral's status
        if (updated && req.body.decision === 'rejected') {
          await referralRepo.markStatus(updated.referralId.toString(), ReferralStatus.REJECTED, {
            rejectedAt: new Date(),
            rejectedReason: req.body.note ?? 'Manually rejected by admin',
          });
        }
        return success(res, updated);
      } catch (err) { next(err); }
    },
  ];
}

export const adminReferralController = new AdminReferralController();
