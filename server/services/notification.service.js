import { Notification, User } from '../models/index.js';
import { NOTIFICATION_PREF_KEY } from '../constants/enums.js';
import { emitToUsers } from '../sockets/index.js';
import { sendPushToUsers } from './push.service.js';
import { logger } from '../utils/logger.js';

const MAX_FANOUT = 5000;

/**
 * Creates in-app notifications for users, honouring each user's notification preferences, then
 * pushes them over Socket.io and (if enabled) FCM. Never throws.
 *
 * @param {Array<string|ObjectId>} userIds
 * @param {{type:string,title:string,message?:string,link?:string}} payload
 * @param {{force?:boolean, excludeUserId?:any}} opts force=true bypasses preferences (security/account messages).
 */
export async function notifyUsers(userIds, payload, { force = false, excludeUserId } = {}) {
  try {
    let ids = [...new Set((userIds || []).map(String))].filter((id) => id !== String(excludeUserId || ''));
    if (!ids.length) return 0;
    ids = ids.slice(0, MAX_FANOUT);

    if (!force) {
      const prefKey = NOTIFICATION_PREF_KEY[payload.type];
      if (prefKey) {
        const optedOut = await User.find({ _id: { $in: ids }, [`notificationPreferences.${prefKey}`]: false })
          .select('_id')
          .lean();
        const out = new Set(optedOut.map((u) => String(u._id)));
        ids = ids.filter((id) => !out.has(id));
      }
    }
    if (!ids.length) return 0;

    const docs = await Notification.insertMany(
      ids.map((user) => ({ user, type: payload.type, title: payload.title, message: payload.message, link: payload.link })),
      { ordered: false }
    );

    const byUser = new Map(docs.map((d) => [String(d.user), d]));
    for (const [uid, doc] of byUser) emitToUsers([uid], 'notification:new', doc.toJSON());
    sendPushToUsers(ids, { title: payload.title, body: payload.message || '', link: payload.link }).catch(() => {});
    return docs.length;
  } catch (err) {
    logger.warn('notifyUsers failed', err.message);
    return 0;
  }
}

export const notifyUser = (userId, payload, opts) => notifyUsers([userId], payload, opts);

export async function listNotifications(userId, { page, limit, skip, unreadOnly }) {
  const filter = { user: userId, ...(unreadOnly ? { read: false } : {}) };
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, read: false }),
  ]);
  return { items, total, unread, page, limit };
}

export const unreadCount = (userId) => Notification.countDocuments({ user: userId, read: false });

export async function markRead(userId, id) {
  const n = await Notification.findOneAndUpdate({ _id: id, user: userId }, { read: true, readAt: new Date() }, { new: true }).lean();
  return n;
}

export const markAllRead = (userId) => Notification.updateMany({ user: userId, read: false }, { read: true, readAt: new Date() });

export const deleteNotification = (userId, id) => Notification.deleteOne({ _id: id, user: userId });
