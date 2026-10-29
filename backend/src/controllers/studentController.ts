import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../db/database';
import { User } from '../models/User';
import { Team } from '../models/Team';
import { Project } from '../models/Project';
import { Progress } from '../models/Progress';

export const getStudentDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id || '';
    const studentEmail = req.user?.email ? req.user.email.toLowerCase() : '';
    const isMongoReady = mongoose.connection.readyState === 1;

    let studentProfile = {
      id: req.user?.id || '',
      name: req.user?.name || 'Student',
      email: req.user?.email || '',
      role: 'student',
      department: req.user?.department || 'Computer Science',
      year: req.user?.year || '3rd Year',
      college: req.user?.college || 'College of Engineering & Technology',
      avatar: req.user?.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80`
    };

    // 1. Try MongoDB Atlas if connected
    if (isMongoReady) {
      try {
        let userDoc = null;
        if (mongoose.Types.ObjectId.isValid(studentId)) {
          userDoc = await User.findById(studentId);
        }
        if (!userDoc && studentEmail) {
          userDoc = await User.findOne({ email: studentEmail });
        }

        if (userDoc) {
          studentProfile = {
            id: userDoc._id.toString(),
            name: userDoc.name,
            email: userDoc.email,
            role: userDoc.role.toLowerCase(),
            department: userDoc.department || studentProfile.department,
            year: userDoc.year || studentProfile.year,
            college: userDoc.college || studentProfile.college,
            avatar: userDoc.avatar || studentProfile.avatar
          };
        }

        const effectiveId = userDoc ? userDoc._id : (mongoose.Types.ObjectId.isValid(studentId) ? new mongoose.Types.ObjectId(studentId) : null);

        if (effectiveId) {
          const teamDoc = await Team.findOne({
            $or: [{ leaderId: effectiveId }, { memberIds: effectiveId }]
          })
            .populate('mentorId', 'name email avatar')
            .populate('memberIds', 'name email avatar role')
            .populate('leaderId', 'name email avatar role');

          if (teamDoc) {
            let projectDoc = await Project.findOne({ teamId: teamDoc._id });
            if (!projectDoc) {
              projectDoc = await Project.create({
                title: `${teamDoc.name} Project`,
                description: `Workspace for ${teamDoc.name}`,
                techStack: ['React', 'TypeScript', 'Node.js'],
                teamId: teamDoc._id,
                deadline: new Date(Date.now() + 60 * 24 * 3600 * 1000),
                progressPercentage: 10,
                status: 'ON_TRACK',
                milestones: [
                  { title: 'Project Proposal & Requirement Specs', status: 'Completed' },
                  { title: 'System Architecture & Database Design', status: 'In Progress' },
                  { title: 'Core Functionality & API Pipeline', status: 'Pending' },
                  { title: 'UI Polish, Review & Deployment', status: 'Pending' }
                ]
              });
            }

            const progressDocs = await Progress.find({ teamId: teamDoc._id }).sort({ weekNumber: -1, submissionDate: -1 });

            const mentorObj = teamDoc.mentorId as any;
            const leaderObj = teamDoc.leaderId as any;

            res.json({
              success: true,
              data: {
                hasTeam: true,
                studentProfile,
                team: {
                  id: teamDoc._id.toString(),
                  name: teamDoc.name,
                  yearCohort: teamDoc.yearCohort,
                  department: teamDoc.department,
                  mentor_id: mentorObj?._id ? mentorObj._id.toString() : null,
                  mentorName: mentorObj?.name || 'Unassigned Faculty',
                  mentorEmail: mentorObj?.email || '',
                  role: teamDoc.leaderId?.toString() === effectiveId.toString() ? 'Team Leader' : 'Member',
                  members: (teamDoc.memberIds as any[]).map((m) => ({
                    id: m._id ? m._id.toString() : String(m),
                    name: m.name || 'Student Member',
                    email: m.email || '',
                    avatar: m.avatar,
                    role: (m._id ? m._id.toString() : String(m)) === teamDoc.leaderId?.toString() ? 'Team Leader' : 'Member'
                  }))
                },
                project: {
                  id: projectDoc._id.toString(),
                  title: projectDoc.title,
                  description: projectDoc.description,
                  techStack: projectDoc.techStack || ['React', 'TypeScript', 'Node.js'],
                  repoUrl: projectDoc.githubUrl || '',
                  progressPercentage: projectDoc.progressPercentage || 10,
                  status: projectDoc.status || 'ON_TRACK',
                  currentPhase: projectDoc.currentPhase || 'Design & Architecture',
                  deadline: projectDoc.deadline ? projectDoc.deadline.toISOString().slice(0, 10) : new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10),
                  milestones: (projectDoc.milestones || []).map((ms: any) => ({
                    id: ms._id ? ms._id.toString() : ms.id,
                    title: ms.title,
                    status: ms.status,
                    targetDate: ms.targetDate ? ms.targetDate.toISOString().slice(0, 10) : undefined
                  }))
                },
                submissions: progressDocs.map((sub: any) => ({
                  id: sub._id.toString(),
                  week: sub.weekNumber,
                  date: sub.submissionDate ? sub.submissionDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                  work_completed: (sub.completedTasks || []).join('\n'),
                  current_work: (sub.currentWork || []).join('\n'),
                  blockers: (sub.blockers || []).join('\n'),
                  next_week_goals: (sub.nextWeekGoals || []).join('\n'),
                  repo_url: sub.githubUrl || '',
                  attachments: sub.files || [],
                  status: sub.status === 'APPROVED' ? 'Approved' : sub.status === 'NEEDS_IMPROVEMENT' ? 'Changes requested' : 'Submitted'
                })),
                announcements: [],
                meetings: []
              }
            });
            return;
          }
        }
      } catch (mErr) {
        console.warn('[MongoDB Student Dashboard Notice]', mErr);
      }
    }

    // 2. Local Fallback via SQLite
    // Try to load student profile details from student_profiles table
    try {
      const sp = db.prepare('SELECT department, year_cohort FROM student_profiles WHERE user_id = ? OR user_id IN (SELECT id FROM users WHERE email = ? COLLATE NOCASE)').get(studentId, studentEmail) as any;
      if (sp) {
        studentProfile.department = sp.department || studentProfile.department;
        studentProfile.year = sp.year_cohort || studentProfile.year;
      }
    } catch {}

    // Find student's team membership in SQLite (checking both ID and email)
    let membership: any = null;
    try {
      membership = db.prepare(`
        SELECT tm.team_id, tm.role as team_role,
               t.id as actual_team_id, t.name as team_name, t.year_cohort, t.department, t.mentor_id, t.project_id,
               p.title as project_title, p.description as project_description, p.tech_stack,
               p.repo_url, p.progress, p.status as project_status, p.deadline as project_deadline,
               mu.name as mentor_name, mu.email as mentor_email
        FROM teams t
        LEFT JOIN team_members tm ON tm.team_id = t.id
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users mu ON t.mentor_id = mu.id
        WHERE tm.user_id = ?
           OR t.leader_id = ?
           OR tm.user_id IN (SELECT id FROM users WHERE email = ? COLLATE NOCASE)
           OR t.leader_id IN (SELECT id FROM users WHERE email = ? COLLATE NOCASE)
        LIMIT 1
      `).get(studentId, studentId, studentEmail, studentEmail) as any;
    } catch {}

    if (!membership) {
      res.json({
        success: true,
        data: {
          hasTeam: false,
          studentProfile,
          team: null,
          project: null,
          submissions: [],
          announcements: []
        }
      });
      return;
    }

    const effectiveTeamId = membership.team_id || membership.actual_team_id;

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
    let members = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar, tm.role
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
    `).all(effectiveTeamId) as any[];

    if (!members || members.length === 0) {
      members = [{
        id: studentProfile.id,
        name: studentProfile.name,
        email: studentProfile.email,
        avatar: studentProfile.avatar,
        role: 'Team Leader'
      }];
    }

    // Submissions
    const submissions = db.prepare(`
      SELECT ws.id, ws.week, ws.date, ws.work_completed, ws.current_work, ws.blockers, ws.next_week_goals,
             ws.repo_url, ws.attachments, ws.status, ws.feedback, ws.reviewed_at,
             u.name as reviewer_name
      FROM weekly_submissions ws
      LEFT JOIN users u ON ws.reviewer_id = u.id
      WHERE ws.team_id = ?
      ORDER BY ws.week DESC, ws.created_at DESC
    `).all(effectiveTeamId) as any[];

    const formattedSubmissions = submissions.map((s) => ({
      ...s,
      attachments: s.attachments ? (typeof s.attachments === 'string' ? JSON.parse(s.attachments) : s.attachments) : []
    }));

    // Announcements
    let announcements: any[] = [];
    try {
      announcements = db.prepare(`
        SELECT id, title, message, audience, created_at
        FROM announcements
        WHERE audience IN ('all', 'students')
        ORDER BY created_at DESC
        LIMIT 5
      `).all() as any[];
    } catch {}

    // Upcoming Meetings
    let meetings: any[] = [];
    try {
      meetings = db.prepare(`
        SELECT m.id, m.title, m.date, m.time, m.link_or_location, m.notes,
               u.name as mentor_name
        FROM meetings m
        JOIN users u ON m.mentor_id = u.id
        WHERE m.team_id = ? AND m.status = 'upcoming' AND m.date >= date('now')
        ORDER BY m.date ASC
      `).all(effectiveTeamId) as any[];
    } catch {}

    res.json({
      success: true,
      data: {
        hasTeam: true,
        studentProfile,
        team: {
          id: effectiveTeamId,
          name: membership.team_name,
          yearCohort: membership.year_cohort,
          department: membership.department,
          mentor_id: membership.mentor_id || '',
          mentorName: membership.mentor_name || 'Unassigned Faculty',
          mentorEmail: membership.mentor_email || '',
          role: membership.team_role || 'Team Leader',
          members
        },
        project: {
          id: membership.project_id || `proj_${effectiveTeamId}`,
          title: membership.project_title || `${membership.team_name} Project`,
          description: membership.project_description || `Workspace for ${membership.team_name}`,
          techStack: membership.tech_stack ? (typeof membership.tech_stack === 'string' ? JSON.parse(membership.tech_stack) : membership.tech_stack) : ['React', 'TypeScript', 'Node.js'],
          repoUrl: membership.repo_url || '',
          progressPercentage: membership.progress || 10,
          status: membership.project_status || 'ON_TRACK',
          deadline: membership.project_deadline || new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          milestones: milestones.length > 0 ? milestones : [
            { id: 'm1', title: 'Project Proposal & Requirement Specs', status: 'Completed', deadline: new Date().toISOString().slice(0, 10) },
            { id: 'm2', title: 'System Architecture & Database Design', status: 'In Progress', deadline: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10) },
            { id: 'm3', title: 'Core Functionality & API Pipeline', status: 'Pending', deadline: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10) },
            { id: 'm4', title: 'UI Polish, Review & Deployment', status: 'Pending', deadline: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10) }
          ]
        },
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

    const isMongoReady = mongoose.connection.readyState === 1;

    // Dual-store: Mongo submission
    if (isMongoReady) {
      try {
        const studentUser = await User.findById(studentId) || (req.user?.email ? await User.findOne({ email: req.user.email.toLowerCase() }) : null);
        const effectiveId = studentUser ? studentUser._id : studentId;

        const teamDoc = await Team.findOne({
          $or: [{ leaderId: effectiveId }, { memberIds: effectiveId }]
        });

        if (teamDoc) {
          const projectDoc = await Project.findOne({ teamId: teamDoc._id });
          await Progress.create({
            teamId: teamDoc._id,
            projectId: projectDoc?._id || new mongoose.Types.ObjectId(),
            weekNumber: Number(weekNumber) || 1,
            completedTasks: Array.isArray(completedTasks) ? completedTasks : (completedTasks ? [completedTasks] : []),
            currentWork: Array.isArray(currentWork) ? currentWork : (currentWork ? [currentWork] : []),
            blockers: Array.isArray(blockers) ? blockers : (blockers ? [blockers] : []),
            nextWeekGoals: Array.isArray(nextWeekGoals) ? nextWeekGoals : (nextWeekGoals ? [nextWeekGoals] : []),
            files: attachments || files || [],
            githubUrl: repoUrl || githubUrl || '',
            submittedBy: effectiveId,
            status: 'SUBMITTED'
          });
        }
      } catch (mErr) {
        console.warn('[MongoDB Progress Submit Notice]', mErr);
      }
    }

    // Dual-store: SQLite submission
    const membership = db.prepare(`
      SELECT tm.team_id, t.project_id, t.mentor_id, t.name as team_name
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = ?
    `).get(studentId) as any;

    if (!membership && !isMongoReady) {
      res.status(400).json({ success: false, message: 'You must be part of a team to submit progress.' });
      return;
    }

    if (membership) {
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
      try {
        db.prepare(`
          INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
          VALUES (?, ?, 'PROGRESS_SUBMITTED', ?, 'submission', ?, ?)
        `).run(`act_${Date.now()}`, studentId, `${membership.team_name} submitted Week ${weekNumber} progress report`, subId, now);
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
    const studentEmail = req.user?.email ? req.user.email.toLowerCase() : '';
    const { name, projectTitle, description, techStack, yearCohort, department, githubUrl } = req.body;

    if (!name?.trim() || !projectTitle?.trim()) {
      res.status(400).json({ success: false, message: 'Team Name and Project Title are required.' });
      return;
    }

    const isMongoReady = mongoose.connection.readyState === 1;
    let mongoTeamId: string | null = null;
    let mongoProjectId: string | null = null;

    // 1. Persist to MongoDB Atlas if connected
    if (isMongoReady) {
      try {
        let studentUser = null;
        if (mongoose.Types.ObjectId.isValid(studentId)) {
          studentUser = await User.findById(studentId);
        }
        if (!studentUser && studentEmail) {
          studentUser = await User.findOne({ email: studentEmail });
        }
        const effectiveId = studentUser ? studentUser._id : (mongoose.Types.ObjectId.isValid(studentId) ? new mongoose.Types.ObjectId(studentId) : null);

        if (effectiveId) {
          // Check if already in a team
          const existingTeam = await Team.findOne({
            $or: [{ leaderId: effectiveId }, { memberIds: effectiveId }]
          });

          if (!existingTeam) {
            const newTeam = await Team.create({
              name: name.trim(),
              yearCohort: yearCohort || req.user?.year || '3rd Year',
              leaderId: effectiveId,
              memberIds: [effectiveId],
              mentorId: null, // Admin assigns mentor later
              department: department || req.user?.department || 'Computer Science'
            });

            const newProject = await Project.create({
              title: projectTitle.trim(),
              description: description?.trim() || `Workspace for ${projectTitle.trim()}`,
              techStack: Array.isArray(techStack) ? techStack : (techStack ? techStack.split(',').map((s: string) => s.trim()) : ['React', 'TypeScript', 'Node.js']),
              teamId: newTeam._id,
              githubUrl: githubUrl?.trim() || '',
              currentPhase: 'Design & Architecture',
              deadline: new Date(Date.now() + 60 * 24 * 3600 * 1000),
              progressPercentage: 10,
              milestones: [
                { title: 'Project Proposal & Requirement Specs', status: 'Completed' },
                { title: 'System Architecture & Database Design', status: 'In Progress' },
                { title: 'Core Functionality & API Pipeline', status: 'Pending' },
                { title: 'UI Polish, Review & Deployment', status: 'Pending' }
              ]
            });

            mongoTeamId = newTeam._id.toString();
            mongoProjectId = newProject._id.toString();
          }
        }
      } catch (mErr) {
        console.warn('[MongoDB createStudentTeam notice]', mErr);
      }
    }

    // 2. Persist to SQLite (Dual-write)
    const teamId = mongoTeamId || `team_${Date.now()}`;
    const projId = mongoProjectId || `proj_${Date.now()}`;
    const now = new Date().toISOString();
    const deadlineDate = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const techArray = Array.isArray(techStack) ? techStack : (techStack ? techStack.split(',').map((s: string) => s.trim()) : ['React', 'TypeScript', 'Node.js']);

    try {
      // Ensure the student exists in SQLite users table to satisfy foreign keys
      let sqliteLeaderId = studentId;
      const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(studentId) as any;
      if (existingUser) {
        sqliteLeaderId = existingUser.id;
      } else if (studentEmail) {
        const userByEmail = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(studentEmail) as any;
        if (userByEmail) {
          sqliteLeaderId = userByEmail.id;
        } else {
          db.prepare(`
            INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status, avatar)
            VALUES (?, ?, ?, 'managed_auth', 'student', 'active', ?)
          `).run(
            studentId,
            req.user?.name || 'Student',
            studentEmail,
            req.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80'
          );
          sqliteLeaderId = studentId;
        }
      }

      db.prepare(`
        INSERT OR REPLACE INTO projects (id, title, description, tech_stack, repo_url, status, deadline, progress, created_at)
        VALUES (?, ?, ?, ?, ?, 'ON_TRACK', ?, 10, ?)
      `).run(
        projId,
        projectTitle.trim(),
        description?.trim() || `Workspace for ${projectTitle.trim()} by ${name.trim()}`,
        JSON.stringify(techArray),
        githubUrl?.trim() || '',
        deadlineDate,
        now
      );

      db.prepare(`
        INSERT OR REPLACE INTO teams (id, name, leader_id, mentor_id, project_id, year_cohort, department, status, created_at)
        VALUES (?, ?, ?, NULL, ?, ?, ?, 'active', ?)
      `).run(
        teamId,
        name.trim(),
        sqliteLeaderId,
        projId,
        yearCohort || req.user?.year || '3rd Year',
        department || req.user?.department || 'Computer Science',
        now
      );

      db.prepare(`
        INSERT OR REPLACE INTO team_members (id, team_id, user_id, role, created_at)
        VALUES (?, ?, ?, 'Team Leader', ?)
      `).run(`tm_${teamId}_${sqliteLeaderId}`, teamId, sqliteLeaderId, now);

      const milestones = [
        { id: `m1_${Date.now()}`, title: 'Project Proposal & Requirement Specs', status: 'Completed', order: 1 },
        { id: `m2_${Date.now()}`, title: 'System Architecture & Database Design', status: 'In Progress', order: 2 },
        { id: `m3_${Date.now()}`, title: 'Core Functionality & API Pipeline', status: 'Pending', order: 3 },
        { id: `m4_${Date.now()}`, title: 'UI Polish, Review & Deployment', status: 'Pending', order: 4 }
      ];

      for (const m of milestones) {
        db.prepare(`
          INSERT OR REPLACE INTO milestones (id, project_id, title, deadline, status, order_index)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(m.id, projId, m.title, deadlineDate, m.status, m.order);
      }
    } catch (sqlErr) {
      console.warn('[SQLite create team notice]', sqlErr);
    }

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
    const studentEmail = req.user?.email ? req.user.email.toLowerCase() : '';
    const isMongoReady = mongoose.connection.readyState === 1;

    let combinedTeams: any[] = [];
    const seenNames = new Set<string>();

    // 1. Try Mongo Teams
    if (isMongoReady) {
      try {
        const mongoTeams = await Team.find()
          .populate('leaderId', 'name email avatar')
          .populate('mentorId', 'name email');

        for (const t of mongoTeams) {
          const tName = (t.name || '').trim().toLowerCase();
          seenNames.add(tName);
          const proj = await Project.findOne({ teamId: t._id });
          const leaderIdStr = (t.leaderId as any)?._id?.toString() || (t.leaderId as any)?.toString();
          const leaderEmailStr = (t.leaderId as any)?.email?.toLowerCase();
          const isMyTeam = leaderIdStr === studentId ||
            (studentEmail && leaderEmailStr === studentEmail) ||
            (t.memberIds || []).some((m: any) => {
              const mId = m?._id ? m._id.toString() : m.toString();
              const mEmail = m?.email?.toLowerCase();
              return mId === studentId || (studentEmail && mEmail === studentEmail);
            });

          combinedTeams.push({
            id: t._id.toString(),
            name: t.name,
            yearCohort: t.yearCohort,
            department: t.department,
            status: 'active',
            project_id: proj?._id?.toString(),
            projectTitle: proj?.title || `${t.name} Project`,
            progressPercentage: proj?.progressPercentage || 10,
            projectStatus: proj?.status || 'ON_TRACK',
            leader_id: leaderIdStr,
            leaderName: (t.leaderId as any)?.name || 'Student Leader',
            mentor_id: (t.mentorId as any)?._id?.toString() || null,
            mentorName: (t.mentorId as any)?.name || 'Unassigned Faculty',
            memberCount: (t.memberIds || []).length || 1,
            isMyTeam: isMyTeam ? 1 : 0
          });
        }
      } catch (mErr) {
        console.warn('[MongoDB getStudentTeams notice]', mErr);
      }
    }

    // 2. Fallback / Merge with SQLite
    try {
      const sqlTeams = db.prepare(`
        SELECT t.id, t.name, t.year_cohort as yearCohort, t.department, t.status,
               p.id as project_id, p.title as projectTitle, p.progress as progressPercentage, p.status as projectStatus,
               u.id as leader_id, u.name as leaderName,
               mu.id as mentor_id, mu.name as mentorName,
               (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as memberCount,
               (SELECT COUNT(*) FROM team_members WHERE team_id = t.id AND (user_id = ? OR user_id IN (SELECT id FROM users WHERE email = ? COLLATE NOCASE))) as isMember,
               CASE WHEN t.leader_id = ? OR t.leader_id IN (SELECT id FROM users WHERE email = ? COLLATE NOCASE) THEN 1 ELSE 0 END as isLeader
        FROM teams t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u ON t.leader_id = u.id
        LEFT JOIN users mu ON t.mentor_id = mu.id
        WHERE t.status = 'active'
        ORDER BY t.created_at DESC
      `).all(studentId, studentEmail, studentId, studentEmail) as any[];

      for (const st of sqlTeams) {
        const tName = (st.name || '').trim().toLowerCase();
        if (!seenNames.has(tName)) {
          seenNames.add(tName);
          combinedTeams.push({
            id: st.id,
            name: st.name,
            yearCohort: st.yearCohort,
            department: st.department,
            status: 'active',
            project_id: st.project_id,
            projectTitle: st.projectTitle || `${st.name} Project`,
            progressPercentage: st.progressPercentage || 10,
            projectStatus: st.projectStatus || 'ON_TRACK',
            leader_id: st.leader_id,
            leaderName: st.leaderName || 'Student Leader',
            mentor_id: st.mentor_id || null,
            mentorName: st.mentorName || 'Unassigned Faculty',
            memberCount: st.memberCount || 1,
            isMyTeam: (st.isMember > 0 || st.isLeader > 0) ? 1 : 0
          });
        }
      }
    } catch (sqlErr) {
      console.warn('[SQLite getStudentTeams notice]', sqlErr);
    }

    res.json({ success: true, count: combinedTeams.length, data: combinedTeams });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const joinStudentTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id || '';
    const { teamId } = req.params;
    const isMongoReady = mongoose.connection.readyState === 1;

    // Dual-store: Mongo Join
    if (isMongoReady && mongoose.Types.ObjectId.isValid(teamId)) {
      try {
        const studentUser = await User.findById(studentId) || (req.user?.email ? await User.findOne({ email: req.user.email.toLowerCase() }) : null);
        const effectiveId = studentUser ? studentUser._id : (mongoose.Types.ObjectId.isValid(studentId) ? new mongoose.Types.ObjectId(studentId) : null);

        if (effectiveId) {
          await Team.findByIdAndUpdate(teamId, {
            $addToSet: { memberIds: effectiveId }
          });
        }
      } catch (mErr) {
        console.warn('[MongoDB joinStudentTeam notice]', mErr);
      }
    }

    // Dual-store: SQLite Join
    let teamName = 'Team';
    try {
      const team = db.prepare('SELECT id, name FROM teams WHERE id = ?').get(teamId) as any;
      if (team) {
        teamName = team.name;
        const alreadyMember = db.prepare('SELECT id FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, studentId) as any;
        if (!alreadyMember) {
          const now = new Date().toISOString();
          db.prepare(`
            INSERT INTO team_members (id, team_id, user_id, role, created_at)
            VALUES (?, ?, ?, 'Member', ?)
          `).run(`tm_${Date.now()}`, teamId, studentId, now);
        }
      }
    } catch (sqlErr) {
      console.warn('[SQLite joinStudentTeam notice]', sqlErr);
    }

    res.json({ success: true, message: `Successfully joined ${teamName}!` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
