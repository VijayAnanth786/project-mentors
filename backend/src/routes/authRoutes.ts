import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, register, getMe, changePassword, logout, googleAuth } from '../controllers/authController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

// Login rate limiter: max 10 requests per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 10),
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.CHANGE_PASSWORD_RATE_LIMIT_MAX || 5),
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many password change attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/google', googleAuth);
router.get('/me', authenticateJWT, getMe);
router.post('/change-password', changePasswordLimiter, authenticateJWT, changePassword);
router.post('/logout', logout);

export default router;

