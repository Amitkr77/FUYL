import { AuditLogModel } from '../models/auditLog.model';
import { logger } from '../../../config/logger';

export interface LogAuditParams {
  actorId?: string;
  actorEmail: string;
  actorName?: string;
  section: string;
  action: string;
  targetId?: string;
  targetLabel?: string;
  detail?: string;
}

/**
 * Write a human-readable activity log entry.
 * Fire-and-forget — never throws so a logging failure never breaks a request.
 */
export function logAudit(params: LogAuditParams): void {
  AuditLogModel.create({
    actorId:     params.actorId,
    actorEmail:  params.actorEmail,
    actorName:   params.actorName ?? '',
    section:     params.section,
    action:      params.action,
    targetId:    params.targetId,
    targetLabel: params.targetLabel,
    detail:      params.detail,
  }).catch((err) => logger.error('[auditLog] failed to write entry', err));
}

export async function queryAuditLogs(opts: {
  section?: string;
  page?: number;
  limit?: number;
}) {
  const { section, page = 1, limit = 50 } = opts;
  const filter: Record<string, unknown> = {};
  if (section) filter.section = section;
  const [items, total] = await Promise.all([
    AuditLogModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLogModel.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}
