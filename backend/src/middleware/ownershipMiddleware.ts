import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { Team } from '../models/Team';

// Layer 3: Resource Ownership Enforcement
export const verifyTeamLeaderOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { teamId } = req.body;
    const userId = req.user?.id;

    if (!teamId || !userId) {
      res.status(400).json({ success: false, message: 'Missing team identifier or user context' });
      return;
    }

    const team = await Team.findById(teamId);
    if (!team) {
      res.status(404).json({ success: false, message: 'Target team not found' });
      return;
    }

    // Allow Team Leader or any assigned team member
    const isLeader = team.leaderId.toString() === userId;
    const isMember = (team.memberIds || []).some(
      (m: any) => (m._id ? m._id.toString() : m.toString()) === userId
    );
    const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'mentor';

    if (!isLeader && !isMember && !isPrivileged) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You must be an assigned member of this team to submit weekly progress reports'
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal ownership verification error' });
  }
};
