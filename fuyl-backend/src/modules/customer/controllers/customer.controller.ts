import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { customerService } from '../services';
import { success } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { updateProfileSchema, addressSchema, wishlistItemSchema } from '../validators';

export class CustomerController {
  getProfile = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await customerService.getOrCreateProfile(req.user!.userId));
    } catch (err) { next(err); }
  };

  updateProfile = [
    validate(updateProfileSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await customerService.updateProfile(req.user!.userId, req.body));
      } catch (err) { next(err); }
    },
  ];

  // Addresses
  listAddresses = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await customerService.listAddresses(req.user!.userId));
    } catch (err) { next(err); }
  };

  addAddress = [
    validate(addressSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await customerService.addAddress(req.user!.userId, req.body));
      } catch (err) { next(err); }
    },
  ];

  updateAddress = [
    validate(addressSchema.partial()),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await customerService.updateAddress(req.user!.userId, req.params.id, req.body));
      } catch (err) { next(err); }
    },
  ];

  removeAddress = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await customerService.removeAddress(req.user!.userId, req.params.id);
      return success(res, { deleted: true });
    } catch (err) { next(err); }
  };

  // Wishlist
  getWishlist = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await customerService.getWishlist(req.user!.userId));
    } catch (err) { next(err); }
  };

  addToWishlist = [
    validate(wishlistItemSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await customerService.addToWishlist(req.user!.userId, req.body));
      } catch (err) { next(err); }
    },
  ];

  removeFromWishlist = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const variantId = req.query.variantId as string | undefined;
      return success(res, await customerService.removeFromWishlist(req.user!.userId, req.params.productId, variantId));
    } catch (err) { next(err); }
  };

  // Loyalty
  getLoyalty = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await customerService.getLoyaltySummary(req.user!.userId));
    } catch (err) { next(err); }
  };
}

export const customerController = new CustomerController();
