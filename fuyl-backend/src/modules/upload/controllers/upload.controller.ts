import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { success } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { signUploadSchema } from '../validators';
import { uploadService } from '../services';
import { ForbiddenError } from '../../../shared/errors';
import { Roles } from '../../../shared/middleware/rbac.middleware';

const ADMIN_UPLOAD_FOLDERS = new Set(['products', 'blog', 'categories', 'content']);

export function canSignUpload(role: string | undefined, folder: string): boolean {
  if (!ADMIN_UPLOAD_FOLDERS.has(folder)) return true;
  return role === Roles.ADMIN || role === Roles.SUPER_ADMIN;
}

export class UploadController {
  sign = [
    validate(signUploadSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        if (!canSignUpload(req.user?.role, req.body.folder)) {
          throw new ForbiddenError('Only administrators can upload catalog or storefront assets');
        }
        return success(res, uploadService.createSignedParams(req.body.folder, req.body.resourceType));
      } catch (err) { next(err); }
    },
  ];
}

export const uploadController = new UploadController();
