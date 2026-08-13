import { Response, NextFunction } from 'express';
import { affiliateService } from '../services/affiliate.service';
import { commissionService } from '../services/commission.service';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { BadRequestError } from '../../../shared/errors';
import { performanceService } from '../services/performance.service';

export class AffiliateAdminController {
  /** GET /admin/affiliates */
  async list(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const page   = parseInt(req.query.page as string) || 1;
      const limit  = parseInt(req.query.limit as string) || 20;
      const data = await affiliateService.adminList({ page, limit: Math.min(limit, 100), status: req.query.status as string | undefined, programId: req.query.programId as string | undefined, search: req.query.search as string | undefined, sort: req.query.sort as string | undefined, direction: req.query.direction as string | undefined });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async detail(req: AuthedRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await affiliateService.adminDetail(req.params.id) }); } catch (err) { next(err); }
  }

  async create(req: AuthedRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: { affiliate: await affiliateService.adminCreate(req.body) } }); } catch (err) { next(err); }
  }

  async update(req: AuthedRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: { affiliate: await affiliateService.adminUpdate(req.params.id, req.body) } }); } catch (err) { next(err); }
  }

  async reactivate(req: AuthedRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: { affiliate: await affiliateService.reactivate(req.params.id, req.user!.userId) } }); } catch (err) { next(err); }
  }

  async programs(_req: AuthedRequest, res: Response, next: NextFunction) { try { res.json({ success: true, data: { items: await affiliateService.adminPrograms() } }); } catch (err) { next(err); } }
  async program(req: AuthedRequest, res: Response, next: NextFunction) { try { res.json({ success: true, data: { program: await affiliateService.adminProgram(req.params.id) } }); } catch (err) { next(err); } }
  async createProgram(req: AuthedRequest, res: Response, next: NextFunction) { try { res.status(201).json({ success: true, data: { program: await affiliateService.createProgram(req.body) } }); } catch (err) { next(err); } }
  async updateProgram(req: AuthedRequest, res: Response, next: NextFunction) { try { res.json({ success: true, data: { program: await affiliateService.updateProgram(req.params.id, req.body) } }); } catch (err) { next(err); } }
  async setDefaultProgram(req: AuthedRequest, res: Response, next: NextFunction) { try { res.json({ success: true, data: { program: await affiliateService.setDefaultProgram(req.params.id) } }); } catch (err) { next(err); } }
  async deleteProgram(req: AuthedRequest, res: Response, next: NextFunction) { try { await affiliateService.deleteProgram(req.params.id); res.status(204).send(); } catch (err) { next(err); } }

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
      const data = await commissionService.adminList(page, Math.min(limit, 100), { status: req.query.status as string | undefined, affiliateId: req.query.affiliateId as string | undefined, createdAtFrom: req.query.createdAtFrom as string | undefined, createdAtTo: req.query.createdAtTo as string | undefined });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async bulkApproveCommissions(req: AuthedRequest, res: Response, next: NextFunction) { try { const ids = Array.isArray(req.body.ids) ? req.body.ids : []; if (!ids.length) throw new BadRequestError('ids are required'); res.json({ success: true, data: await commissionService.bulkApprove(ids, req.user!.userId) }); } catch (err) { next(err); } }
  async voidCommission(req: AuthedRequest, res: Response, next: NextFunction) { try { if (!req.body.reason) throw new BadRequestError('reason is required'); await commissionService.voidCommission(req.params.id, req.body.reason, req.user!.userId); res.json({ success: true }); } catch (err) { next(err); } }
  async payouts(req: AuthedRequest, res: Response, next: NextFunction) { try { res.json({ success: true, data: await commissionService.adminPayouts(parseInt(req.query.page as string)||1, Math.min(parseInt(req.query.limit as string)||20,100), req.query.status as string|undefined) }); } catch (err) { next(err); } }
  async updatePayout(req: AuthedRequest, res: Response, next: NextFunction) { try { res.json({ success: true, data: { payout: await commissionService.updatePayout(req.params.id, req.body) } }); } catch (err) { next(err); } }
  async analytics(req: AuthedRequest, res: Response, next: NextFunction) { try { const result=await performanceService.adminAnalytics({from:String(req.query.from||''),to:String(req.query.to||''),affiliateId:req.query.affiliateId as string|undefined,programId:req.query.programId as string|undefined});if(!result)throw new BadRequestError('Valid from/to dates within 366 days are required');res.json({success:true,data:result}); } catch(err){next(err)} }
  async review(req:AuthedRequest,res:Response,next:NextFunction){try{res.json({success:true,data:{affiliate:await affiliateService.adminReview(req.params.id,req.body,req.user!.userId)}})}catch(err){next(err)}}
  async createLink(req:AuthedRequest,res:Response,next:NextFunction){try{res.status(201).json({success:true,data:{link:await affiliateService.adminCreateLink(req.params.id,req.body)}})}catch(err){next(err)}}
  async updateLink(req:AuthedRequest,res:Response,next:NextFunction){try{res.json({success:true,data:{link:await affiliateService.adminUpdateLink(req.params.id,req.params.linkId,req.body)}})}catch(err){next(err)}}
  async settings(_req:AuthedRequest,res:Response,next:NextFunction){try{res.json({success:true,data:{settings:await affiliateService.affiliateSettings()}})}catch(err){next(err)}}
  async updateSettings(req:AuthedRequest,res:Response,next:NextFunction){try{res.json({success:true,data:{settings:await affiliateService.updateAffiliateSettings(req.body)}})}catch(err){next(err)}}
  async impersonate(req:AuthedRequest,res:Response,next:NextFunction){try{res.json({success:true,data:await affiliateService.createImpersonation(req.params.id,{userId:req.user!.userId,role:req.user!.role})})}catch(err){next(err)}}

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
