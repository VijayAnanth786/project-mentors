import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, register, getMe, changePassword, logout, googleAuth } from '../controllers/authController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

// Login rate limiter: max 10 requests per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/google', googleAuth);
router.get('/me', authenticateJWT, getMe);
router.post('/change-password', authenticateJWT, changePassword);
router.post('/logout', logout);

export default router;

