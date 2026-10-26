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
        let userDoc = await User.findById(studentId);
        if (!userDoc && req.user?.email) {
          userDoc = await User.findOne({ email: req.user.email.toLowerCase() });
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
            .populate('mentorId', 'name email')
            .populate('memberIds', 'name email avatar role')
            .populate('leaderId', 'name email avatar role');

          if (teamDoc) {
            const projectDoc = await Project.findOne({ teamId: teamDoc._id });
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
                project: projectDoc
                  ? {
                      id: projectDoc._id.toString(),
                      title: projectDoc.title,
                      description: projectDoc.description,
                      techStack: projectDoc.techStack || [],
                      repoUrl: projectDoc.githubUrl,
                      progressPercentage: projectDoc.progressPercentage || 0,
                      status: projectDoc.status,
                      currentPhase: projectDoc.currentPhase,
                      deadline: projectDoc.deadline ? projectDoc.deadline.toISOString().slice(0, 10) : null,
                      milestones: (projectDoc.milestones || []).map((ms: any) => ({
                        id: ms._id ? ms._id.toString() : ms.id,
                        title: ms.title,
                        status: ms.status,
                        targetDate: ms.targetDate ? ms.targetDate.toISOString().slice(0, 10) : undefined
                      }))
                    }
                  : null,
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
      const sp = db.prepare('SELECT department, year_cohort FROM student_profiles WHERE user_id = ?').get(studentId) as any;
      if (sp) {
        studentProfile.department = sp.department || studentProfile.department;
        studentProfile.year = sp.year_cohort || studentProfile.year;
      }
    } catch {}

    // Find student's team membership in SQLite
    let membership: any = null;
    try {
      membership = db.prepare(`
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
      `).all(membership.team_id) as any[];
    } catch {}

    res.json({
      success: true,
      data: {
        hasTeam: true,
        studentProfile,
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
              techStack: membership.tech_stack ? (typeof membership.tech_stack === 'string' ? JSON.parse(membership.tech_stack) : membership.tech_stack) : [],
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
        const studentUser = await User.findById(studentId) || (req.user?.email ? await User.findOne({ email: req.user.email.toLowerCase() }) : null);
        const effectiveId = studentUser ? studentUser._id : (mongoose.Types.ObjectId.isValid(studentId) ? new mongoose.Types.ObjectId(studentId) : null);

        if (effectiveId) {
          // Check if already in a team
          const existingTeam = await Team.findOne({
            $or: [{ leaderId: effectiveId }, { memberIds: effectiveId }]
          });

          if (!existingTeam) {
            // Find an active faculty mentor to assign by default
            const defaultMentor = await User.findOne({ role: 'MENTOR' });
            const mentorId = defaultMentor ? defaultMentor._id : effectiveId;

            const newTeam = await Team.create({
              name: name.trim(),
              yearCohort: yearCohort || req.user?.year || '3rd Year',
              leaderId: effectiveId,
              memberIds: [effectiveId],
              mentorId,
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
      db.prepare(`
        INSERT INTO projects (id, title, description, tech_stack, repo_url, status, deadline, progress, created_at)
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
        INSERT INTO teams (id, name, leader_id, mentor_id, project_id, year_cohort, department, status, created_at)
        VALUES (?, ?, ?, NULL, ?, ?, ?, 'active', ?)
      `).run(
        teamId,
        name.trim(),
        studentId,
        projId,
        yearCohort || req.user?.year || '3rd Year',
        department || req.user?.department || 'Computer Science',
        now
      );

      db.prepare(`
        INSERT INTO team_members (id, team_id, user_id, role, created_at)
        VALUES (?, ?, ?, 'Team Leader', ?)
      `).run(`tm_${Date.now()}`, teamId, studentId, now);

      const milestones = [
        { id: `m1_${Date.now()}`, title: 'Project Proposal & Requirement Specs', status: 'Completed', order: 1 },
        { id: `m2_${Date.now()}`, title: 'System Architecture & Database Design', status: 'In Progress', order: 2 },
        { id: `m3_${Date.now()}`, title: 'Core Functionality & API Pipeline', status: 'Pending', order: 3 },
        { id: `m4_${Date.now()}`, title: 'UI Polish, Review & Deployment', status: 'Pending', order: 4 }
      ];

      for (const m of milestones) {
        db.prepare(`
          INSERT INTO milestones (id, project_id, title, deadline, status, order_index)
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
    const isMongoReady = mongoose.connection.readyState === 1;

    // 1. Try Mongo Teams
    if (isMongoReady) {
      try {
        const mongoTeams = await Team.find()
          .populate('leaderId', 'name email avatar')
          .populate('mentorId', 'name email');

        if (mongoTeams.length > 0) {
          const formatted = await Promise.all(mongoTeams.map(async (t: any) => {
            const proj = await Project.findOne({ teamId: t._id });
            const isMyTeam = t.leaderId?._id?.toString() === studentId ||
              (t.memberIds || []).some((m: any) => m.toString() === studentId);

            return {
              id: t._id.toString(),
              name: t.name,
              yearCohort: t.yearCohort,
              department: t.department,
              status: 'active',
              project_id: proj?._id?.toString(),
              projectTitle: proj?.title || `${t.name} Project`,
              progressPercentage: proj?.progressPercentage || 0,
              projectStatus: proj?.status || 'ON_TRACK',
              leader_id: t.leaderId?._id?.toString(),
              leaderName: t.leaderId?.name || 'Student Leader',
              mentor_id: t.mentorId?._id?.toString(),
              mentorName: t.mentorId?.name || 'Faculty Mentor',
              memberCount: (t.memberIds || []).length || 1,
              isMyTeam: isMyTeam ? 1 : 0
            };
          }));

          res.json({ success: true, count: formatted.length, data: formatted });
          return;
        }
      } catch (mErr) {
        console.warn('[MongoDB getStudentTeams notice]', mErr);
      }
    }

    // 2. Fallback to SQLite
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
