import { Router } from 'express';
import * as c from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, sensitiveLimiter } from '../middleware/rateLimit.js';
import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotSchema,
  loginSchema,
  registerSchema,
  resetSchema,
  verifyEmailSchema,
} from '../validators/auth.validator.js';

const r = Router();

r.post('/register', authLimiter, validate(registerSchema), c.register);
r.post('/login', authLimiter, validate(loginSchema), c.login);
r.post('/refresh', c.refresh);
r.post('/logout', c.logout);
r.get('/me', authenticate, c.me);
r.post('/forgot-password', sensitiveLimiter, validate(forgotSchema), c.forgotPassword);
r.post('/reset-password', sensitiveLimiter, validate(resetSchema), c.resetPassword);
r.post('/verify-email', validate(verifyEmailSchema), c.verifyEmail);
r.post('/resend-verification', authenticate, sensitiveLimiter, c.resendVerification);
r.post('/change-password', authenticate, authLimiter, validate(changePasswordSchema), c.changePassword);
r.delete('/account', authenticate, authLimiter, validate(deleteAccountSchema), c.deleteAccount);

export default r;
