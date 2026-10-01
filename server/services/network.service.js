import { AdminCollaboration, FanClub } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex, idEq, isObjectId } from '../utils/helpers.js';
import { canManageClub } from './fanClub.service.js';
import { notifyUser } from './notification.service.js';

/**
 * Private Fan Club Admin Network: directory of verified clubs + their admins, visible only to
 * approved club admins, city moderators and super admins (enforced at the route level).
 * Contact details still respect each club's visibility settings.
 */
export async function adminDirectory({ q, country, state, city, skip, limit }) {
  const filter = { status: 'APPROVED' };
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  if (country && isObjectId(country)) filter.country = country;
  if (state && isObjectId(state)) filter.state = state;
  if (city && isObjectId(city)) filter.city = city;
  const [items, total] = await Promise.all([
    FanClub.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .select('name slug logo city state country admin adminName instagram contactVisibility memberCount')
      .populate('admin', 'fullName username profilePhoto')
      .populate('city', 'name slug')
      .populate('state', 'name')
      .populate('country', 'name code')
      .lean(),
    FanClub.countDocuments(filter),
  ]);
  return {
    items: items.map(({ contactVisibility, instagram, ...c }) => ({ ...c, instagram: contactVisibility?.showInstagram ? instagram : undefined })),
    total,
  };
}

export async function sendCollaboration(user, { senderClub, receiverClub, subject, message }) {
  if (String(senderClub) === String(receiverClub)) throw ApiError.badRequest('Choose a different fan club');
  const [sender, receiver] = await Promise.all([FanClub.findById(senderClub).lean(), FanClub.findById(receiverClub).lean()]);
  if (!sender || !canManageClub(user, sender)) throw ApiError.forbidden('You do not manage the sending fan club');
  if (sender.status !== 'APPROVED') throw ApiError.badRequest('Your fan club must be verified to collaborate');
  if (!receiver || receiver.status !== 'APPROVED') throw ApiError.notFound('Receiving fan club not found');

  const openCount = await AdminCollaboration.countDocuments({ senderClub, receiverClub, status: 'PENDING' });
  if (openCount >= 3) throw ApiError.badRequest('You already have pending requests with this club');

  const collab = await AdminCollaboration.create({ senderClub, receiverClub, sender: user._id, subject, message });
  notifyUser(receiver.admin, {
    type: 'FAN_CLUB',
    title: 'New collaboration request',
    message: `${sender.name}: ${subject}`,
    link: '/fan-club/network?tab=inbox',
  });
  return collab;
}

export async function listCollaborations(user, { box = 'inbox', status }) {
  const myClubs = (await FanClub.find({ admin: user._id }).select('_id').lean()).map((c) => c._id);
  const filter = box === 'sent' ? { senderClub: { $in: myClubs } } : { receiverClub: { $in: myClubs } };
  if (status) filter.status = status;
  return AdminCollaboration.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate({ path: 'senderClub', select: 'name slug logo city', populate: { path: 'city', select: 'name' } })
    .populate({ path: 'receiverClub', select: 'name slug logo city', populate: { path: 'city', select: 'name' } })
    .populate('sender', 'fullName username')
    .lean();
}

export async function respondCollaboration(user, id, { status, response }) {
  const collab = await AdminCollaboration.findById(id).populate('receiverClub', 'admin name city').populate('senderClub', 'admin name city');
  if (!collab) throw ApiError.notFound('Collaboration request not found');
  const isReceiver = canManageClub(user, collab.receiverClub);
  const isSender = canManageClub(user, collab.senderClub);
  if (!isReceiver && !isSender) throw ApiError.forbidden();
  // Only the receiver accepts/rejects; either side may close.
  if (['ACCEPTED', 'REJECTED'].includes(status) && !isReceiver) throw ApiError.forbidden('Only the receiving club can respond');
  collab.status = status;
  if (response) collab.response = response;
  collab.respondedBy = user._id;
  collab.respondedAt = new Date();
  await collab.save();

  const notifyTarget = idEq(collab.senderClub.admin, user._id) ? collab.receiverClub.admin : collab.senderClub.admin;
  notifyUser(notifyTarget, {
    type: 'FAN_CLUB',
    title: `Collaboration ${status.toLowerCase()}`,
    message: `${collab.subject} — ${isReceiver ? collab.receiverClub.name : collab.senderClub.name}`,
    link: '/fan-club/network?tab=sent',
  });
  return collab;
}
