import { Router } from 'express';
import * as c from '../controllers/user.controller.js';
import { deleteAccount } from '../controllers/auth.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { deleteAccountSchema } from '../validators/auth.validator.js';
import { fcmTokenSchema, notificationPrefsSchema, privacySchema, updateLocationSchema, updateProfileSchema } from '../validators/user.validator.js';

const r = Router();

// "me" routes first so they don't collide with /:username
r.patch('/me', authenticate, validate(updateProfileSchema), c.updateMe);
r.delete('/me', authenticate, validate(deleteAccountSchema), deleteAccount);
r.patch('/me/location', authenticate, validate(updateLocationSchema), c.updateLocation);
r.patch('/me/privacy', authenticate, validate(privacySchema), c.updatePrivacy);
r.patch('/me/notification-preferences', authenticate, validate(notificationPrefsSchema), c.updateNotificationPrefs);
r.post('/me/fcm-tokens', authenticate, validate(fcmTokenSchema), c.addFcmToken);
r.delete('/me/fcm-tokens', authenticate, validate(fcmTokenSchema), c.removeFcmToken);
r.get('/me/fan-clubs', authenticate, c.myFanClubs);
r.get('/me/registrations', authenticate, c.myRegistrations);
r.get('/me/badges', authenticate, c.myBadges);
r.get('/me/referrals', authenticate, c.myReferrals);
r.get('/me/contact-requests', authenticate, c.myContacts);

r.get('/:username', optionalAuth, c.getProfile);

export default r;
