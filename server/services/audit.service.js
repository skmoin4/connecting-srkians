import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

/** Records an administrative action. Never throws — auditing must not break the request. */
export async function audit(req, { action, description, targetType, targetId, metadata }) {
  try {
    await AuditLog.create({
      actor: req?.user?._id,
      actorName: req?.user?.username,
      action,
      description,
      targetType,
      targetId: targetId ? String(targetId) : undefined,
      metadata,
      ip: req?.ip,
    });
  } catch (err) {
    logger.warn('Audit log failed', err.message);
  }
}
