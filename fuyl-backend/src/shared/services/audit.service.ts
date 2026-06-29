import { addJob, QUEUE_NAMES } from '../../config/queue';
import { logger } from '../../config/logger';

/**
 * Writes an audit trail entry — fire-and-forget, persisted via analytics queue.
 */
class AuditService {
  async write(
    actor: { userId: string; role: string },
    action: string,
    resource: { type: string; id: string },
    meta?: Record<string, unknown>
  ): Promise<void> {
    logger.debug(`[audit] ${actor.role}:${actor.userId} ${action} ${resource.type}:${resource.id}`);
    await addJob(QUEUE_NAMES.ANALYTICS_EVENT, 'audit', {
      kind: 'audit',
      actor,
      action,
      resource,
      meta,
      at: new Date().toISOString(),
    });
  }
}

export const auditService = new AuditService();
