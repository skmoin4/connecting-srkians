import { getSettingsCached } from '../services/settings.service.js';
import { verifyAccessToken } from '../services/token.service.js';
import { User } from '../models/index.js';
import { ROLES } from '../constants/roles.js';

const ALWAYS_ALLOWED = ['/auth/login', '/auth/refresh', '/auth/me', '/auth/logout', '/settings/public', '/health'];

async function isSuperAdminRequest(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return false;
  try {
    const { sub } = verifyAccessToken(header.slice(7));
    const user = await User.findById(sub).select('role status').lean();
    return user?.status === 'ACTIVE' && user.role === ROLES.SUPER_ADMIN;
  } catch {
    return false;
  }
}

/** When maintenance mode is on, only super admins can use the API (plus login/settings). */
export const maintenanceGuard = async (req, res, next) => {
  try {
    const settings = await getSettingsCached();
    if (!settings?.maintenanceMode) return next();
    if (ALWAYS_ALLOWED.some((p) => req.path.startsWith(p))) return next();
    if (await isSuperAdminRequest(req)) return next();
    return res.status(503).json({ success: false, message: settings.maintenanceMessage, errors: [] });
  } catch {
    return next();
  }
};
