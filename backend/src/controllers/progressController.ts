import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Progress } from '../models/Progress';
import { Team } from '../models/Team';
import { Project } from '../models/Project';

export const submitWeeklyProgress = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      teamId,
      projectId,
      weekNumber,
      completedTasks,
      currentWork,
      blockers,
      nextWeekGoals,
      githubUrl,
      files
    } = req.body;

    if (!teamId || !projectId || !weekNumber || !completedTasks || !currentWork || !nextWeekGoals) {
      res.status(400).json({
        success: false,
        message: 'Missing required progress report fields.'
      });
      return;
    }

    // Layer 3 Verification: Team membership check (Team Leader or Member)
    const team = await Team.findById(teamId);
    if (team) {
      const isLeader = team.leaderId.toString() === req.user?.id;
      const isMember = (team.memberIds || []).some(
        (m: any) => (m._id ? m._id.toString() : m.toString()) === req.user?.id
      );
      const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'mentor';
      if (!isLeader && !isMember && !isPrivileged) {
        res.status(403).json({
          success: false,
          message: 'Access Denied: You must be an assigned member of this team to file weekly reports.'
        });
        return;
      }
    }

    const submission = await Progress.create({
      teamId,
      projectId,
      weekNumber: Number(weekNumber),
      completedTasks: Array.isArray(completedTasks) ? completedTasks : [completedTasks],
      currentWork: Array.isArray(currentWork) ? currentWork : [currentWork],
      blockers: Array.isArray(blockers) ? blockers : blockers ? [blockers] : [],
      nextWeekGoals: Array.isArray(nextWeekGoals) ? nextWeekGoals : [nextWeekGoals],
      githubUrl: githubUrl || '',
      files: files || [],
      submittedBy: req.user?.id,
      submissionDate: new Date(),
      status: 'SUBMITTED'
    });

    await Project.findByIdAndUpdate(projectId, {
      lastUpdateDate: new Date(),
      hasPendingReview: true
    });

    res.status(201).json({
      success: true,
      message: 'Weekly progress submitted successfully and awaiting review.',
      data: submission
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
