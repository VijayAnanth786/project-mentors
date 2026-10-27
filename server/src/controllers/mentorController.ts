import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../db/database';
import { User } from '../models/User';
import { Team } from '../models/Team';

export const getMentorDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const mentorId = req.user?.id;
    const mentorEmail = (req.user?.email || '').toLowerCase();
    if (!mentorId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Sync from MongoDB Atlas if connected
    if (mongoose.connection.readyState === 1) {
      try {
        let mUser = null;
        if (mongoose.Types.ObjectId.isValid(mentorId)) {
          mUser = await User.findById(mentorId);
        }
        if (!mUser && mentorEmail) {
          mUser = await User.findOne({ email: mentorEmail });
        }
        if (mUser) {
          const mongoAssignedTeams = await Team.find({ mentorId: mUser._id });
          for (const mt of mongoAssignedTeams) {
            db.prepare('UPDATE teams SET mentor_id = ? WHERE id = ? OR name = ?').run(mentorId, mt._id.toString(), mt.name);
          }
        }
      } catch (mErr) {
        console.warn('[MongoDB mentor sync notice]', mErr);
      }
    }

    // 1. Assigned Teams
    const teams = db.prepare(`
      SELECT t.id, t.name, t.leader_id, t.project_id, t.year_cohort, t.department,
             p.title as project_title, p.progress as project_progress, p.status as project_status,
             u.name as leader_name, u.avatar as leader_avatar
      FROM teams t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.leader_id = u.id
      WHERE (t.mentor_id = ? OR t.mentor_id IN (SELECT id FROM users WHERE email = ? COLLATE NOCASE)) AND t.status = 'active'
      ORDER BY t.name ASC
    `).all(mentorId, mentorEmail) as any[];

    const teamIds = teams.map((t) => t.id);

    // 2. Compute live counts via database queries
    let studentsGuidedCount = 0;
    let pendingReviewsCount = 0;
    let upcomingMeetingsCount = 0;
    let overdueSubmissionsCount = 0;

    if (teamIds.length > 0) {
      const placeholders = teamIds.map(() => '?').join(',');

      // Students guided count
      const studentsGuidedRow = db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM team_members
        WHERE team_id IN (${placeholders})
      `).get(...teamIds) as any;
      studentsGuidedCount = studentsGuidedRow?.count || 0;

      // Pending reviews count
      const pendingRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM weekly_submissions
        WHERE team_id IN (${placeholders}) AND status = 'PENDING'
      `).get(...teamIds) as any;
      pendingReviewsCount = pendingRow?.count || 0;

      // Upcoming meetings count
      const meetingsRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM meetings
        WHERE mentor_id = ? AND status = 'upcoming' AND date >= date('now')
      `).get(mentorId) as any;
      upcomingMeetingsCount = meetingsRow?.count || 0;

      // Overdue submissions count (status PENDING and date < date('now'))
      const overdueRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM weekly_submissions
        WHERE team_id IN (${placeholders}) AND status = 'PENDING' AND date < date('now')
      `).get(...teamIds) as any;
      overdueSubmissionsCount = overdueRow?.count || 0;
    }

    // 3. Teams with latest submission
    const assignedTeamsWithLatest = teams.map((team) => {
      const latestSub = db.prepare(`
        SELECT id, week, date, status, work_completed
        FROM weekly_submissions
        WHERE team_id = ?
        ORDER BY week DESC, created_at DESC
        LIMIT 1
      `).get(team.id) as any;

      return {
        id: team.id,
        name: team.name,
        leaderName: team.leader_name,
        leaderAvatar: team.leader_avatar,
        project: {
          id: team.project_id,
          title: team.project_title || 'Untitled Project',
          progress: team.project_progress || 0,
          status: team.project_status || 'ON_TRACK'
        },
        latestSubmission: latestSub
          ? {
              id: latestSub.id,
              week: latestSub.week,
              date: latestSub.date,
              status: latestSub.status
            }
          : null
      };
    });

    // 4. Upcoming Meetings for this mentor
    const upcomingMeetings = db.prepare(`
      SELECT m.id, m.title, m.date, m.time, m.link_or_location, m.notes, m.status,
             t.name as team_name
      FROM meetings m
      JOIN teams t ON m.team_id = t.id
      WHERE m.mentor_id = ? AND m.status = 'upcoming' AND m.date >= date('now')
      ORDER BY m.date ASC, m.time ASC
      LIMIT 5
    `).all(mentorId) as any[];

    // 5. Overdue Submissions for this mentor's teams
    let overdueSubmissions: any[] = [];
    if (teamIds.length > 0) {
      const placeholders = teamIds.map(() => '?').join(',');
      overdueSubmissions = db.prepare(`
        SELECT ws.id, ws.week, ws.date, ws.status, t.name as team_name, t.id as team_id
        FROM weekly_submissions ws
        JOIN teams t ON ws.team_id = t.id
        WHERE ws.team_id IN (${placeholders}) AND ws.status = 'PENDING' AND ws.date < date('now')
        ORDER BY ws.date ASC
        LIMIT 5
      `).all(...teamIds) as any[];
    }

    // 6. Recent Student Activity
    let recentActivity: any[] = [];
    if (teamIds.length > 0) {
      const placeholders = teamIds.map(() => '?').join(',');
      recentActivity = db.prepare(`
        SELECT ae.id, ae.action_type, ae.description, ae.created_at, u.name as user_name
        FROM activity_events ae
        LEFT JOIN users u ON ae.user_id = u.id
        WHERE ae.target_type = 'submission' OR ae.target_id IN (${placeholders}) OR ae.user_id = ?
        ORDER BY ae.created_at DESC
        LIMIT 8
      `).all(...teamIds, mentorId) as any[];
    } else {
      recentActivity = db.prepare(`
        SELECT ae.id, ae.action_type, ae.description, ae.created_at, u.name as user_name
        FROM activity_events ae
        LEFT JOIN users u ON ae.user_id = u.id
        ORDER BY ae.created_at DESC
        LIMIT 8
      `).all() as any[];
    }

    res.json({
      success: true,
      data: {
        summary: {
          assignedTeamsCount: teams.length,
          studentsGuidedCount,
          pendingReviewsCount,
          upcomingMeetingsCount,
          overdueSubmissionsCount
        },
        assignedTeams: assignedTeamsWithLatest,
        upcomingMeetings,
        overdueSubmissions,
        recentActivity
      }
    });
  } catch (error: any) {
    console.error('[Mentor Dashboard Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMentorTeams = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const mentorId = req.user?.id || '';
    const mentorEmail = (req.user?.email || '').toLowerCase();

    // Sync from MongoDB Atlas if connected
    if (mongoose.connection.readyState === 1) {
      try {
        let mUser = null;
        if (mongoose.Types.ObjectId.isValid(mentorId)) {
          mUser = await User.findById(mentorId);
        }
        if (!mUser && mentorEmail) {
          mUser = await User.findOne({ email: mentorEmail });
        }
        if (mUser) {
          const mongoAssignedTeams = await Team.find({ mentorId: mUser._id });
          for (const mt of mongoAssignedTeams) {
            db.prepare('UPDATE teams SET mentor_id = ? WHERE id = ? OR name = ?').run(mentorId, mt._id.toString(), mt.name);
          }
        }
      } catch {}
    }

    const teams = db.prepare(`
      SELECT t.id, t.name, t.year_cohort, t.department, t.status,
             p.id as project_id, p.title as project_title, p.description as project_description,
             p.progress as project_progress, p.status as project_status, p.repo_url as repo_url,
             u.id as leader_id, u.name as leader_name, u.email as leader_email, u.avatar as leader_avatar,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.leader_id = u.id
      WHERE (t.mentor_id = ? OR t.mentor_id IN (SELECT id FROM users WHERE email = ? COLLATE NOCASE))
      ORDER BY t.name ASC
    `).all(mentorId, mentorEmail) as any[];

    res.json({ success: true, count: teams.length, data: teams });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMentorTeamDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;
    const mentorId = req.user?.id || '';
    const mentorEmail = (req.user?.email || '').toLowerCase();

    const team = db.prepare(`
      SELECT t.id, t.name, t.year_cohort, t.department, t.status, t.mentor_id,
             p.id as project_id, p.title as project_title, p.description as project_description,
             p.tech_stack, p.repo_url, p.progress, p.status as project_status, p.deadline as project_deadline,
             u.id as leader_id, u.name as leader_name, u.email as leader_email, u.avatar as leader_avatar
      FROM teams t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.leader_id = u.id
      WHERE t.id = ?
    `).get(teamId) as any;

    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    let isMentor = team.mentor_id === mentorId;
    if (!isMentor && mentorEmail) {
      const mRow = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(mentorEmail) as any;
      if (mRow && team.mentor_id === mRow.id) {
        isMentor = true;
      }
    }

    if (req.user?.role === 'mentor' && !isMentor) {
      res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this team' });
      return;
    }

    const members = db.prepare(`
      SELECT tm.id as membership_id, tm.role as team_role,
             u.id, u.name, u.email, u.avatar, sp.roll_number, sp.department
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE tm.team_id = ?
    `).all(teamId) as any[];

    const milestones = team.project_id
      ? db.prepare(`
          SELECT id, title, deadline, status, order_index
          FROM milestones
          WHERE project_id = ?
          ORDER BY order_index ASC
        `).all(team.project_id) as any[]
      : [];

    const submissions = db.prepare(`
      SELECT ws.id, ws.week, ws.date, ws.work_completed, ws.current_work, ws.blockers, ws.next_week_goals,
             ws.repo_url, ws.attachments, ws.status, ws.feedback, ws.reviewed_at,
             u.name as reviewer_name, sub_u.name as submitter_name
      FROM weekly_submissions ws
      LEFT JOIN users u ON ws.reviewer_id = u.id
      LEFT JOIN users sub_u ON ws.submitted_by = sub_u.id
      WHERE ws.team_id = ?
      ORDER BY ws.week DESC, ws.created_at DESC
    `).all(teamId) as any[];

    const formattedSubmissions = submissions.map((s) => ({
      ...s,
      attachments: s.attachments ? JSON.parse(s.attachments) : []
    }));

    const feedbackHistory = db.prepare(`
      SELECT fh.id, fh.submission_id, fh.status, fh.feedback, fh.created_at,
             u.name as reviewer_name, ws.week as submission_week
      FROM feedback_history fh
      JOIN weekly_submissions ws ON fh.submission_id = ws.id
      LEFT JOIN users u ON fh.reviewer_id = u.id
      WHERE ws.team_id = ?
      ORDER BY fh.created_at DESC
    `).all(teamId) as any[];

    res.json({
      success: true,
      data: {
        team: {
          id: team.id,
          name: team.name,
          yearCohort: team.year_cohort,
          department: team.department,
          status: team.status,
          leader: {
            id: team.leader_id,
            name: team.leader_name,
            email: team.leader_email,
            avatar: team.leader_avatar
          }
        },
        project: team.project_id
          ? {
              id: team.project_id,
              title: team.project_title,
              description: team.project_description,
              techStack: team.tech_stack ? JSON.parse(team.tech_stack) : [],
              repoUrl: team.repo_url,
              progress: team.progress,
              status: team.project_status,
              deadline: team.project_deadline,
              milestones
            }
          : null,
        members,
        submissions: formattedSubmissions,
        feedbackHistory
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMentorProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const mentorId = req.user?.id || '';
    const mentorEmail = (req.user?.email || '').toLowerCase();
    const { search, status } = req.query;

    let query = `
      SELECT p.id, p.title, p.description, p.tech_stack, p.repo_url, p.status, p.deadline, p.progress,
             t.id as team_id, t.name as team_name,
             u.name as leader_name
      FROM projects p
      JOIN teams t ON t.project_id = p.id
      LEFT JOIN users u ON t.leader_id = u.id
      WHERE (t.mentor_id = ? OR t.mentor_id IN (SELECT id FROM users WHERE email = ? COLLATE NOCASE))
    `;
    const params: any[] = [mentorId, mentorEmail];

    if (search) {
      query += ` AND (p.title LIKE ? OR p.description LIKE ? OR t.name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (status && status !== 'all') {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY p.progress DESC`;

    const projects = db.prepare(query).all(...params) as any[];

    const formatted = projects.map((p) => ({
      ...p,
      techStack: p.tech_stack ? JSON.parse(p.tech_stack) : []
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMentorReviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const mentorId = req.user?.id || '';
    const { status } = req.query;

    let query = `
      SELECT ws.id, ws.week, ws.date, ws.work_completed, ws.current_work, ws.blockers, ws.next_week_goals,
             ws.repo_url, ws.attachments, ws.status, ws.feedback, ws.reviewed_at, ws.created_at,
             t.id as team_id, t.name as team_name,
             p.title as project_title,
             u.name as leader_name
      FROM weekly_submissions ws
      JOIN teams t ON ws.team_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.leader_id = u.id
      WHERE t.mentor_id = ?
    `;
    const params: any[] = [mentorId];

    if (status && status !== 'all') {
      query += ` AND ws.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY ws.created_at DESC`;

    const submissions = db.prepare(query).all(...params) as any[];

    const formatted = submissions.map((s) => ({
      ...s,
      attachments: s.attachments ? JSON.parse(s.attachments) : []
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitMentorReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, feedback } = req.body;
    const mentorId = req.user?.id || '';

    if (!['APPROVE', 'CHANGES_REQUESTED'].includes(action)) {
      res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVE or CHANGES_REQUESTED.' });
      return;
    }

    if (action === 'CHANGES_REQUESTED' && (!feedback || !feedback.trim())) {
      res.status(400).json({ success: false, message: 'Feedback is required when requesting changes.' });
      return;
    }

    const submission = db.prepare(`
      SELECT ws.id, ws.team_id, ws.project_id, ws.week, t.name as team_name, t.mentor_id
      FROM weekly_submissions ws
      JOIN teams t ON ws.team_id = t.id
      WHERE ws.id = ?
    `).get(id) as any;

    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission not found' });
      return;
    }

    if (submission.mentor_id !== mentorId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Access denied: You are not the assigned mentor for this team' });
      return;
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'CHANGES_REQUESTED';
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE weekly_submissions
      SET status = ?, feedback = ?, reviewer_id = ?, reviewed_at = ?
      WHERE id = ?
    `).run(newStatus, feedback || 'Approved without additional comments.', mentorId, now, id);

    const feedbackId = `fb_${Date.now()}`;
    db.prepare(`
      INSERT INTO feedback_history (id, submission_id, reviewer_id, status, feedback, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(feedbackId, id, mentorId, newStatus, feedback || 'Approved', now);

    if (submission.project_id) {
      if (action === 'APPROVE') {
        db.prepare(`
          UPDATE projects
          SET status = 'ON_TRACK',
              progress = MIN(100, progress + 5)
          WHERE id = ?
        `).run(submission.project_id);
      } else {
        db.prepare(`
          UPDATE projects
          SET status = 'NEEDS_ATTENTION'
          WHERE id = ?
        `).run(submission.project_id);
      }
    }

    const actId = `act_${Date.now()}`;
    const actDesc = `${req.user?.name || 'Mentor'} reviewed ${submission.team_name} Week ${submission.week} submission: ${newStatus}`;
    db.prepare(`
      INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(actId, mentorId, 'REVIEW_COMPLETED', actDesc, 'submission', id, now);

    const members = db.prepare('SELECT user_id FROM team_members WHERE team_id = ?').all(submission.team_id) as any[];
    const notifTitle = action === 'APPROVE' ? 'Weekly Submission Approved' : 'Changes Requested on Submission';
    const notifMsg = `Mentor ${req.user?.name || 'Mentor'} reviewed Week ${submission.week}: "${feedback || 'Approved'}"`;

    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `);

    for (const m of members) {
      insertNotif.run(`notif_${Date.now()}_${m.user_id}`, m.user_id, notifTitle, notifMsg, 'review', '/student/dashboard', now);
    }

    res.json({
      success: true,
      message: `Submission marked as ${newStatus}`,
      data: { id, status: newStatus, feedback, reviewedAt: now }
    });
  } catch (error: any) {
    console.error('[Submit Review Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMentorMeetings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const mentorId = req.user?.id || '';
    const meetings = db.prepare(`
      SELECT m.id, m.title, m.date, m.time, m.link_or_location, m.notes, m.status, m.created_at,
             t.id as team_id, t.name as team_name
      FROM meetings m
      JOIN teams t ON m.team_id = t.id
      WHERE m.mentor_id = ?
      ORDER BY m.date ASC, m.time ASC
    `).all(mentorId) as any[];

    res.json({ success: true, count: meetings.length, data: meetings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const scheduleMentorMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const mentorId = req.user?.id || '';
    const { teamId, title, date, time, linkOrLocation, notes } = req.body;

    if (!teamId || !title || !date || !time || !linkOrLocation) {
      res.status(400).json({
        success: false,
        message: 'Team, title, date, time, and location/link are required.'
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(date) < today) {
      res.status(400).json({ success: false, message: 'Meeting date cannot be in the past.' });
      return;
    }

    const team = db.prepare('SELECT id, name, mentor_id FROM teams WHERE id = ?').get(teamId) as any;
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    if (team.mentor_id !== mentorId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'You can only schedule meetings with your assigned teams.' });
      return;
    }

    const meetingId = `meet_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO meetings (id, team_id, mentor_id, title, date, time, link_or_location, notes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?)
    `).run(meetingId, teamId, mentorId, title.trim(), date, time.trim(), linkOrLocation.trim(), notes?.trim() || null, now);

    db.prepare(`
      INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(`act_${Date.now()}`, mentorId, 'MEETING_SCHEDULED', `${req.user?.name || 'Mentor'} scheduled meeting with ${team.name} on ${date}`, 'meeting', meetingId, now);

    const members = db.prepare('SELECT user_id FROM team_members WHERE team_id = ?').all(teamId) as any[];
    const notifTitle = 'New Meeting Scheduled';
    const notifMsg = `Mentor ${req.user?.name || 'Mentor'} scheduled: "${title}" on ${date} at ${time}`;

    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `);

    for (const m of members) {
      insertNotif.run(`notif_${Date.now()}_${m.user_id}`, m.user_id, notifTitle, notifMsg, 'meeting', '/student/dashboard', now);
    }

    res.status(201).json({
      success: true,
      message: 'Meeting scheduled successfully',
      data: {
        id: meetingId,
        teamId,
        teamName: team.name,
        title,
        date,
        time,
        linkOrLocation,
        notes,
        status: 'upcoming'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMentorNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const mentorId = req.user?.id || '';

    const notifications = db.prepare(`
      SELECT id, title, message, type, is_read, link, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(mentorId) as any[];

    const announcements = db.prepare(`
      SELECT a.id, a.title, a.message, a.audience, a.created_at, u.name as author_name
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.audience IN ('all', 'mentors')
      ORDER BY a.created_at DESC
    `).all() as any[];

    const unreadCount = notifications.filter((n) => n.is_read === 0).length;

    res.json({
      success: true,
      data: {
        notifications,
        announcements,
        unreadCount
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const mentorId = req.user?.id || '';

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, mentorId);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMentorProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const mentorId = req.user?.id || '';
    const { department, title, bio, phone, name } = req.body;

    if (!department) {
      res.status(400).json({ success: false, message: 'Department is required' });
      return;
    }

    if (name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), mentorId);
    }

    const profile = db.prepare('SELECT id FROM mentor_profiles WHERE user_id = ?').get(mentorId) as any;
    if (profile) {
      db.prepare(`
        UPDATE mentor_profiles
        SET department = ?, title = ?, bio = ?, phone = ?
        WHERE user_id = ?
      `).run(department.trim(), title?.trim() || null, bio?.trim() || null, phone?.trim() || null, mentorId);
    } else {
      db.prepare(`
        INSERT INTO mentor_profiles (id, user_id, department, title, bio, phone)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(`mp_${Date.now()}`, mentorId, department.trim(), title?.trim() || null, bio?.trim() || null, phone?.trim() || null);
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
