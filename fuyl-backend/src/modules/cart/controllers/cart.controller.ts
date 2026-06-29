import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { cartService } from '../services';
import { success } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { addToCartSchema, updateCartItemSchema, applyCouponSchema, applyReferralSchema } from '../validators';

function ownerFromReq(req: AuthedRequest): { userId?: string; guestId?: string } {
  if (req.user?.userId) return { userId: req.user.userId };
  const guestId = req.headers['x-guest-id'] as string | undefined;
  if (guestId) return { guestId };
  return {};
}

export class CartController {
  getMine = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const cart = await cartService.getCart(ownerFromReq(req));
      return success(res, cart);
    } catch (err) { next(err); }
  };

  addItem = [
    validate(addToCartSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const cart = await cartService.addItem(ownerFromReq(req), req.body);
        return success(res, cart);
      } catch (err) { next(err); }
    },
  ];

  updateItem = [
    validate(updateCartItemSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const cart = await cartService.updateItemQuantity(
          ownerFromReq(req),
          req.params.productId,
          req.params.variantId,
          req.body.quantity
        );
        return success(res, cart);
      } catch (err) { next(err); }
    },
  ];

  removeItem = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const cart = await cartService.removeItem(
        ownerFromReq(req),
        req.params.productId,
        req.params.variantId
      );
      return success(res, cart);
    } catch (err) { next(err); }
  };

  clear = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await cartService.clear(ownerFromReq(req));
      return success(res, { cleared: true });
    } catch (err) { next(err); }
  };

  applyCoupon = [
    validate(applyCouponSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const cart = await cartService.applyCoupon(ownerFromReq(req), req.body.couponCode);
        return success(res, cart);
      } catch (err) { next(err); }
    },
  ];

  removeCoupon = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const cart = await cartService.removeCoupon(ownerFromReq(req));
      return success(res, cart);
    } catch (err) { next(err); }
  };

  applyReferral = [
    validate(applyReferralSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const cart = await cartService.applyReferral(ownerFromReq(req), req.body.referralCode);
        return success(res, cart);
      } catch (err) { next(err); }
    },
  ];

  merge = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    // Merge guest cart (identified by x-guest-id) into the authenticated user's cart
    try {
      const guestId = req.headers['x-guest-id'] as string;
      if (!guestId) return success(res, { merged: false, reason: 'No guest cart' });
      const cart = await cartService.mergeGuestCartIntoUser(guestId, req.user!.userId);
      return success(res, cart);
    } catch (err) { next(err); }
  };
}

export const cartController = new CartController();
