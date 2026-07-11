import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { success } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { signUploadSchema } from '../validators';
import { uploadService } from '../services';

export class UploadController {
  sign = [
    validate(signUploadSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, uploadService.createSignedParams(req.body.folder));
      } catch (err) { next(err); }
    },
  ];
}

export const uploadController = new UploadController();
