import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../db/database';

export const getStudentDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id || '';

    // Find student's team membership
    const membership = db.prepare(`
      SELECT tm.team_id, tm.role as team_role,
             t.name as team_name, t.year_cohort, t.department, t.mentor_id, t.project_id,
             p.title as project_title, p.description as project_description, p.tech_stack,
             p.repo_url, p.progress, p.status as project_status, p.deadline as project_deadline,
             mu.name as mentor_name, mu.email as mentor_email
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users mu ON t.mentor_id = mu.id
      WHERE tm.user_id = ?
      LIMIT 1
    `).get(studentId) as any;

    if (!membership) {
      res.json({
        success: true,
        data: {
          hasTeam: false,
          team: null,
          project: null,
          submissions: [],
          announcements: []
        }
      });
      return;
    }

    // Milestones
    const milestones = membership.project_id
      ? db.prepare(`
          SELECT id, title, deadline, status, order_index
          FROM milestones
          WHERE project_id = ?
          ORDER BY order_index ASC
        `).all(membership.project_id) as any[]
      : [];

    // Team Members
    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar, tm.role
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
    `).all(membership.team_id) as any[];

    // Submissions
    const submissions = db.prepare(`
      SELECT ws.id, ws.week, ws.date, ws.work_completed, ws.current_work, ws.blockers, ws.next_week_goals,
             ws.repo_url, ws.attachments, ws.status, ws.feedback, ws.reviewed_at,
             u.name as reviewer_name
      FROM weekly_submissions ws
      LEFT JOIN users u ON ws.reviewer_id = u.id
      WHERE ws.team_id = ?
      ORDER BY ws.week DESC, ws.created_at DESC
    `).all(membership.team_id) as any[];

    const formattedSubmissions = submissions.map((s) => ({
      ...s,
      attachments: s.attachments ? JSON.parse(s.attachments) : []
    }));

    // Announcements for students or all
    const announcements = db.prepare(`
      SELECT id, title, message, audience, created_at
      FROM announcements
      WHERE audience IN ('all', 'students')
      ORDER BY created_at DESC
      LIMIT 5
    `).all() as any[];

    // Upcoming Meetings for this team
    const meetings = db.prepare(`
      SELECT m.id, m.title, m.date, m.time, m.link_or_location, m.notes,
             u.name as mentor_name
      FROM meetings m
      JOIN users u ON m.mentor_id = u.id
      WHERE m.team_id = ? AND m.status = 'upcoming' AND m.date >= date('now')
      ORDER BY m.date ASC
    `).all(membership.team_id) as any[];

    res.json({
      success: true,
      data: {
        hasTeam: true,
        team: {
          id: membership.team_id,
          name: membership.team_name,
          yearCohort: membership.year_cohort,
          department: membership.department,
          mentorName: membership.mentor_name,
          mentorEmail: membership.mentor_email,
          role: membership.team_role,
          members
        },
        project: membership.project_id
          ? {
              id: membership.project_id,
              title: membership.project_title,
              description: membership.project_description,
              techStack: membership.tech_stack ? JSON.parse(membership.tech_stack) : [],
              repoUrl: membership.repo_url,
              progressPercentage: membership.progress,
              status: membership.project_status,
              deadline: membership.project_deadline,
              milestones
            }
          : null,
        submissions: formattedSubmissions,
        announcements,
        meetings
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitStudentWeeklyProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id || '';
    const { weekNumber, completedTasks, currentWork, blockers, nextWeekGoals, repoUrl, attachments } = req.body;

    // Find student's team
    const membership = db.prepare(`
      SELECT tm.team_id, t.project_id, t.mentor_id, t.name as team_name
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = ?
    `).get(studentId) as any;

    if (!membership) {
      res.status(400).json({ success: false, message: 'You must be part of a team to submit progress.' });
      return;
    }

    const subId = `sub_${Date.now()}`;
    const now = new Date().toISOString();
    const todayStr = new Date().toISOString().slice(0, 10);

    const workText = Array.isArray(completedTasks) ? completedTasks.join('\n') : completedTasks || 'Weekly tasks';
    const currentText = Array.isArray(currentWork) ? currentWork.join('\n') : currentWork || '';
    const blockerText = Array.isArray(blockers) ? blockers.join('\n') : blockers || '';
    const nextText = Array.isArray(nextWeekGoals) ? nextWeekGoals.join('\n') : nextWeekGoals || '';

    db.prepare(`
      INSERT INTO weekly_submissions (
        id, team_id, project_id, week, date, work_completed, current_work, blockers, next_week_goals,
        repo_url, attachments, status, submitted_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    `).run(
      subId,
      membership.team_id,
      membership.project_id || null,
      Number(weekNumber) || 1,
      todayStr,
      workText,
      currentText,
      blockerText,
      nextText,
      repoUrl || '',
      JSON.stringify(attachments || []),
      studentId,
      now
    );

    // Log activity
    db.prepare(`
      INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
      VALUES (?, ?, 'PROGRESS_SUBMITTED', ?, 'submission', ?, ?)
    `).run(`act_${Date.now()}`, studentId, `${membership.team_name} submitted Week ${weekNumber} progress report`, subId, now);

    // Notify mentor if exists
    if (membership.mentor_id) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
        VALUES (?, ?, 'New Submission for Review', ?, 'submission', 0, '/mentor/reviews', ?)
      `).run(`notif_${Date.now()}`, membership.mentor_id, `${membership.team_name} submitted Week ${weekNumber} progress report.`, now);
    }

    res.status(201).json({ success: true, message: 'Weekly progress report submitted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
