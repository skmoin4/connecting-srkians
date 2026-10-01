import { env, isFirebaseConfigured } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { User } from '../models/User.js';

let messaging = null;
let initTried = false;

/**
 * Lazily initialises Firebase Admin. `firebase-admin` is an optional dependency: install it and set
 * FIREBASE_* variables to enable push. Without it, push is a silent no-op (in-app still works).
 */
async function getMessaging() {
  if (initTried) return messaging;
  initTried = true;
  if (!isFirebaseConfigured()) return null;
  try {
    const admin = (await import('firebase-admin')).default;
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.firebase.projectId,
          clientEmail: env.firebase.clientEmail,
          privateKey: env.firebase.privateKey,
        }),
      });
    }
    messaging = admin.messaging();
    logger.info('Firebase Cloud Messaging enabled');
  } catch (err) {
    logger.warn('FCM not available (install firebase-admin to enable push):', err.message);
  }
  return messaging;
}

export async function sendPushToUsers(userIds, { title, body, link }) {
  const m = await getMessaging();
  if (!m || !userIds.length) return;
  const users = await User.find({ _id: { $in: userIds }, 'notificationPreferences.push': true })
    .select('+fcmTokens')
    .lean();
  const tokens = users.flatMap((u) => u.fcmTokens || []);
  if (!tokens.length) return;
  try {
    const res = await m.sendEachForMulticast({
      tokens: tokens.slice(0, 500),
      notification: { title, body },
      webpush: link ? { fcmOptions: { link: `${env.clientUrl}${link}` } } : undefined,
    });
    // Prune invalid tokens
    const bad = res.responses.map((r, i) => (!r.success ? tokens[i] : null)).filter(Boolean);
    if (bad.length) await User.updateMany({ _id: { $in: userIds } }, { $pull: { fcmTokens: { $in: bad } } });
  } catch (err) {
    logger.warn('Push send failed', err.message);
  }
}
