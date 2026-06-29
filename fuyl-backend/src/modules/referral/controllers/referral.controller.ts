import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { referralService, codeService } from '../services';
import { success, created } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { applyCodeSchema, shareSchema } from '../validators';
import { referralApplyRateLimit } from '../middleware/codeRateLimit.middleware';
import { buildDeviceFingerprint, hashValue, normalizeIp } from '../utils/fingerprint';
import { buildShareLink, buildWhatsAppMessage, buildEmailBody, buildEmailSubject, buildSmsMessage } from '../utils/shareLink';
import { queueService } from '../../../shared/services/queue.service';
import { env } from '../../../config/env';
import { NotFoundError } from '../../../shared/errors';

export class ReferralController {
  generateCode = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      // Handle derived from user email (everything before @)
      const email = (req.user as any)?.email ?? 'user@fuyl.com';
      const handle = email.split('@')[0];
      const code = await codeService.getOrCreateForUser(req.user!.userId, handle);
      return success(res, code);
    } catch (err) { next(err); }
  };

  getMyCode = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const codes = await codeService.listMine(req.user!.userId);
      return success(res, codes);
    } catch (err) { next(err); }
  };

  applyCode = [
    referralApplyRateLimit,
    validate(applyCodeSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.socket.remoteAddress ?? '';
        const deviceFingerprint = req.body.deviceFingerprint ?? buildDeviceFingerprint(req.headers as any);
        const ipHash = req.body.ipHash ?? (ip ? hashValue(normalizeIp(ip)) : undefined);

        const referral = await referralService.applyCode({
          code: req.body.code,
          refereeId: req.user!.userId,
          deviceFingerprint,
          ipHash,
          phoneHash: req.body.phoneHash,
          upiHandle: req.body.upiHandle,
        });
        return created(res, referral);
      } catch (err) { next(err); }
    },
  ];

  dashboard = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await referralService.getMyDashboard(req.user!.userId));
    } catch (err) { next(err); }
  };

  listMine = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await referralService.listMyReferrals(req.user!.userId));
    } catch (err) { next(err); }
  };

  listMyRewards = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await referralService.listMyRewards(req.user!.userId));
    } catch (err) { next(err); }
  };

  share = [
    validate(shareSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const codes = await codeService.listMine(req.user!.userId);
        const code = codes[0];
        if (!code) throw new NotFoundError('Referral code — generate one first');
        const link = buildShareLink(code.code);
        const channel = req.body.channel;

        if (channel === 'whatsapp' || channel === 'sms') {
          if (req.body.to) {
            queueService.notificationDispatch({
              channel: channel === 'whatsapp' ? 'whatsapp' : 'sms',
              to: req.body.to,
              template: 'referral_share',
              data: { message: buildSmsMessage(code.code), link },
            });
          }
          return success(res, { link, message: buildWhatsAppMessage(code.code) });
        }
        if (channel === 'email') {
          if (req.body.to) {
            queueService.notificationDispatch({
              channel: 'email',
              to: req.body.to,
              template: 'referral_share',
              data: { subject: buildEmailSubject(), body: buildEmailBody(code.code) },
            });
          }
          return success(res, { link, subject: buildEmailSubject(), body: buildEmailBody(code.code) });
        }
        // link-only
        return success(res, { link });
      } catch (err) { next(err); }
    },
  ];
}

export const referralController = new ReferralController();
