import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Team } from '../models/Team';
import { calculateTeamRisk } from '../services/riskService';
import { generateProjectSummary } from '../services/geminiService';

export const getTeams = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { cohort } = req.query;
    const filter: any = {};
    if (cohort) filter.yearCohort = cohort;

    // Layer 2 & 3: Mentors only get their teams unless Admin
    if (req.user?.role === 'mentor') {
      filter.mentorId = req.user.id;
    }

    const teams = await Team.find(filter)
      .populate('leaderId', 'name email avatar')
      .populate('memberIds', 'name email avatar')
      .populate('mentorId', 'name email');

    res.json({ success: true, count: teams.length, data: teams });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, yearCohort, leaderId, memberIds, mentorId, department } = req.body;

    // Admins can assign any mentor; Mentors default to themselves
    const assignedMentorId = req.user?.role === 'mentor' ? req.user.id : mentorId;

    const team = await Team.create({
      name,
      yearCohort,
      leaderId: leaderId || req.user?.id,
      memberIds: memberIds || [],
      mentorId: assignedMentorId,
      department: department || req.user?.department || 'Computer Science'
    });

    res.status(201).json({ success: true, data: team });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTeamRiskAndSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;

    // Deterministic Heuristics calculated first
    const mockMetrics = {
      progressPercentage: 75,
      daysUntilDeadline: 4,
      daysSinceLastUpdate: 2,
      githubCommitsThisWeek: 14,
      hasPendingReview: true
    };

    const riskAssessment = calculateTeamRisk(mockMetrics);

    // Gemini generates explanation & summary with fallback
    const explanation = await generateProjectSummary(
      'Team 5',
      'AI Resume Analyzer',
      mockMetrics,
      riskAssessment
    );

    res.json({
      success: true,
      data: {
        teamId,
        metrics: mockMetrics,
        risk: riskAssessment,
        aiExplanation: explanation
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
