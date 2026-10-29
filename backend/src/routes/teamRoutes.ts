import { Router } from 'express';
import { getTeams, createTeam, getTeamRiskAndSummary } from '../controllers/teamController';
import { authenticateJWT, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT);

router.get('/', requireRoles('student', 'mentor', 'admin'), getTeams);
router.post('/', requireRoles('student', 'mentor', 'admin'), createTeam);
router.get('/:teamId/risk', requireRoles('student', 'mentor', 'admin'), getTeamRiskAndSummary);


export default router;
