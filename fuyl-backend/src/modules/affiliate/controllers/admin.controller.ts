import { Response, NextFunction } from 'express';
import { affiliateService } from '../services/affiliate.service';
import { commissionService } from '../services/commission.service';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { BadRequestError } from '../../../shared/errors';

export class AffiliateAdminController {
  /** GET /admin/affiliates */
  async list(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const page   = parseInt(req.query.page as string) || 1;
      const limit  = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const data   = await affiliateService.adminList(page, limit, status);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** GET /admin/affiliates/stats */
  async stats(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const [affiliateStats, commissionStats] = await Promise.all([
        affiliateService.adminStats(),
        commissionService.adminStats(),
      ]);
      res.json({ success: true, data: { affiliates: affiliateStats, commissions: commissionStats } });
    } catch (err) { next(err); }
  }

  /** POST /admin/affiliates/:id/approve */
  async approve(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const data = await affiliateService.approve(req.params.id, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** POST /admin/affiliates/:id/reject */
  async reject(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      if (!reason) throw new BadRequestError('reason is required');
      await affiliateService.reject(req.params.id, reason, req.user!.userId);
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  /** POST /admin/affiliates/:id/suspend */
  async suspend(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      if (!reason) throw new BadRequestError('reason is required');
      await affiliateService.suspend(req.params.id, reason, req.user!.userId);
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  /** GET /admin/commissions */
  async listCommissions(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const page   = parseInt(req.query.page as string) || 1;
      const limit  = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const data   = await commissionService.adminList(page, limit, status);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** POST /admin/commissions/:id/approve */
  async approveCommission(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      await commissionService.approve(req.params.id, req.user!.userId);
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  /** POST /admin/affiliates/:id/payout */
  async payout(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const data = await commissionService.payout(req.params.id, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
}

export const affiliateAdminController = new AffiliateAdminController();
