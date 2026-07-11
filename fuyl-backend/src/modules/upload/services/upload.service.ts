import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../../config/env';
import { BadRequestError } from '../../../shared/errors';

export type UploadFolder = 'products' | 'blog' | 'avatars' | 'reviews';

class UploadService {
  /**
   * Signed direct-to-Cloudinary upload params. The client POSTs the file
   * straight to Cloudinary's API using these — the file never passes
   * through this server. api_secret never leaves the backend.
   */
  createSignedParams(folder: UploadFolder) {
    if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
      throw new BadRequestError('File uploads are not configured — Cloudinary credentials are missing');
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = { timestamp, folder: `fuyl/${folder}` };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, env.cloudinary.apiSecret);

    return {
      timestamp,
      signature,
      apiKey:    env.cloudinary.apiKey,
      cloudName: env.cloudinary.cloudName,
      folder:    paramsToSign.folder,
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`,
    };
  }
}

export const uploadService = new UploadService();
