import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Review } from '../models/Review';
import { Progress } from '../models/Progress';
import { Project } from '../models/Project';

export const submitMentorReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { progressId, teamId, status, feedback } = req.body;

    if (!progressId || !teamId || !status || !feedback) {
      res.status(400).json({ success: false, message: 'All review fields are required' });
      return;
    }

    const review = await Review.create({
      progressId,
      teamId,
      mentorId: req.user?.id,
      status,
      feedback,
      reviewedAt: new Date()
    });

    // Update Progress and Project records
    await Progress.findByIdAndUpdate(progressId, {
      status: status === 'Approved' ? 'APPROVED' : status === 'Needs Improvement' ? 'NEEDS_IMPROVEMENT' : 'MAJOR_ISSUE'
    });

    await Project.findOneAndUpdate(
      { teamId },
      {
        hasPendingReview: false,
        status: status === 'Approved' ? 'ON_TRACK' : status === 'Needs Improvement' ? 'NEEDS_ATTENTION' : 'DELAYED'
      }
    );

    res.status(201).json({
      success: true,
      message: 'Mentor review filed successfully',
      data: review
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
