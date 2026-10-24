import { Router } from 'express';
import { getTeams, createTeam, getTeamRiskAndSummary } from '../controllers/teamController';
import { authenticateJWT, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT);

router.get('/', requireRoles('student'), getTeams);
router.post('/', requireRoles('student'), createTeam);
router.get('/:teamId/risk', requireRoles('student'), getTeamRiskAndSummary);

export default router;
