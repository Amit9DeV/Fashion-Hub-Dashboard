import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { login, logout, getMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ─── Strict rate limit on login to prevent brute-force attacks ────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 10,                   // Max 10 attempts per IP per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
  skipSuccessfulRequests: true, // Only count failed attempts
});

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

export default router;
