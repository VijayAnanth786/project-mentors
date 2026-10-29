import { Router } from 'express';
import { submitWeeklyProgress } from '../controllers/progressController';
import { authenticateJWT, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT);

router.post('/submit', requireRoles('student'), submitWeeklyProgress);

export default router;
