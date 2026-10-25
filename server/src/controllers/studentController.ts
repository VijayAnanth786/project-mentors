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
    const {
      weekNumber,
      completedTasks,
      currentWork,
      blockers,
      nextWeekGoals,
      repoUrl,
      githubUrl,
      attachments,
      files
    } = req.body;

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
    const finalRepoUrl = repoUrl || githubUrl || '';
    const finalAttachments = attachments || files || [];

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
      finalRepoUrl,
      JSON.stringify(finalAttachments),
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

    // Also update project's last submission timestamp
    if (membership.project_id) {
      try {
        db.prepare(`UPDATE projects SET progress = MAX(progress, 15) WHERE id = ?`).run(membership.project_id);
      } catch {}
    }

    res.status(201).json({ success: true, message: 'Weekly progress report submitted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createStudentTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id || '';
    const { name, projectTitle, description, techStack, yearCohort, department, githubUrl } = req.body;

    if (!name?.trim() || !projectTitle?.trim()) {
      res.status(400).json({ success: false, message: 'Team Name and Project Title are required.' });
      return;
    }

    // Check if user is already leading or part of a team
    const existing = db.prepare('SELECT team_id FROM team_members WHERE user_id = ?').get(studentId) as any;
    if (existing) {
      res.status(400).json({ success: false, message: 'You are already a member of a team. Leave your current team first.' });
      return;
    }

    const teamId = `team_${Date.now()}`;
    const projId = `proj_${Date.now()}`;
    const now = new Date().toISOString();
    const deadlineDate = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const techArray = Array.isArray(techStack) ? techStack : (techStack ? techStack.split(',').map((s: string) => s.trim()) : ['React', 'TypeScript', 'Node.js']);

    // 1. Insert Project
    db.prepare(`
      INSERT INTO projects (id, title, description, tech_stack, repo_url, status, deadline, progress, created_at)
      VALUES (?, ?, ?, ?, ?, 'ON_TRACK', ?, 0, ?)
    `).run(
      projId,
      projectTitle.trim(),
      description?.trim() || `Workspace for ${projectTitle.trim()} by ${name.trim()}`,
      JSON.stringify(techArray),
      githubUrl?.trim() || '',
      deadlineDate,
      now
    );

    // 2. Insert Team
    db.prepare(`
      INSERT INTO teams (id, name, leader_id, mentor_id, project_id, year_cohort, department, status, created_at)
      VALUES (?, ?, ?, NULL, ?, ?, ?, 'active', ?)
    `).run(
      teamId,
      name.trim(),
      studentId,
      projId,
      yearCohort || '3rd Year',
      department || req.user?.department || 'Computer Science',
      now
    );

    // 3. Add Leader to Team Members
    db.prepare(`
      INSERT INTO team_members (id, team_id, user_id, role, created_at)
      VALUES (?, ?, ?, 'Team Leader', ?)
    `).run(`tm_${Date.now()}`, teamId, studentId, now);

    // 4. Default Project Milestones
    const milestones = [
      { id: `m1_${Date.now()}`, title: 'System Architecture & Database Design', status: 'In Progress', order: 1 },
      { id: `m2_${Date.now()}`, title: 'Core Functionality & API Pipeline', status: 'Pending', order: 2 },
      { id: `m3_${Date.now()}`, title: 'User Interface & Testing Integration', status: 'Pending', order: 3 },
      { id: `m4_${Date.now()}`, title: 'End-to-End Validation & Final Demo', status: 'Pending', order: 4 }
    ];

    for (const m of milestones) {
      db.prepare(`
        INSERT INTO milestones (id, project_id, title, deadline, status, order_index)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(m.id, projId, m.title, deadlineDate, m.status, m.order);
    }

    // 5. Activity Event
    db.prepare(`
      INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
      VALUES (?, ?, 'TEAM_CREATED', ?, 'team', ?, ?)
    `).run(`act_${Date.now()}`, studentId, `${req.user?.name || 'Student'} formed team "${name.trim()}" for project "${projectTitle.trim()}"`, teamId, now);

    res.status(201).json({
      success: true,
      message: 'Team and project created successfully!',
      data: {
        teamId,
        projectId: projId,
        name: name.trim(),
        projectTitle: projectTitle.trim()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentTeams = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id || '';

    const teams = db.prepare(`
      SELECT t.id, t.name, t.year_cohort as yearCohort, t.department, t.status,
             p.id as project_id, p.title as projectTitle, p.progress as progressPercentage, p.status as projectStatus,
             u.id as leader_id, u.name as leaderName,
             mu.id as mentor_id, mu.name as mentorName,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as memberCount,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id AND user_id = ?) as isMyTeam
      FROM teams t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.leader_id = u.id
      LEFT JOIN users mu ON t.mentor_id = mu.id
      WHERE t.status = 'active'
      ORDER BY t.created_at DESC
    `).all(studentId) as any[];

    res.json({ success: true, count: teams.length, data: teams });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const joinStudentTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id || '';
    const { teamId } = req.params;

    const team = db.prepare('SELECT id, name FROM teams WHERE id = ?').get(teamId) as any;
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found.' });
      return;
    }

    // Check if already in this team
    const alreadyMember = db.prepare('SELECT id FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, studentId) as any;
    if (alreadyMember) {
      res.json({ success: true, message: 'You are already a member of this team.' });
      return;
    }

    // Check if in another team
    const inOtherTeam = db.prepare('SELECT team_id FROM team_members WHERE user_id = ?').get(studentId) as any;
    if (inOtherTeam) {
      res.status(400).json({ success: false, message: 'You are already enrolled in another team. Please leave your current team first.' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO team_members (id, team_id, user_id, role, created_at)
      VALUES (?, ?, ?, 'Member', ?)
    `).run(`tm_${Date.now()}`, teamId, studentId, now);

    db.prepare(`
      INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
      VALUES (?, ?, 'TEAM_JOINED', ?, 'team', ?, ?)
    `).run(`act_${Date.now()}`, studentId, `${req.user?.name || 'Student'} joined ${team.name}`, teamId, now);

    res.json({ success: true, message: `Successfully joined ${team.name}!` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

