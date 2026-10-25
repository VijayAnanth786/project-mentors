import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Team } from '../models/Team';
import { db } from '../db/database';
import { calculateTeamRisk } from '../services/riskService';
import { generateProjectSummary } from '../services/geminiService';

export const getTeams = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { cohort } = req.query;
    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady) {
      const filter: any = {};
      if (cohort) filter.yearCohort = cohort;
      if (req.user?.role === 'mentor') {
        filter.mentorId = req.user.id;
      }

      const teams = await Team.find(filter)
        .populate('leaderId', 'name email avatar')
        .populate('memberIds', 'name email avatar')
        .populate('mentorId', 'name email');

      res.json({ success: true, count: teams.length, data: teams });
      return;
    }

    // Local SQLite fallback
    let query = `
      SELECT t.id, t.name, t.year_cohort as yearCohort, t.department, t.status,
             p.id as project_id, p.title as projectTitle, p.progress as progressPercentage, p.status as projectStatus,
             u.id as leader_id, u.name as leaderName, u.email as leaderEmail,
             mu.id as mentor_id, mu.name as mentorName, mu.email as mentorEmail,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as memberCount
      FROM teams t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.leader_id = u.id
      LEFT JOIN users mu ON t.mentor_id = mu.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (cohort) {
      query += ` AND t.year_cohort = ?`;
      params.push(cohort);
    }
    if (req.user?.role === 'mentor') {
      query += ` AND t.mentor_id = ?`;
      params.push(req.user.id);
    }

    query += ` ORDER BY t.created_at DESC`;
    const teams = db.prepare(query).all(...params) as any[];

    res.json({ success: true, count: teams.length, data: teams });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, yearCohort, leaderId, memberIds, mentorId, department, projectTitle } = req.body;
    const effectiveLeaderId = leaderId || req.user?.id;
    const assignedMentorId = req.user?.role === 'mentor' ? req.user.id : (mentorId || null);
    const now = new Date().toISOString();
    const teamId = `team_${Date.now()}`;
    const projId = `proj_${Date.now()}`;

    // SQLite persistence
    try {
      const pTitle = projectTitle || `${name} Project`;
      db.prepare(`
        INSERT INTO projects (id, title, description, tech_stack, status, deadline, progress, created_at)
        VALUES (?, ?, ?, ?, 'ON_TRACK', date('now', '+60 days'), 0, ?)
      `).run(projId, pTitle, `Workspace for ${pTitle}`, JSON.stringify(['React', 'TypeScript', 'Node.js']), now);

      db.prepare(`
        INSERT INTO teams (id, name, leader_id, mentor_id, project_id, year_cohort, department, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `).run(teamId, name, effectiveLeaderId, assignedMentorId, projId, yearCohort || '3rd Year', department || 'Computer Science', now);

      db.prepare(`
        INSERT INTO team_members (id, team_id, user_id, role, created_at)
        VALUES (?, ?, ?, 'Team Leader', ?)
      `).run(`tm_${Date.now()}`, teamId, effectiveLeaderId, now);
    } catch (sqlErr) {
      console.warn('[SQLite team create notice]', sqlErr);
    }

    // Mongo persistence if connected
    if (mongoose.connection.readyState === 1) {
      try {
        await Team.create({
          name,
          yearCohort,
          leaderId: effectiveLeaderId,
          memberIds: memberIds || [effectiveLeaderId],
          mentorId: assignedMentorId,
          department: department || req.user?.department || 'Computer Science'
        });
      } catch {}
    }

    res.status(201).json({
      success: true,
      data: { id: teamId, name, projectId: projId }
    });
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
