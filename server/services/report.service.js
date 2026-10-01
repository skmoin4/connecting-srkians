import { AdminContactRequest, Event, FanClub, FDFS, Report, User } from '../models/index.js';
import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/ApiError.js';
import { canModerateCity, cityScopeFilter } from '../middleware/rbac.js';
import { notifyUsers, notifyUser } from './notification.service.js';

async function resolveTarget(type, id) {
  switch (type) {
    case 'FAN_CLUB': {
      const c = await FanClub.findById(id).select('name city').lean();
      return c && { label: c.name, city: c.city };
    }
    case 'EVENT': {
      const e = await Event.findById(id).select('title city').lean();
      return e && { label: e.title, city: e.city };
    }
    case 'FDFS': {
      const f = await FDFS.findById(id).select('movie city').lean();
      return f && { label: `${f.movie} FDFS`, city: f.city };
    }
    case 'USER': {
      const u = await User.findById(id).select('username city').lean();
      return u && { label: `@${u.username}`, city: u.city };
    }
    case 'ADMIN_CONTACT': {
      // Reporting a fan club's admin contact details (e.g. scam number)
      const c = await FanClub.findById(id).select('name city').lean();
      if (c) return { label: `${c.name} (admin contact)`, city: c.city };
      const r = await AdminContactRequest.findById(id).populate('fanClub', 'name city').lean();
      return r && { label: `Contact request — ${r.fanClub?.name}`, city: r.fanClub?.city };
    }
    default:
      return null;
  }
}

export async function createReport(user, data) {
  const target = await resolveTarget(data.targetType, data.targetId);
  if (!target) throw ApiError.notFound('The reported item was not found');
  const dup = await Report.exists({
    reporter: user._id,
    targetType: data.targetType,
    targetId: data.targetId,
    status: { $in: ['PENDING', 'UNDER_REVIEW'] },
  });
  if (dup) throw ApiError.conflict('You have already reported this. Our moderators are reviewing it.');

  const report = await Report.create({ ...data, reporter: user._id, targetLabel: target.label, city: target.city });
  const mods = await User.find({
    status: 'ACTIVE',
    $or: [{ role: ROLES.SUPER_ADMIN }, ...(target.city ? [{ role: ROLES.CITY_MODERATOR, moderatedCities: target.city }] : [])],
  })
    .select('_id')
    .lean();
  notifyUsers(
    mods.map((m) => m._id),
    { type: 'ADMIN', title: 'New report submitted', message: `${data.reason.replace(/_/g, ' ')} — ${target.label}`, link: '/admin/reports' }
  );
  return report;
}

export async function listReports(actor, { status, targetType, skip, limit }) {
  const filter = { ...cityScopeFilter(actor) };
  if (status) filter.status = status;
  if (targetType) filter.targetType = targetType;
  const [items, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reporter', 'fullName username')
      .populate('city', 'name')
      .populate('notes.by', 'fullName username')
      .lean(),
    Report.countDocuments(filter),
  ]);
  return { items, total };
}

export async function updateReport(actor, id, { status, note }) {
  const report = await Report.findById(id);
  if (!report) throw ApiError.notFound('Report not found');
  if (!canModerateCity(actor, report.city) && actor.role !== ROLES.SUPER_ADMIN) throw ApiError.forbidden();
  if (note) report.notes.push({ by: actor._id, note });
  if (status) {
    report.status = status;
    if (['RESOLVED', 'DISMISSED'].includes(status)) {
      report.resolvedBy = actor._id;
      report.resolvedAt = new Date();
      notifyUser(report.reporter, {
        type: 'SYSTEM',
        title: `Your report was ${status.toLowerCase()}`,
        message: `Thanks for helping keep the community safe (${report.targetLabel}).`,
      });
    }
  }
  await report.save();
  return report;
}
