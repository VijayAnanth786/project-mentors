import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../db/database';
import {
  User,
  Team,
  Project,
  Progress,
  Review,
  Meeting,
  Announcement,
  Notification,
  ActivityEvent
} from '../models';

export const getMentorDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const mentorId = req.user?.id;
    const mentorEmail = (req.user?.email || '').toLowerCase();
    if (!mentorId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const isMongoReady = mongoose.connection.readyState === 1;

    // 1. Try MongoDB Atlas if connected
    if (isMongoReady) {
      try {
        let mUser = null;
        if (mongoose.Types.ObjectId.isValid(mentorId)) {
          mUser = await User.findById(mentorId);
        }
        if (!mUser && mentorEmail) {
          mUser = await User.findOne({ email: mentorEmail });
        }

        if (mUser) {
          const mongoAssignedTeams = await Team.find({ mentorId: mUser._id })
            .populate('leaderId', 'name email avatar')
            .populate('projectId')
            .lean();

          const teamIds = mongoAssignedTeams.map((t: any) => t._id);

          // Synchronize mentor assignment to local SQLite store for dual-engine resilience
          for (const mt of mongoAssignedTeams) {
            try {
              db.prepare('UPDATE teams SET mentor_id = ? WHERE id = ? OR name = ?').run(
                mentorId,
                mt._id.toString(),
                mt.name
              );
            } catch {}
          }

          let studentsGuidedCount = 0;
          for (const t of mongoAssignedTeams) {
            const memberList = (t as any).memberIds || [];
            studentsGuidedCount += memberList.length || 1;
          }

          const pendingReviewsCount = await Progress.countDocuments({
            teamId: { $in: teamIds },
            status: { $in: ['SUBMITTED', 'PENDING'] }
          });

          const upcomingMeetingsCount = await Meeting.countDocuments({
            mentorId: mUser._id,
            status: 'upcoming'
          });

          const now = new Date();
          const overdueSubmissionsCount = await Progress.countDocuments({
            teamId: { $in: teamIds },
            status: { $in: ['SUBMITTED', 'PENDING'] },
            submissionDate: { $lt: now }
          });

          // Fetch latest submission for each team
          const assignedTeamsWithLatest = await Promise.all(
            mongoAssignedTeams.map(async (team: any) => {
              const latestSub = await Progress.findOne({ teamId: team._id })
                .sort({ weekNumber: -1, submissionDate: -1 })
                .lean();

              const leader = team.leaderId as any;
              const proj = team.projectId as any;

              return {
                id: team._id.toString(),
                name: team.name,
                leaderName: leader?.name || 'Team Leader',
                leaderAvatar: leader?.avatar || null,
                project: {
                  id: proj ? proj._id.toString() : null,
                  title: proj?.title || 'Assigned Project',
                  progress: proj?.progressPercentage || 0,
                  status: proj?.status || 'ON_TRACK'
                },
                latestSubmission: latestSub
                  ? {
                      id: latestSub._id.toString(),
                      week: latestSub.weekNumber,
                      date: latestSub.submissionDate,
                      status: latestSub.status
                    }
                  : null
              };
            })
          );

          // Upcoming meetings
          const upcomingMeetingsDocs = await Meeting.find({
            mentorId: mUser._id,
            status: 'upcoming'
          })
            .populate('teamId', 'name')
            .sort({ date: 1, time: 1 })
            .limit(5)
            .lean();

          const upcomingMeetings = upcomingMeetingsDocs.map((m: any) => ({
            id: m._id.toString(),
            title: m.title,
            date: m.date,
            time: m.time,
            link_or_location: m.linkOrLocation,
            notes: m.notes,
            status: m.status,
            team_name: m.teamId?.name || 'Project Team'
          }));

          // Overdue submissions
          const overdueSubDocs = await Progress.find({
            teamId: { $in: teamIds },
            status: { $in: ['SUBMITTED', 'PENDING'] },
            submissionDate: { $lt: now }
          })
            .populate('teamId', 'name')
            .sort({ submissionDate: 1 })
            .limit(5)
            .lean();

          const overdueSubmissions = overdueSubDocs.map((ws: any) => ({
            id: ws._id.toString(),
            week: ws.weekNumber,
            date: ws.submissionDate,
            status: ws.status,
            team_name: ws.teamId?.name || 'Team',
            team_id: ws.teamId?._id ? ws.teamId._id.toString() : String(ws.teamId)
          }));

          // Recent activity
          const activityDocs = await ActivityEvent.find({
            $or: [{ userId: mUser._id }, { targetId: { $in: teamIds } }]
          })
            .populate('userId', 'name')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

          const recentActivity = activityDocs.map((ae: any) => ({
            id: ae._id.toString(),
            action_type: ae.actionType,
            description: ae.description,
            created_at: ae.createdAt,
            user_name: ae.userId?.name || 'Faculty Mentor'
          }));

          res.json({
            success: true,
            data: {
              summary: {
                studentsGuided: studentsGuidedCount,
                pendingReviews: pendingReviewsCount,
                upcomingMeetings: upcomingMeetingsCount,
                overdueSubmissions: overdueSubmissionsCount
              },
              assignedTeams: assignedTeamsWithLatest,
              upcomingMeetings,
              overdueSubmissions,
              recentActivity
            }
          });
          return;
        }
      } catch (mongoError) {
        console.warn('[MongoDB mentor dashboard notice, falling back to SQLite]', mongoError);
      }
    }

    // 2. Local SQLite Fallback
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

    let studentsGuidedCount = 0;
    let pendingReviewsCount = 0;
    let upcomingMeetingsCount = 0;
    let overdueSubmissionsCount = 0;

    if (teamIds.length > 0) {
      const placeholders = teamIds.map(() => '?').join(',');

      const studentsGuidedRow = db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM team_members
        WHERE team_id IN (${placeholders})
      `).get(...teamIds) as any;
      studentsGuidedCount = studentsGuidedRow?.count || 0;

      const pendingRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM weekly_submissions
        WHERE team_id IN (${placeholders}) AND status = 'PENDING'
      `).get(...teamIds) as any;
      pendingReviewsCount = pendingRow?.count || 0;

      const meetingsRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM meetings
        WHERE mentor_id = ? AND status = 'upcoming' AND date >= date('now')
      `).get(mentorId) as any;
      upcomingMeetingsCount = meetingsRow?.count || 0;

      const overdueRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM weekly_submissions
        WHERE team_id IN (${placeholders}) AND status = 'PENDING' AND date < date('now')
      `).get(...teamIds) as any;
      overdueSubmissionsCount = overdueRow?.count || 0;
    }

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

    const upcomingMeetings = db.prepare(`
      SELECT m.id, m.title, m.date, m.time, m.link_or_location, m.notes, m.status,
             t.name as team_name
      FROM meetings m
      JOIN teams t ON m.team_id = t.id
      WHERE m.mentor_id = ? AND m.status = 'upcoming' AND m.date >= date('now')
      ORDER BY m.date ASC, m.time ASC
      LIMIT 5
    `).all(mentorId) as any[];

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

    let recentActivity: any[] = [];
    if (teamIds.length > 0) {
      const placeholders = teamIds.map(() => '?').join(',');
      recentActivity = db.prepare(`
        SELECT ae.id, ae.action_type, ae.description, ae.created_at, u.name as user_name
        FROM activity_events ae
        LEFT JOIN users u ON ae.user_id = u.id
        WHERE ae.target_type = 'submission' OR ae.target_id IN (${placeholders}) OR ae.user_id = ?
        ORDER BY ae.created_at DESC
        LIMIT 10
      `).all(...teamIds, mentorId) as any[];
    }

    res.json({
      success: true,
      data: {
        summary: {
          studentsGuided: studentsGuidedCount,
          pendingReviews: pendingReviewsCount,
          upcomingMeetings: upcomingMeetingsCount,
          overdueSubmissions: overdueSubmissionsCount
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
    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady) {
      try {
        let mUser = null;
        if (mongoose.Types.ObjectId.isValid(mentorId)) {
          mUser = await User.findById(mentorId);
        }
        if (!mUser && mentorEmail) {
          mUser = await User.findOne({ email: mentorEmail });
        }

        if (mUser) {
          const mongoTeams = await Team.find({ mentorId: mUser._id, status: 'active' })
            .populate('leaderId', 'name email avatar')
            .populate('projectId')
            .populate('memberIds', 'name email avatar')
            .lean();

          if (mongoTeams.length > 0) {
            const formatted = mongoTeams.map((t: any) => {
              const leader = t.leaderId as any;
              const proj = t.projectId as any;
              return {
                id: t._id.toString(),
                name: t.name,
                yearCohort: t.yearCohort,
                department: t.department,
                status: t.status,
                project_id: proj ? proj._id.toString() : null,
                project_title: proj?.title || 'Project Workspace',
                project_description: proj?.description || '',
                project_progress: proj?.progressPercentage || 0,
                project_status: proj?.status || 'ON_TRACK',
                repo_url: proj?.githubUrl || '',
                leader_id: leader ? leader._id.toString() : null,
                leader_name: leader?.name || 'Leader',
                leader_email: leader?.email || '',
                leader_avatar: leader?.avatar || null,
                member_count: (t.memberIds || []).length || 1
              };
            });

            res.json({ success: true, count: formatted.length, data: formatted });
            return;
          }
        }
      } catch (err) {
        console.warn('[MongoDB getMentorTeams notice]', err);
      }
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
    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady && (mongoose.Types.ObjectId.isValid(teamId) || teamId)) {
      try {
        let teamDoc: any = null;
        if (mongoose.Types.ObjectId.isValid(teamId)) {
          teamDoc = await Team.findById(teamId)
            .populate('leaderId', 'name email avatar')
            .populate('mentorId', 'name email')
            .populate('memberIds', 'name email avatar rollNumber department')
            .lean();
        }
        if (!teamDoc) {
          teamDoc = await Team.findOne({ name: teamId })
            .populate('leaderId', 'name email avatar')
            .populate('mentorId', 'name email')
            .populate('memberIds', 'name email avatar rollNumber department')
            .lean();
        }

        if (teamDoc) {
          const projDoc = await Project.findOne({ teamId: teamDoc._id }).lean();
          const subs = await Progress.find({ teamId: teamDoc._id })
            .populate('submittedBy', 'name email')
            .populate('reviewerId', 'name email')
            .sort({ weekNumber: -1 })
            .lean();

          const revs = await Review.find({ teamId: teamDoc._id })
            .populate('mentorId', 'name email')
            .sort({ reviewedAt: -1 })
            .lean();

          const leader = teamDoc.leaderId as any;
          const members = (teamDoc.memberIds as any[]).map((m) => ({
            id: m._id.toString(),
            name: m.name,
            email: m.email,
            avatar: m.avatar,
            roll_number: m.rollNumber || 'N/A',
            department: m.department || teamDoc.department
          }));

          const formattedSubs = subs.map((s: any) => ({
            id: s._id.toString(),
            week: s.weekNumber,
            date: s.submissionDate,
            work_completed: (s.completedTasks || []).join('\n'),
            current_work: (s.currentWork || []).join('\n'),
            blockers: (s.blockers || []).join('\n'),
            next_week_goals: (s.nextWeekGoals || []).join('\n'),
            repo_url: s.githubUrl || '',
            attachments: s.files || [],
            status: s.status,
            feedback: s.feedback || '',
            reviewed_at: s.reviewedAt,
            reviewer_name: (s.reviewerId as any)?.name || 'Mentor',
            submitter_name: (s.submittedBy as any)?.name || 'Student'
          }));

          const feedbackHistory = revs.map((r: any) => ({
            id: r._id.toString(),
            submission_id: r.progressId ? r.progressId.toString() : null,
            status: r.status,
            feedback: r.feedback,
            created_at: r.reviewedAt,
            reviewer_name: (r.mentorId as any)?.name || 'Mentor'
          }));

          res.json({
            success: true,
            data: {
              team: {
                id: teamDoc._id.toString(),
                name: teamDoc.name,
                yearCohort: teamDoc.yearCohort,
                department: teamDoc.department,
                status: teamDoc.status,
                leader: {
                  id: leader ? leader._id.toString() : null,
                  name: leader?.name || 'Leader',
                  email: leader?.email || '',
                  avatar: leader?.avatar || null
                }
              },
              project: projDoc
                ? {
                    id: projDoc._id.toString(),
                    title: projDoc.title,
                    description: projDoc.description,
                    techStack: projDoc.techStack || [],
                    repoUrl: projDoc.githubUrl || '',
                    progress: projDoc.progressPercentage || 0,
                    status: projDoc.status || 'ON_TRACK',
                    deadline: projDoc.deadline,
                    milestones: projDoc.milestones || []
                  }
                : null,
              members,
              submissions: formattedSubs,
              feedbackHistory
            }
          });
          return;
        }
      } catch (err) {
        console.warn('[MongoDB getMentorTeamDetails notice]', err);
      }
    }

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
    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady) {
      try {
        let mUser = null;
        if (mongoose.Types.ObjectId.isValid(mentorId)) {
          mUser = await User.findById(mentorId);
        }
        if (!mUser && mentorEmail) {
          mUser = await User.findOne({ email: mentorEmail });
        }

        if (mUser) {
          const assignedTeams = await Team.find({ mentorId: mUser._id }).populate('leaderId', 'name').lean();
          const teamIds = assignedTeams.map((t: any) => t._id);
          const filter: any = { teamId: { $in: teamIds } };

          if (status && status !== 'all') {
            filter.status = status;
          }

          if (search) {
            filter.$or = [
              { title: new RegExp(String(search), 'i') },
              { description: new RegExp(String(search), 'i') }
            ];
          }

          const mongoProjects = await Project.find(filter).lean();
          const teamMap = new Map(assignedTeams.map((t: any) => [t._id.toString(), t]));

          const formatted = mongoProjects.map((p: any) => {
            const team = teamMap.get(p.teamId.toString());
            return {
              id: p._id.toString(),
              title: p.title,
              description: p.description,
              techStack: p.techStack || [],
              repo_url: p.githubUrl || '',
              status: p.status,
              deadline: p.deadline,
              progress: p.progressPercentage,
              team_id: team ? team._id.toString() : null,
              team_name: team ? team.name : 'Team',
              leader_name: (team?.leaderId as any)?.name || 'Leader'
            };
          });

          res.json({ success: true, count: formatted.length, data: formatted });
          return;
        }
      } catch (err) {
        console.warn('[MongoDB getMentorProjects notice]', err);
      }
    }

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
    const mentorEmail = (req.user?.email || '').toLowerCase();
    const { status } = req.query;
    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady) {
      try {
        let mUser = null;
        if (mongoose.Types.ObjectId.isValid(mentorId)) {
          mUser = await User.findById(mentorId);
        }
        if (!mUser && mentorEmail) {
          mUser = await User.findOne({ email: mentorEmail });
        }

        if (mUser) {
          const assignedTeams = await Team.find({ mentorId: mUser._id }).populate('leaderId', 'name').lean();
          const teamIds = assignedTeams.map((t: any) => t._id);
          const filter: any = { teamId: { $in: teamIds } };

          if (status && status !== 'all') {
            filter.status = status;
          }

          const mongoSubs = await Progress.find(filter)
            .populate('submittedBy', 'name')
            .populate('projectId', 'title')
            .sort({ submissionDate: -1 })
            .lean();

          const teamMap = new Map(assignedTeams.map((t: any) => [t._id.toString(), t]));

          const formatted = mongoSubs.map((s: any) => {
            const team = teamMap.get(s.teamId.toString());
            return {
              id: s._id.toString(),
              week: s.weekNumber,
              date: s.submissionDate,
              work_completed: (s.completedTasks || []).join('\n'),
              current_work: (s.currentWork || []).join('\n'),
              blockers: (s.blockers || []).join('\n'),
              next_week_goals: (s.nextWeekGoals || []).join('\n'),
              repo_url: s.githubUrl || '',
              attachments: s.files || [],
              status: s.status,
              feedback: s.feedback || '',
              reviewed_at: s.reviewedAt,
              created_at: s.createdAt,
              team_id: team ? team._id.toString() : null,
              team_name: team ? team.name : 'Team',
              project_title: (s.projectId as any)?.title || 'Assigned Project',
              leader_name: (team?.leaderId as any)?.name || 'Leader'
            };
          });

          res.json({ success: true, count: formatted.length, data: formatted });
          return;
        }
      } catch (err) {
        console.warn('[MongoDB getMentorReviews notice]', err);
      }
    }

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
    const mentorEmail = (req.user?.email || '').toLowerCase();
    const isMongoReady = mongoose.connection.readyState === 1;

    if (!['APPROVE', 'CHANGES_REQUESTED'].includes(action)) {
      res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVE or CHANGES_REQUESTED.' });
      return;
    }

    if (action === 'CHANGES_REQUESTED' && (!feedback || !feedback.trim())) {
      res.status(400).json({ success: false, message: 'Feedback is required when requesting changes.' });
      return;
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'CHANGES_REQUESTED';
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Persist to MongoDB Atlas if connected
    if (isMongoReady) {
      try {
        let mUser = null;
        if (mongoose.Types.ObjectId.isValid(mentorId)) {
          mUser = await User.findById(mentorId);
        }
        if (!mUser && mentorEmail) {
          mUser = await User.findOne({ email: mentorEmail });
        }

        const effectiveMentorId = mUser ? mUser._id : (mongoose.Types.ObjectId.isValid(mentorId) ? new mongoose.Types.ObjectId(mentorId) : null);

        let subDoc: any = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
          subDoc = await Progress.findById(id);
        }

        if (subDoc && effectiveMentorId) {
          subDoc.status = newStatus;
          subDoc.feedback = feedback || 'Approved';
          subDoc.reviewerId = effectiveMentorId;
          subDoc.reviewedAt = now;
          await subDoc.save();

          await Review.create({
            progressId: subDoc._id,
            teamId: subDoc.teamId,
            mentorId: effectiveMentorId,
            status: action === 'APPROVE' ? 'Approved' : 'Needs Improvement',
            feedback: feedback || 'Approved without comments',
            reviewedAt: now
          });

          if (subDoc.projectId) {
            await Project.findByIdAndUpdate(subDoc.projectId, {
              hasPendingReview: false,
              status: action === 'APPROVE' ? 'ON_TRACK' : 'NEEDS_ATTENTION',
              ...(action === 'APPROVE' ? { $inc: { progressPercentage: 5 } } : {})
            });
          }

          // Create notification for team members in MongoDB
          const teamDoc = await Team.findById(subDoc.teamId);
          if (teamDoc && teamDoc.memberIds) {
            const notifTitle = action === 'APPROVE' ? 'Weekly Submission Approved' : 'Changes Requested on Submission';
            const notifMsg = `Mentor ${req.user?.name || 'Mentor'} reviewed Week ${subDoc.weekNumber}: "${feedback || 'Approved'}"`;

            for (const memberId of teamDoc.memberIds) {
              await Notification.create({
                userId: memberId,
                title: notifTitle,
                message: notifMsg,
                type: 'review',
                link: '/student/dashboard'
              });
            }
          }

          await ActivityEvent.create({
            userId: effectiveMentorId,
            actionType: 'REVIEW_COMPLETED',
            description: `${req.user?.name || 'Mentor'} reviewed submission: ${newStatus}`,
            targetType: 'submission',
            targetId: subDoc._id.toString()
          });
        }
      } catch (mErr) {
        console.warn('[MongoDB submitMentorReview notice]', mErr);
      }
    }

    // 2. Persist to SQLite store
    const submission = db.prepare(`
      SELECT ws.id, ws.team_id, ws.project_id, ws.week, t.name as team_name, t.mentor_id
      FROM weekly_submissions ws
      JOIN teams t ON ws.team_id = t.id
      WHERE ws.id = ?
    `).get(id) as any;

    if (submission) {
      db.prepare(`
        UPDATE weekly_submissions
        SET status = ?, feedback = ?, reviewer_id = ?, reviewed_at = ?
        WHERE id = ?
      `).run(newStatus, feedback || 'Approved without additional comments.', mentorId, nowIso, id);

      const feedbackId = `fb_${Date.now()}`;
      db.prepare(`
        INSERT INTO feedback_history (id, submission_id, reviewer_id, status, feedback, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(feedbackId, id, mentorId, newStatus, feedback || 'Approved', nowIso);

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
      try {
        db.prepare(`
          INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
          VALUES (?, ?, 'REVIEW_COMPLETED', ?, 'submission', ?, ?)
        `).run(actId, mentorId, actDesc, id, nowIso);
      } catch {}

      const members = db.prepare('SELECT user_id FROM team_members WHERE team_id = ?').all(submission.team_id) as any[];
      const notifTitle = action === 'APPROVE' ? 'Weekly Submission Approved' : 'Changes Requested on Submission';
      const notifMsg = `Mentor ${req.user?.name || 'Mentor'} reviewed Week ${submission.week}: "${feedback || 'Approved'}"`;

      const insertNotif = db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `);

      for (const m of members) {
        try {
          insertNotif.run(`notif_${Date.now()}_${m.user_id}`, m.user_id, notifTitle, notifMsg, 'review', '/student/dashboard', nowIso);
        } catch {}
      }
    }

    res.json({
      success: true,
      message: `Submission marked as ${newStatus}`,
      data: { id, status: newStatus, feedback, reviewedAt: nowIso }
    });
  } catch (error: any) {
    console.error('[Submit Review Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMentorMeetings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const mentorId = req.user?.id || '';
    const mentorEmail = (req.user?.email || '').toLowerCase();
    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady) {
      try {
        let mUser = null;
        if (mongoose.Types.ObjectId.isValid(mentorId)) {
          mUser = await User.findById(mentorId);
        }
        if (!mUser && mentorEmail) {
          mUser = await User.findOne({ email: mentorEmail });
        }

        if (mUser) {
          const mongoMeetings = await Meeting.find({ mentorId: mUser._id })
            .populate('teamId', 'name')
            .sort({ date: 1, time: 1 })
            .lean();

          if (mongoMeetings.length > 0) {
            const formatted = mongoMeetings.map((m: any) => ({
              id: m._id.toString(),
              title: m.title,
              date: m.date,
              time: m.time,
              link_or_location: m.linkOrLocation,
              notes: m.notes,
              status: m.status,
              created_at: m.createdAt,
              team_id: m.teamId ? (m.teamId._id ? m.teamId._id.toString() : String(m.teamId)) : null,
              team_name: m.teamId?.name || 'Team'
            }));

            res.json({ success: true, count: formatted.length, data: formatted });
            return;
          }
        }
      } catch (err) {
        console.warn('[MongoDB getMentorMeetings notice]', err);
      }
    }

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
    const mentorEmail = (req.user?.email || '').toLowerCase();
    const { teamId, title, date, time, linkOrLocation, notes } = req.body;
    const isMongoReady = mongoose.connection.readyState === 1;

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

    const now = new Date();
    const nowIso = now.toISOString();
    let meetingId = `meet_${Date.now()}`;
    let teamName = 'Team';

    // 1. Persist to MongoDB Atlas if connected
    if (isMongoReady) {
      try {
        let mUser = null;
        if (mongoose.Types.ObjectId.isValid(mentorId)) {
          mUser = await User.findById(mentorId);
        }
        if (!mUser && mentorEmail) {
          mUser = await User.findOne({ email: mentorEmail });
        }

        const effectiveMentorId = mUser ? mUser._id : (mongoose.Types.ObjectId.isValid(mentorId) ? new mongoose.Types.ObjectId(mentorId) : null);

        let teamDoc: any = null;
        if (mongoose.Types.ObjectId.isValid(teamId)) {
          teamDoc = await Team.findById(teamId);
        }
        if (!teamDoc) {
          teamDoc = await Team.findOne({ name: teamId });
        }

        if (teamDoc && effectiveMentorId) {
          teamName = teamDoc.name;
          const newMeeting = await Meeting.create({
            teamId: teamDoc._id,
            mentorId: effectiveMentorId,
            title: title.trim(),
            date,
            time: time.trim(),
            linkOrLocation: linkOrLocation.trim(),
            notes: notes?.trim() || null,
            status: 'upcoming'
          });

          meetingId = newMeeting._id.toString();

          await ActivityEvent.create({
            userId: effectiveMentorId,
            actionType: 'MEETING_SCHEDULED',
            description: `${req.user?.name || 'Mentor'} scheduled meeting with ${teamDoc.name} on ${date}`,
            targetType: 'meeting',
            targetId: meetingId
          });

          if (teamDoc.memberIds) {
            for (const memId of teamDoc.memberIds) {
              await Notification.create({
                userId: memId,
                title: 'New Meeting Scheduled',
                message: `Mentor ${req.user?.name || 'Mentor'} scheduled: "${title}" on ${date} at ${time}`,
                type: 'meeting',
                link: '/student/dashboard'
              });
            }
          }
        }
      } catch (mErr) {
        console.warn('[MongoDB scheduleMentorMeeting notice]', mErr);
      }
    }

    // 2. Persist to SQLite
    try {
      const team = db.prepare('SELECT id, name, mentor_id FROM teams WHERE id = ?').get(teamId) as any;
      if (team) {
        teamName = team.name;
      }

      db.prepare(`
        INSERT INTO meetings (id, team_id, mentor_id, title, date, time, link_or_location, notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?)
      `).run(meetingId, teamId, mentorId, title.trim(), date, time.trim(), linkOrLocation.trim(), notes?.trim() || null, nowIso);

      db.prepare(`
        INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(`act_${Date.now()}`, mentorId, 'MEETING_SCHEDULED', `${req.user?.name || 'Mentor'} scheduled meeting with ${teamName} on ${date}`, 'meeting', meetingId, nowIso);

      const members = db.prepare('SELECT user_id FROM team_members WHERE team_id = ?').all(teamId) as any[];
      const notifTitle = 'New Meeting Scheduled';
      const notifMsg = `Mentor ${req.user?.name || 'Mentor'} scheduled: "${title}" on ${date} at ${time}`;

      const insertNotif = db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `);

      for (const m of members) {
        insertNotif.run(`notif_${Date.now()}_${m.user_id}`, m.user_id, notifTitle, notifMsg, 'meeting', '/student/dashboard', nowIso);
      }
    } catch (sqlErr) {
      console.warn('[SQLite scheduleMeeting notice]', sqlErr);
    }

    res.status(201).json({
      success: true,
      message: 'Meeting scheduled successfully',
      data: {
        id: meetingId,
        teamId,
        teamName,
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
    const mentorEmail = (req.user?.email || '').toLowerCase();
    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady) {
      try {
        let mUser = null;
        if (mongoose.Types.ObjectId.isValid(mentorId)) {
          mUser = await User.findById(mentorId);
        }
        if (!mUser && mentorEmail) {
          mUser = await User.findOne({ email: mentorEmail });
        }

        if (mUser) {
          const mongoNotifications = await Notification.find({ userId: mUser._id }).sort({ createdAt: -1 }).lean();
          const mongoAnnouncements = await Announcement.find({ audience: { $in: ['all', 'mentors'] } })
            .populate('authorId', 'name')
            .sort({ createdAt: -1 })
            .lean();

          const formattedNotifs = mongoNotifications.map((n: any) => ({
            id: n._id.toString(),
            title: n.title,
            message: n.message,
            type: n.type,
            is_read: n.isRead ? 1 : 0,
            link: n.link,
            created_at: n.createdAt
          }));

          const formattedAnnouncements = mongoAnnouncements.map((a: any) => ({
            id: a._id.toString(),
            title: a.title,
            message: a.message,
            audience: a.audience,
            created_at: a.createdAt,
            author_name: (a.authorId as any)?.name || 'Administrator'
          }));

          const unreadCount = formattedNotifs.filter((n) => n.is_read === 0).length;

          res.json({
            success: true,
            data: {
              notifications: formattedNotifs,
              announcements: formattedAnnouncements,
              unreadCount
            }
          });
          return;
        }
      } catch (err) {
        console.warn('[MongoDB getMentorNotifications notice]', err);
      }
    }

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
    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady && mongoose.Types.ObjectId.isValid(id)) {
      try {
        await Notification.findByIdAndUpdate(id, { isRead: true });
      } catch {}
    }

    try {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, mentorId);
    } catch {}

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMentorProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const mentorId = req.user?.id || '';
    const mentorEmail = (req.user?.email || '').toLowerCase();
    const { department, title, bio, phone, name } = req.body;
    const isMongoReady = mongoose.connection.readyState === 1;

    if (!department) {
      res.status(400).json({ success: false, message: 'Department is required' });
      return;
    }

    if (isMongoReady) {
      try {
        let mUser = null;
        if (mongoose.Types.ObjectId.isValid(mentorId)) {
          mUser = await User.findById(mentorId);
        }
        if (!mUser && mentorEmail) {
          mUser = await User.findOne({ email: mentorEmail });
        }

        if (mUser) {
          if (name) mUser.name = name.trim();
          mUser.department = department.trim();
          if (title !== undefined) mUser.title = title?.trim() || '';
          if (bio !== undefined) mUser.bio = bio?.trim() || '';
          if (phone !== undefined) mUser.phone = phone?.trim() || '';
          await mUser.save();
        }
      } catch (mErr) {
        console.warn('[MongoDB updateMentorProfile notice]', mErr);
      }
    }

    if (name) {
      try {
        db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), mentorId);
      } catch {}
    }

    try {
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
    } catch {}

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
