import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { walletService } from '../services';
import { success, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { adjustBalanceSchema, freezeWalletSchema } from '../validators';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { WalletTransactionRepository } from '../repositories/wallet.repository';

const txRepo = new WalletTransactionRepository();

export class WalletController {
  getMyBalance = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await walletService.getBalance(req.user!.userId));
    } catch (err) { next(err); }
  };

  getMyTransactions = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      return success(res, await walletService.getTransactions(req.user!.userId, limit));
    } catch (err) { next(err); }
  };

  // ─── Admin ──────────────────────────────────────────────────────
  getUserBalance = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await walletService.getBalance(req.params.userId));
      } catch (err) { next(err); }
    },
  ];

  listUserTransactions = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await txRepo.paginate({ userId: req.params.userId }, page, limit);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];

  adjustBalance = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(adjustBalanceSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const result = await walletService.adminAdjust(
          req.body.userId,
          req.body.amount,
          req.body.type,
          req.body.description,
          req.body.source,
        );
        return success(res, result);
      } catch (err) { next(err); }
    },
  ];

  freeze = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(freezeWalletSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await walletService.freeze(req.params.userId, req.body.reason));
      } catch (err) { next(err); }
    },
  ];

  unfreeze = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await walletService.unfreeze(req.params.userId));
      } catch (err) { next(err); }
    },
  ];
}

export const walletController = new WalletController();
