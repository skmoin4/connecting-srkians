import { Router } from 'express';
import * as ev from '../controllers/event.controller.js';
import * as fd from '../controllers/fdfs.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../constants/roles.js';
import {
  attendanceSchema,
  checkInSchema,
  createEventSchema,
  createFdfsSchema,
  fdfsJoinSchema,
  updateEventSchema,
  updateFdfsSchema,
} from '../validators/event.validator.js';

const events = Router();
events.get('/', optionalAuth, ev.list);
events.post('/', authenticate, requirePermission(PERMISSIONS.EVENT_CREATE), validate(createEventSchema), ev.create);
events.get('/:slug/calendar.ics', ev.calendar);
events.get('/:slug', optionalAuth, ev.getBySlug);
events.patch('/:id', authenticate, validate(updateEventSchema), ev.update);
events.post('/:id/attendance', authenticate, requirePermission(PERMISSIONS.EVENT_JOIN), validate(attendanceSchema), ev.attendance);
events.get('/:id/attendees', authenticate, ev.attendees);
events.post('/:id/attendees/:userId/attended', authenticate, ev.markAttended);
events.get('/:id/check-in-code', authenticate, ev.checkInCode);
events.post('/:id/check-in', authenticate, validate(checkInSchema), ev.checkIn);

const fdfs = Router();
fdfs.get('/', fd.list);
fdfs.post('/', authenticate, requirePermission(PERMISSIONS.FDFS_CREATE), validate(createFdfsSchema), fd.create);
fdfs.get('/:slug', optionalAuth, fd.getBySlug);
fdfs.patch('/:id', authenticate, validate(updateFdfsSchema), fd.update);
fdfs.post('/:id/join', authenticate, requirePermission(PERMISSIONS.EVENT_JOIN), validate(fdfsJoinSchema), fd.join);
fdfs.get('/:id/participants', authenticate, fd.participants);
fdfs.post('/:id/participants/:userId/attended', authenticate, fd.markAttended);
fdfs.get('/:id/check-in-code', authenticate, fd.checkInCode);
fdfs.post('/:id/check-in', authenticate, validate(checkInSchema), fd.checkIn);

export { events as eventRoutes, fdfs as fdfsRoutes };
