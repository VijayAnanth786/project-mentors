import { Router } from 'express';
import { getStudentDashboard, submitStudentWeeklyProgress } from '../controllers/studentController';
import { authenticateJWT, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT, requireRoles('student', 'mentor', 'admin'));

router.get('/dashboard', getStudentDashboard);
router.post('/submissions', submitStudentWeeklyProgress);

export default router;
