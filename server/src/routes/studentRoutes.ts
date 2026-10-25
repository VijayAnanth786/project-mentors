import { Router } from 'express';
import {
  getStudentDashboard,
  submitStudentWeeklyProgress,
  createStudentTeam,
  getStudentTeams,
  joinStudentTeam
} from '../controllers/studentController';
import { authenticateJWT, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT, requireRoles('student', 'mentor', 'admin'));

router.get('/dashboard', getStudentDashboard);
router.post('/submissions', submitStudentWeeklyProgress);
router.get('/teams', getStudentTeams);
router.post('/teams', createStudentTeam);
router.post('/teams/:teamId/join', joinStudentTeam);

export default router;

