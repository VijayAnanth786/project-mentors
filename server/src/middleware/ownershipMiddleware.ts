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

    // Strict ownership verification: only designated Team Leader can submit official progress
    if (team.leaderId.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Only the assigned Team Leader may submit weekly progress reports'
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal ownership verification error' });
  }
};
