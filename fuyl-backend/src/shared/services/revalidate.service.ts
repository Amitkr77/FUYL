import { env } from '../../config/env';
import { logger } from '../../config/logger';

/**
 * Calls the storefront's POST /api/revalidate to bust its ISR cache
 * on-demand after a catalog/content mutation. Best-effort and non-blocking
 * by design: the storefront may be down or REVALIDATE_SECRET unset in a
 * given environment, and a stale storefront page is a much smaller problem
 * than an admin mutation failing because of it. Without this, newly
 * published products/posts only became visible after their page's own ISR
 * window elapsed (up to 3600s) — confirmed live: a product created via the
 * admin API was correctly returned by the raw backend endpoint immediately,
 * but nothing ever told the storefront's cache to refresh.
 */
export async function revalidateStorefront(paths: string[]): Promise<void> {
  if (!env.revalidateSecret) return;

  await Promise.all(
    paths.map(async (path) => {
      try {
        await Promise.race([
          fetch(`${env.clientUrl}/api/revalidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: env.revalidateSecret, path }),
          }),
          new Promise((_resolve, reject) => setTimeout(() => reject(new Error('revalidate request timed out')), 3000)),
        ]);
      } catch (err) {
        logger.warn(`[revalidate] failed to revalidate storefront path "${path}"`, err);
      }
    })
  );
}
