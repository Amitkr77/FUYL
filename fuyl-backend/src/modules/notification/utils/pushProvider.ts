import { env } from '../../../config/env';
import { logger } from '../../../config/logger';

let app: import('firebase-admin/app').App | null = null;
let initAttempted = false;

async function getApp(): Promise<import('firebase-admin/app').App | null> {
  if (initAttempted) return app;
  initAttempted = true;
  if (!env.firebase.projectId || !env.firebase.clientEmail || !env.firebase.privateKey) {
    logger.warn('[notification] Firebase not configured — push will be logged only');
    return null;
  }
  // Lazy import — keeps firebase-admin's SDK init out of the module-load
  // path for every process that imports this file, matching the twilio
  // provider's lazy getClient() pattern used elsewhere in this module.
  const { initializeApp, cert, getApps, getApp: getExistingApp } = await import('firebase-admin/app');
  app = getApps().length
    ? getExistingApp()
    : initializeApp({
        credential: cert({
          projectId: env.firebase.projectId,
          clientEmail: env.firebase.clientEmail,
          privateKey: env.firebase.privateKey,
        }),
      });
  return app;
}

export interface PushMessage {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushResult {
  successCount: number;
  invalidTokens: string[];
  /** True when no Firebase credentials are configured and this call only logged — not a real delivery failure. */
  stub: boolean;
}

export async function sendPush(msg: PushMessage): Promise<PushResult> {
  if (msg.tokens.length === 0) return { successCount: 0, invalidTokens: [], stub: false };

  const a = await getApp();
  if (!a) {
    logger.info(`[notification][push-stub] to=${msg.tokens.length} device(s) title="${msg.title}" body=${msg.body}`);
    return { successCount: 0, invalidTokens: [], stub: true };
  }

  const { getMessaging } = await import('firebase-admin/messaging');
  const result = await getMessaging(a).sendEachForMulticast({
    tokens: msg.tokens,
    notification: { title: msg.title, body: msg.body },
    data: msg.data,
  });

  const invalidTokens: string[] = [];
  result.responses.forEach((r, i) => {
    if (!r.success && (r.error?.code === 'messaging/registration-token-not-registered' || r.error?.code === 'messaging/invalid-registration-token')) {
      invalidTokens.push(msg.tokens[i]);
    }
  });

  return { successCount: result.successCount, invalidTokens, stub: false };
}
