import * as eventService from '../services/event.service.js';
import { Event } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, paginated } from '../utils/response.js';
import { parsePagination } from '../utils/helpers.js';
import { ApiError } from '../utils/ApiError.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 12 });
  const { items, total } = await eventService.listEvents({ ...req.query, skip, limit }, req.user);
  paginated(res, { items, total, page, limit });
});

export const getBySlug = asyncHandler(async (req, res) => ok(res, { event: await eventService.getEventBySlug(req.params.slug, req.user) }));

export const create = asyncHandler(async (req, res) => created(res, { event: await eventService.createEvent(req.user, req.body) }, 'Event created'));

export const update = asyncHandler(async (req, res) => ok(res, { event: await eventService.updateEvent(req.user, req.params.id, req.body) }, 'Event updated'));

export const attendance = asyncHandler(async (req, res) => {
  const result = await eventService.setAttendance(req.user, req.params.id, req.body.status);
  const msg = { GOING: "You're going! See you there.", INTERESTED: 'Marked as interested', CANCELLED: 'Registration cancelled' }[result.status];
  ok(res, result, msg);
});

export const attendees = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const result = await eventService.listAttendees(req.user, req.params.id, { status: req.query.status, skip, limit });
  ok(res, { ...result, pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) || 1 } });
});

export const markAttended = asyncHandler(async (req, res) => {
  await eventService.markAttendeeAttended(req.user, req.params.id, req.params.userId);
  ok(res, {}, 'Marked as attended');
});

export const checkInCode = asyncHandler(async (req, res) => ok(res, await eventService.getCheckIn(req.user, req.params.id, req.query.regenerate === 'true')));

export const checkIn = asyncHandler(async (req, res) => ok(res, await eventService.checkIn(req.user, req.params.id, req.body.code), 'Checked in — enjoy the event!'));

export const managed = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
  const { items, total } = await eventService.managedEvents(req.user, { fanClub: req.query.fanClub, skip, limit });
  paginated(res, { items, total, page, limit });
});

export const calendar = asyncHandler(async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug, status: { $ne: 'DRAFT' } }).lean();
  if (!event) throw ApiError.notFound('Event not found');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${event.slug}.ics"`);
  res.send(eventService.toICS(event));
});
