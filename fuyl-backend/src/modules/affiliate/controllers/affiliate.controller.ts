import { Request, Response, NextFunction } from 'express';
import { affiliateService } from '../services/affiliate.service';
import { trackingService } from '../services/tracking.service';
import { commissionService } from '../services/commission.service';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { BadRequestError, NotFoundError } from '../../../shared/errors';
import { env } from '../../../config/env';

export class AffiliateController {
  /** POST /affiliate/apply — public */
  async apply(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, channels, message } = req.body;
      if (!name || !email) throw new BadRequestError('name and email are required');
      const userId = (req as AuthedRequest).user?.userId;
      const affiliate = await affiliateService.apply({ name, email, phone, channels: channels ?? [], userId, message });
      res.status(201).json({ success: true, data: affiliate });
    } catch (err) { next(err); }
  }

  /** GET /affiliate/me — requires auth + approved affiliate */
  async me(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const affiliate = await affiliateService.findByUserId(req.user!.userId);
      res.json({ success: true, data: affiliate });
    } catch (err) { next(err); }
  }

  /** GET /affiliate/dashboard — requires auth + approved affiliate */
  async dashboard(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const affiliate = await affiliateService.findByUserId(req.user!.userId);
      const data = await affiliateService.myDashboard(affiliate._id.toString());
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** GET /affiliate/links — requires auth + approved affiliate */
  async links(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const affiliate = await affiliateService.findByUserId(req.user!.userId);
      const data = await affiliateService.myLinks(affiliate._id.toString());
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** POST /affiliate/links — requires auth + approved affiliate */
  async createLink(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const { destination, label } = req.body;
      if (!destination) throw new BadRequestError('destination is required');
      const affiliate = await affiliateService.findByUserId(req.user!.userId);
      const link = await affiliateService.createLink(affiliate._id.toString(), { destination, label });
      res.status(201).json({ success: true, data: link });
    } catch (err) { next(err); }
  }

  /** GET /affiliate/commissions — requires auth + approved affiliate */
  async commissions(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.query;
      const affiliate = await affiliateService.findByUserId(req.user!.userId);
      const data = await commissionService.listForAffiliate(affiliate._id.toString(), status as string | undefined);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** PATCH /affiliate/payment-info — requires auth + approved affiliate */
  async updatePaymentInfo(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const { upi, bankAccount, ifsc, accountName } = req.body;
      const affiliate = await affiliateService.findByUserId(req.user!.userId);
      const updated = await affiliateService.updatePaymentInfo(affiliate._id.toString(), { upi, bankAccount, ifsc, accountName });
      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  }

  /**
   * GET /affiliate/r/:code — tracking redirect endpoint (public).
   * Sets an attribution cookie and redirects the visitor to the destination.
   */
  async track(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;
      const userId = (req as AuthedRequest).user?.userId;
      const ip = req.ip ?? '0.0.0.0';
      const landingPage = req.query.lp as string | undefined ?? '/';

      const result = await trackingService.recordClick({
        code,
        ip,
        userAgent:   req.headers['user-agent'],
        landingPage,
        customerId:  userId,
      });

      // Set a first-party cookie the storefront reads at checkout
      const isProd = env.isProd;
      res.cookie('aff_token', result.token, {
        httpOnly: true,
        secure:   isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days
        path:     '/',
      });

      // Redirect to destination
      const dest = result.destination.startsWith('http')
        ? result.destination
        : `${process.env.CLIENT_URL ?? 'http://localhost:3000'}${result.destination}`;
      res.redirect(302, dest);
    } catch (err) {
      // On any error, still redirect home rather than showing an error page
      const siteUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';
      res.redirect(302, siteUrl);
    }
  }
}

export const affiliateController = new AffiliateController();
