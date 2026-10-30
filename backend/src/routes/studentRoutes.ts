import { Router } from 'express';
import {
  getStudentDashboard,
  submitStudentWeeklyProgress,
  createStudentTeam,
  getStudentTeams,
  joinStudentTeam,
  addStudentTeamMember,
  removeStudentTeamMember,
  getAvailableStudents
} from '../controllers/studentController';
import { authenticateJWT, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT, requireRoles('student', 'mentor', 'admin'));

router.get('/dashboard', getStudentDashboard);
router.post('/submissions', submitStudentWeeklyProgress);
router.get('/teams', getStudentTeams);
router.post('/teams', createStudentTeam);
router.post('/teams/:teamId/join', joinStudentTeam);
router.get('/available-students', getAvailableStudents);
router.post('/teams/:teamId/members', addStudentTeamMember);
router.delete('/teams/:teamId/members/:memberId', removeStudentTeamMember);

export default router;

