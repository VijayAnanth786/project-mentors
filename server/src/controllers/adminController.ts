import { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../db/database';
import { User } from '../models/User';
import { Team } from '../models/Team';
import { Project } from '../models/Project';

export const getAdminDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isMongoReady = mongoose.connection.readyState === 1;
    let totalStudents = 0;
    let totalMentors = 0;

    if (isMongoReady) {
      totalStudents = await User.countDocuments({ role: 'STUDENT' });
      totalMentors = await User.countDocuments({ role: 'MENTOR' });
    } else {
      const sRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get() as any;
      const mRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'mentor'").get() as any;
      totalStudents = sRow?.count || 0;
      totalMentors = mRow?.count || 0;
    }

    let activeTeams = 0;
    let teamsWithoutMentors = 0;

    if (isMongoReady) {
      try {
        activeTeams = await Team.countDocuments();
        teamsWithoutMentors = await Team.countDocuments({ $or: [{ mentorId: null }, { mentorId: { $exists: false } }] });
      } catch {}
    }

    try {
      const activeTeamsRow = db.prepare("SELECT COUNT(*) as count FROM teams WHERE status = 'active'").get() as any;
      const teamsWithoutMentorsRow = db.prepare("SELECT COUNT(*) as count FROM teams WHERE mentor_id IS NULL AND status = 'active'").get() as any;
      activeTeams = Math.max(activeTeams, activeTeamsRow?.count || 0);
      teamsWithoutMentors = Math.max(teamsWithoutMentors, teamsWithoutMentorsRow?.count || 0);
    } catch {
      // Teams table empty or not initialized yet
    }

    const summary = {
      totalStudents,
      totalMentors,
      activeTeams,
      teamsWithoutMentors
    };

    // 2. Teams & Project Overview (First page / top items)
    let teams: any[] = [];
    try {
      teams = db.prepare(`
        SELECT t.id, t.name, t.status as team_status, t.year_cohort,
               p.id as project_id, p.title as project_title, p.progress as project_progress, p.status as project_status,
               lu.name as leader_name, lu.email as leader_email,
               mu.id as mentor_id, mu.name as mentor_name, mu.email as mentor_email
        FROM teams t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users lu ON t.leader_id = lu.id
        LEFT JOIN users mu ON t.mentor_id = mu.id
        ORDER BY t.created_at DESC
        LIMIT 10
      `).all() as any[];
    } catch {}

    // 3. Needs Attention
    let needsAttention: any[] = [];
    try {
      const unassignedTeams = db.prepare(`
        SELECT t.id, t.name, 'No mentor assigned' as reason, 'team' as item_type
        FROM teams t
        WHERE t.mentor_id IS NULL AND t.status = 'active'
        LIMIT 5
      `).all() as any[];

      const overdueTeams = db.prepare(`
        SELECT DISTINCT t.id, t.name, 'Has overdue progress submission' as reason, 'submission' as item_type
        FROM weekly_submissions ws
        JOIN teams t ON ws.team_id = t.id
        WHERE ws.status = 'PENDING' AND ws.date < date('now')
        LIMIT 5
      `).all() as any[];

      needsAttention = [...unassignedTeams, ...overdueTeams];
    } catch {}

    // 4. Recent Activity
    let recentActivity: any[] = [];
    try {
      recentActivity = db.prepare(`
        SELECT ae.id, ae.action_type, ae.description, ae.created_at, u.name as user_name
        FROM activity_events ae
        LEFT JOIN users u ON ae.user_id = u.id
        ORDER BY ae.created_at DESC
        LIMIT 10
      `).all() as any[];
    } catch {}

    // 5. Mentor Workload
    let mentorAssignments: any[] = [];
    if (isMongoReady) {
      const mentorUsers = await User.find({ role: 'MENTOR' }).sort({ name: 1 });
      mentorAssignments = mentorUsers.map((m) => ({
        id: m._id.toString(),
        name: m.name,
        email: m.email,
        status: m.status.toLowerCase(),
        department: m.department || 'Engineering',
        team_count: 0
      }));
    } else {
      const mentors = db.prepare(`
        SELECT u.id, u.name, u.email, u.status,
               COALESCE(mp.department, 'Engineering') as department,
               COUNT(t.id) as team_count
        FROM users u
        LEFT JOIN mentor_profiles mp ON u.id = mp.user_id
        LEFT JOIN teams t ON u.id = t.mentor_id AND t.status = 'active'
        WHERE u.role = 'mentor'
        GROUP BY u.id
        ORDER BY team_count DESC, u.name ASC
      `).all() as any[];
      mentorAssignments = mentors;
    }

    res.json({
      success: true,
      data: {
        summary,
        teams,
        needsAttention,
        recentActivity,
        mentorAssignments
      }
    });
  } catch (error: any) {
    console.error('[Admin Dashboard Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminStudents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, status } = req.query;
    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady) {
      const filter: any = { role: 'STUDENT' };

      if (status && status !== 'all') {
        filter.status = String(status).toUpperCase();
      }

      if (search) {
        const reg = new RegExp(String(search), 'i');
        filter.$or = [{ name: reg }, { email: reg }, { department: reg }];
      }

      const students = await User.find(filter).sort({ name: 1 });

      const formatted = students.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        email: s.email,
        status: s.status.toLowerCase(),
        avatar: s.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80`,
        created_at: s.createdAt,
        department: s.department || 'Computer Science',
        year_cohort: s.year || '1st Year',
        roll_number: 'N/A',
        team_id: null,
        team_name: null,
        team_role: null
      }));

      res.json({ success: true, count: formatted.length, data: formatted });
      return;
    }

    // Local SQLite fallback
    let query = `
      SELECT u.id, u.name, u.email, u.status, u.avatar, u.created_at,
             sp.department, sp.year_cohort, sp.roll_number,
             t.id as team_id, t.name as team_name, tm.role as team_role
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN team_members tm ON u.id = tm.user_id
      LEFT JOIN teams t ON tm.team_id = t.id
      WHERE u.role = 'student'
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR sp.roll_number LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (status && status !== 'all') {
      query += ` AND u.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY u.name ASC`;

    const students = db.prepare(query).all(...params) as any[];

    res.json({ success: true, count: students.length, data: students });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStudentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const norm = String(status || '').toUpperCase();
    if (!['ACTIVE', 'BLOCKED', 'INACTIVE'].includes(norm)) {
      res.status(400).json({ success: false, message: 'Invalid status. Must be ACTIVE or BLOCKED.' });
      return;
    }

    const targetStatus = norm === 'BLOCKED' || norm === 'INACTIVE' ? 'BLOCKED' : 'ACTIVE';
    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady) {
      const student = await User.findOne({ _id: id, role: 'STUDENT' });
      if (student) {
        student.status = targetStatus;
        await student.save();
      }
    }

    try {
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run(targetStatus === 'BLOCKED' ? 'inactive' : 'active', id);
    } catch {}

    res.json({
      success: true,
      message: `Student account status updated to ${targetStatus.toLowerCase()}.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminMentors = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isMongoReady = mongoose.connection.readyState === 1;
    const combinedMentors: any[] = [];
    const seenEmails = new Set<string>();

    if (isMongoReady) {
      try {
        const mentors = await User.find({ role: 'MENTOR' }).sort({ name: 1 });
        for (const m of mentors) {
          const normEmail = (m.email || '').toLowerCase().trim();
          seenEmails.add(normEmail);

          const teamCount = await Team.countDocuments({ mentorId: m._id });

          combinedMentors.push({
            id: m._id.toString(),
            name: m.name,
            email: m.email,
            status: m.status.toLowerCase(),
            avatar: m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            department: m.department || 'Computer Science',
            title: 'Faculty Mentor',
            bio: null,
            phone: null,
            team_count: teamCount,
            mustChangePassword: m.mustChangePassword,
            created_at: m.createdAt
          });
        }
      } catch (mErr) {
        console.warn('[MongoDB getAdminMentors error]', mErr);
      }
    }

    // Local SQLite fallback and merge
    try {
      const sqlMentors = db.prepare(`
        SELECT u.id, u.name, u.email, u.status, u.avatar, u.created_at,
               COALESCE(mp.department, 'Computer Science') as department,
               mp.title, mp.bio, mp.phone,
               COUNT(t.id) as team_count
        FROM users u
        LEFT JOIN mentor_profiles mp ON u.id = mp.user_id
        LEFT JOIN teams t ON u.id = t.mentor_id AND t.status = 'active'
        WHERE u.role = 'mentor'
        GROUP BY u.id
        ORDER BY u.name ASC
      `).all() as any[];

      for (const sm of sqlMentors) {
        const normEmail = (sm.email || '').toLowerCase().trim();
        if (!seenEmails.has(normEmail)) {
          seenEmails.add(normEmail);
          combinedMentors.push(sm);
        }
      }
    } catch (sqlErr) {
      console.warn('[SQLite getAdminMentors error]', sqlErr);
    }

    res.json({ success: true, count: combinedMentors.length, data: combinedMentors });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addAdminMentor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, department } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ success: false, message: 'Name is required (at least 2 characters).' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      res.status(400).json({ success: false, message: 'Please provide a valid institutional email address.' });
      return;
    }

    if (!department || typeof department !== 'string') {
      res.status(400).json({ success: false, message: 'Department is required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isMongoReady = mongoose.connection.readyState === 1;

    // Check existing in SQLite first
    const existingSQLite = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail) as any;
    if (existingSQLite) {
      res.status(409).json({ success: false, message: 'A user with this email address already exists.' });
      return;
    }

    if (isMongoReady) {
      const existingMongo = await User.findOne({ email: normalizedEmail });
      if (existingMongo) {
        res.status(409).json({ success: false, message: 'A user with this email address already exists.' });
        return;
      }
    }

    // Generate strong random temporary password
    const tempPassword = 'Temp_' + crypto.randomBytes(4).toString('hex') + '!' + Math.floor(100 + Math.random() * 900);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    const mentorId = `usr_mentor_${Date.now()}`;
    const avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

    // Always persist to SQLite
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, status, avatar)
      VALUES (?, ?, ?, ?, 'mentor', 'active', ?)
    `).run(mentorId, name.trim(), normalizedEmail, passwordHash, avatar);

    try {
      db.prepare(`
        INSERT INTO mentor_profiles (id, user_id, department, title)
        VALUES (?, ?, ?, 'Faculty Mentor')
      `).run(`mp_${Date.now()}`, mentorId, department.trim());
    } catch {}

    // If Mongo Atlas is ready, also sync user document
    if (isMongoReady) {
      try {
        await User.create({
          _id: new mongoose.Types.ObjectId(),
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: 'MENTOR',
          status: 'ACTIVE',
          department: department.trim(),
          avatar,
          mustChangePassword: true
        });
      } catch (mErr) {
        console.warn('[Mongo Sync Notice] Could not replicate mentor to Atlas:', mErr);
      }
    }

    // Log activity event
    try {
      db.prepare(`
        INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id)
        VALUES (?, ?, 'MENTOR_ADDED', ?, 'user', ?)
      `).run(`act_${Date.now()}`, req.user?.id || 'usr_admin_1', `Admin added faculty mentor ${name.trim()} (${department.trim()})`, mentorId);
    } catch {}

    // Reveal the temporary password once in creation response (never logged or persisted in plain text)
    res.status(201).json({
      success: true,
      message: 'Mentor account created successfully. No invitation email was sent; please share the temporary credentials with the mentor privately.',
      data: {
        id: mentorId,
        name: name.trim(),
        email: normalizedEmail,
        department: department.trim(),
        temporaryPassword: tempPassword,
        mustChangePassword: true,
        notice: 'No invitation email was sent. Please share this temporary password securely with the mentor.'
      }
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ success: false, message: 'A user with this email address already exists.' });
      return;
    }
    console.error('[Add Mentor Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create mentor' });
  }
};

export const updateAdminMentor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, department, status } = req.body;

    const mentor = await User.findOne({ _id: id, role: 'MENTOR' });
    if (!mentor) {
      res.status(404).json({ success: false, message: 'Mentor not found.' });
      return;
    }

    // Only update allowed fields (never allow arbitrary role changes)
    if (name && typeof name === 'string') {
      mentor.name = name.trim();
    }

    if (department && typeof department === 'string') {
      mentor.department = department.trim();
    }

    if (status) {
      const norm = String(status).toUpperCase();
      if (norm === 'ACTIVE' || norm === 'BLOCKED') {
        mentor.status = norm;
      } else if (norm === 'INACTIVE') {
        mentor.status = 'BLOCKED';
      }
    }

    await mentor.save();

    res.json({
      success: true,
      message: 'Mentor profile updated successfully.',
      data: {
        id: mentor._id.toString(),
        name: mentor.name,
        email: mentor.email,
        department: mentor.department,
        status: mentor.status.toLowerCase()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMentorStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const mentor = await User.findOne({ _id: id, role: 'MENTOR' });
    if (!mentor) {
      res.status(404).json({ success: false, message: 'Mentor not found.' });
      return;
    }

    const norm = String(status || '').toUpperCase();
    const targetStatus: 'ACTIVE' | 'BLOCKED' = norm === 'BLOCKED' || norm === 'INACTIVE' ? 'BLOCKED' : 'ACTIVE';

    mentor.status = targetStatus;
    await mentor.save();

    res.json({
      success: true,
      message: `Mentor marked as ${targetStatus.toLowerCase()}.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminTeams = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, mentorFilter, status, page = '1', limit = '50' } = req.query;
    const isMongoReady = mongoose.connection.readyState === 1;

    let allTeams: any[] = [];
    const seenNames = new Set<string>();

    // 1. Fetch from MongoDB Atlas
    if (isMongoReady) {
      try {
        const mongoTeams = await Team.find()
          .populate('leaderId', 'name email avatar')
          .populate('mentorId', 'name email avatar role')
          .populate('memberIds', 'name email avatar role')
          .sort({ createdAt: -1 })
          .lean();

        const teamIds = mongoTeams.map((t: any) => t._id);
        const mongoProjects = await Project.find({ teamId: { $in: teamIds } }).lean();
        const projMap = new Map(mongoProjects.map((p: any) => [p.teamId.toString(), p]));

        for (const t of mongoTeams) {
          const proj = projMap.get(t._id.toString());
          const leader = t.leaderId as any;
          const mentor = t.mentorId as any;
          const item = {
            id: t._id.toString(),
            name: t.name,
            status: 'active',
            year_cohort: t.yearCohort || '3rd Year',
            department: t.department || 'Computer Science',
            created_at: t.createdAt,
            project_id: proj ? proj._id.toString() : null,
            project_title: proj?.title || null,
            project_progress: proj?.progressPercentage || 0,
            project_status: proj?.status || 'ON_TRACK',
            leader_id: leader ? (leader._id ? leader._id.toString() : String(leader)) : '',
            leader_name: leader?.name || 'Student Leader',
            leader_email: leader?.email || '',
            mentor_id: mentor ? (mentor._id ? mentor._id.toString() : String(mentor)) : null,
            mentor_name: mentor?.name || null,
            mentor_email: mentor?.email || null,
            member_count: Array.isArray(t.memberIds) ? t.memberIds.length : 1
          };
          allTeams.push(item);
          seenNames.add(t.name.trim().toLowerCase());
        }
      } catch (mErr) {
        console.warn('[MongoDB getAdminTeams error]', mErr);
      }
    }

    // 2. Fetch from SQLite
    try {
      const sqlTeams = db.prepare(`
        SELECT t.id, t.name, t.status, t.year_cohort, t.department, t.created_at,
               p.id as project_id, p.title as project_title, p.progress as project_progress, p.status as project_status,
               lu.id as leader_id, lu.name as leader_name, lu.email as leader_email,
               mu.id as mentor_id, mu.name as mentor_name, mu.email as mentor_email,
               (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
        FROM teams t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users lu ON t.leader_id = lu.id
        LEFT JOIN users mu ON t.mentor_id = mu.id
        ORDER BY t.created_at DESC
      `).all() as any[];

      for (const st of sqlTeams) {
        if (!seenNames.has(st.name.trim().toLowerCase())) {
          allTeams.push(st);
          seenNames.add(st.name.trim().toLowerCase());
        }
      }
    } catch {}

    // Apply filtering
    if (mentorFilter === 'assigned') {
      allTeams = allTeams.filter((t) => Boolean(t.mentor_id));
    } else if (mentorFilter === 'unassigned') {
      allTeams = allTeams.filter((t) => !t.mentor_id);
    }

    if (status && status !== 'all') {
      allTeams = allTeams.filter((t) => t.status === status);
    }

    if (search) {
      const term = String(search).toLowerCase();
      allTeams = allTeams.filter((t) =>
        t.name?.toLowerCase().includes(term) ||
        t.project_title?.toLowerCase().includes(term) ||
        t.leader_name?.toLowerCase().includes(term) ||
        t.mentor_name?.toLowerCase().includes(term)
      );
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const totalCount = allTeams.length;
    const offset = (pageNum - 1) * limitNum;
    const paginated = allTeams.slice(offset, offset + limitNum);

    res.json({
      success: true,
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
      data: paginated
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignTeamMentor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { mentorId } = req.body;
    const adminId = req.user?.id || 'usr_admin_1';
    const isMongoReady = mongoose.connection.readyState === 1;

    let mentorName = 'None';
    let targetMentorDoc: any = null;

    // 1. If a mentorId is provided, resolve and validate the mentor
    if (mentorId) {
      const cleanMentorId = String(mentorId).trim();
      // Try MongoDB
      if (isMongoReady) {
        try {
          if (mongoose.Types.ObjectId.isValid(cleanMentorId)) {
            targetMentorDoc = await User.findById(cleanMentorId);
          }
          if (!targetMentorDoc) {
            targetMentorDoc = await User.findOne({
              $or: [
                { _id: mongoose.Types.ObjectId.isValid(cleanMentorId) ? new mongoose.Types.ObjectId(cleanMentorId) : null },
                { email: cleanMentorId.toLowerCase() }
              ]
            });
          }
        } catch {}
      }

      // Try SQLite
      if (!targetMentorDoc) {
        try {
          targetMentorDoc = db.prepare('SELECT id, name, status, role, email FROM users WHERE id = ? OR email = ? COLLATE NOCASE').get(cleanMentorId, cleanMentorId) as any;
        } catch {}
      }

      if (!targetMentorDoc) {
        res.status(400).json({ success: false, message: 'Selected mentor not found.' });
        return;
      }

      const roleStr = String(targetMentorDoc.role || '').toLowerCase();
      const statusStr = String(targetMentorDoc.status || '').toLowerCase();

      if (roleStr !== 'mentor') {
        res.status(400).json({ success: false, message: 'Selected user is not a faculty mentor.' });
        return;
      }
      if (statusStr === 'inactive' || statusStr === 'blocked') {
        res.status(400).json({ success: false, message: 'Cannot assign an inactive mentor.' });
        return;
      }

      mentorName = targetMentorDoc.name;
    }

    let teamFound = false;
    let teamName = 'Team';
    let mongoUpdatedTeam: any = null;

    // 2. Update in MongoDB Atlas if connected
    if (isMongoReady) {
      try {
        let mTeam = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
          mTeam = await Team.findById(id);
        }
        if (!mTeam) {
          mTeam = await Team.findOne({
            $or: [
              { _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null },
              { name: id }
            ]
          });
        }

        if (mTeam) {
          teamFound = true;
          teamName = mTeam.name;
          mongoUpdatedTeam = mTeam;

          let finalMongoMentorId: any = null;
          if (mentorId && targetMentorDoc) {
            if (targetMentorDoc._id) {
              finalMongoMentorId = targetMentorDoc._id;
            } else if (targetMentorDoc.email) {
              const mUser = await User.findOne({ email: targetMentorDoc.email.toLowerCase() });
              if (mUser) {
                finalMongoMentorId = mUser._id;
              }
            }
            if (!finalMongoMentorId && mongoose.Types.ObjectId.isValid(mentorId)) {
              finalMongoMentorId = new mongoose.Types.ObjectId(mentorId);
            }
          }

          mTeam.mentorId = finalMongoMentorId;
          await mTeam.save();
        }
      } catch (mErr) {
        console.warn('[MongoDB assignTeamMentor error]', mErr);
      }
    }

    // 3. Update in SQLite
    try {
      let sqlTeam = db.prepare('SELECT id, name, mentor_id FROM teams WHERE id = ? OR name = ?').get(id, id) as any;

      if (!sqlTeam && mongoUpdatedTeam) {
        // Sync SQLite with MongoDB team
        const leaderIdStr = mongoUpdatedTeam.leaderId ? mongoUpdatedTeam.leaderId.toString() : 'usr_leader_stub';
        try {
          db.prepare(`
            INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status, avatar)
            VALUES (?, 'Team Leader', 'leader@university.edu', 'managed_auth', 'student', 'active', '')
          `).run(leaderIdStr);
        } catch {}

        try {
          db.prepare(`
            INSERT OR IGNORE INTO teams (id, name, leader_id, mentor_id, year_cohort, department, status)
            VALUES (?, ?, ?, NULL, ?, ?, 'active')
          `).run(mongoUpdatedTeam._id.toString(), mongoUpdatedTeam.name, leaderIdStr, mongoUpdatedTeam.yearCohort || '3rd Year', mongoUpdatedTeam.department || 'Computer Science');
        } catch {}

        sqlTeam = db.prepare('SELECT id, name, mentor_id FROM teams WHERE id = ?').get(mongoUpdatedTeam._id.toString()) as any;
      }

      if (sqlTeam) {
        teamFound = true;
        teamName = sqlTeam.name;

        // Ensure the mentor exists in SQLite so foreign key won't fail
        let finalSqlMentorId = null;
        if (mentorId) {
          const mentorEmailTarget = (targetMentorDoc?.email || '').trim().toLowerCase();
          const sqlMentor = db.prepare('SELECT id FROM users WHERE id = ? OR (email = ? AND ? != "") COLLATE NOCASE').get(mentorId, mentorEmailTarget, mentorEmailTarget) as any;
          if (sqlMentor) {
            finalSqlMentorId = sqlMentor.id;
          } else {
            finalSqlMentorId = targetMentorDoc?._id ? targetMentorDoc._id.toString() : String(mentorId);
            try {
              db.prepare(`
                INSERT OR REPLACE INTO users (id, name, email, password_hash, role, status, avatar)
                VALUES (?, ?, ?, 'managed_auth', 'mentor', 'active', ?)
              `).run(finalSqlMentorId, targetMentorDoc?.name || mentorName, mentorEmailTarget || `${finalSqlMentorId}@university.edu`, targetMentorDoc?.avatar || '');
            } catch {}
          }
        }

        db.prepare('UPDATE teams SET mentor_id = ? WHERE id = ?').run(finalSqlMentorId, sqlTeam.id);

        const now = new Date().toISOString();
        const actDesc = mentorId
          ? `Admin assigned mentor ${mentorName} to team "${teamName}"`
          : `Admin removed mentor assignment from team "${teamName}"`;

        try {
          db.prepare(`
            INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
            VALUES (?, ?, 'MENTOR_ASSIGNED', ?, 'team', ?, ?)
          `).run(`act_${Date.now()}`, adminId, actDesc, sqlTeam.id, now);
        } catch {}

        if (finalSqlMentorId) {
          try {
            db.prepare(`
              INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
              VALUES (?, ?, 'New Team Assigned', ?, 'team', 0, '/mentor/teams', ?)
            `).run(`notif_${Date.now()}`, finalSqlMentorId, `You have been assigned as mentor for "${teamName}".`, now);
          } catch {}
        }
      }
    } catch (sqlErr) {
      console.warn('[SQLite assignTeamMentor error]', sqlErr);
    }

    if (!teamFound) {
      res.status(404).json({ success: false, message: 'Team not found.' });
      return;
    }

    res.json({
      success: true,
      message: mentorId ? `Mentor ${mentorName} assigned to team "${teamName}" successfully.` : `Mentor unassigned from team "${teamName}".`
    });
  } catch (error: any) {
    console.error('[Assign Mentor Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, status } = req.query;
    const isMongoReady = mongoose.connection.readyState === 1;

    let allProjects: any[] = [];
    const seenTitles = new Set<string>();

    if (isMongoReady) {
      try {
        const mongoProjects = await Project.find()
          .populate({
            path: 'teamId',
            populate: [
              { path: 'leaderId', select: 'name email' },
              { path: 'mentorId', select: 'name email' }
            ]
          })
          .sort({ progressPercentage: -1 })
          .lean();

        for (const p of mongoProjects) {
          const team = p.teamId as any;
          const leader = team?.leaderId as any;
          const mentor = team?.mentorId as any;
          const item = {
            id: p._id.toString(),
            title: p.title,
            description: p.description,
            tech_stack: JSON.stringify(p.techStack || []),
            techStack: p.techStack || [],
            repo_url: p.githubUrl,
            status: p.status,
            deadline: p.deadline,
            progress: p.progressPercentage,
            created_at: p.createdAt,
            team_id: team ? (team._id ? team._id.toString() : String(team)) : null,
            team_name: team?.name || 'Unassigned',
            leader_name: leader?.name || 'Student Leader',
            mentor_name: mentor?.name || 'Unassigned'
          };
          allProjects.push(item);
          seenTitles.add(p.title.trim().toLowerCase());
        }
      } catch (mErr) {
        console.warn('[MongoDB getAdminProjects error]', mErr);
      }
    }

    try {
      const sqlProjects = db.prepare(`
        SELECT p.id, p.title, p.description, p.tech_stack, p.repo_url, p.status, p.deadline, p.progress, p.created_at,
               t.id as team_id, t.name as team_name,
               lu.name as leader_name,
               mu.name as mentor_name
        FROM projects p
        LEFT JOIN teams t ON t.project_id = p.id
        LEFT JOIN users lu ON t.leader_id = lu.id
        LEFT JOIN users mu ON t.mentor_id = mu.id
        ORDER BY p.progress DESC
      `).all() as any[];

      for (const sp of sqlProjects) {
        if (!seenTitles.has(sp.title.trim().toLowerCase())) {
          allProjects.push({
            ...sp,
            techStack: sp.tech_stack ? (typeof sp.tech_stack === 'string' ? JSON.parse(sp.tech_stack) : sp.tech_stack) : []
          });
          seenTitles.add(sp.title.trim().toLowerCase());
        }
      }
    } catch {}

    if (search) {
      const term = String(search).toLowerCase();
      allProjects = allProjects.filter((p) =>
        p.title?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.team_name?.toLowerCase().includes(term)
      );
    }

    if (status && status !== 'all') {
      allProjects = allProjects.filter((p) => p.status === status);
    }

    res.json({ success: true, count: allProjects.length, data: allProjects });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminAnnouncements = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const announcements = db.prepare(`
      SELECT a.id, a.title, a.message, a.audience, a.created_at,
             u.name as author_name, u.email as author_email
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      ORDER BY a.created_at DESC
    `).all() as any[];

    res.json({ success: true, count: announcements.length, data: announcements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAdminAnnouncement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, message, audience } = req.body;
    const adminId = req.user?.id || 'usr_admin_1';

    if (!title || !message || !audience) {
      res.status(400).json({ success: false, message: 'Title, message, and audience are required.' });
      return;
    }

    if (!['all', 'students', 'mentors'].includes(audience)) {
      res.status(400).json({ success: false, message: 'Audience must be "all", "students", or "mentors".' });
      return;
    }

    const annId = `ann_${Date.now()}`;
    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO announcements (id, author_id, title, message, audience, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(annId, adminId, title.trim(), message.trim(), audience, now);

      // Log activity
      db.prepare(`
        INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
        VALUES (?, ?, 'ANNOUNCEMENT_PUBLISHED', ?, 'announcement', ?, ?)
      `).run(`act_${Date.now()}`, adminId, `Published announcement "${title.trim()}" for ${audience}`, annId, now);

      // Notify targeted audience
      let userQuery = "SELECT id FROM users WHERE status = 'active'";
      if (audience === 'students') userQuery += " AND role = 'student'";
      if (audience === 'mentors') userQuery += " AND role = 'mentor'";

      const targetUsers = db.prepare(userQuery).all() as any[];
      const insertNotif = db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
        VALUES (?, ?, ?, ?, 'announcement', 0, ?, ?)
      `);

      for (const u of targetUsers) {
        insertNotif.run(`notif_${Date.now()}_${u.id}`, u.id, `Announcement: ${title.trim()}`, message.trim().slice(0, 100), '/notifications', now);
      }

      db.exec('COMMIT;');

      res.status(201).json({
        success: true,
        message: 'Announcement published successfully.',
        data: { id: annId, title, message, audience, createdAt: now }
      });
    } catch (err: any) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // 1. Projects by Status
    const projectsByStatus = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM projects
      GROUP BY status
    `).all() as any[];

    // 2. Team-to-Mentor Assignments
    const mentorWorkload = db.prepare(`
      SELECT u.id as mentor_id, u.name as mentor_name,
             COALESCE(mp.department, 'Engineering') as department,
             COUNT(t.id) as team_count
      FROM users u
      LEFT JOIN mentor_profiles mp ON u.id = mp.user_id
      LEFT JOIN teams t ON u.id = t.mentor_id AND t.status = 'active'
      WHERE u.role = 'mentor' AND u.status = 'active'
      GROUP BY u.id
      ORDER BY team_count DESC
    `).all() as any[];

    // 3. Overdue Submissions
    const overdueSubmissions = db.prepare(`
      SELECT ws.id, ws.week, ws.date as deadline, ws.status,
             t.name as team_name,
             p.title as project_title,
             mu.name as mentor_name
      FROM weekly_submissions ws
      JOIN teams t ON ws.team_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users mu ON t.mentor_id = mu.id
      WHERE ws.status = 'PENDING' AND ws.date < date('now')
      ORDER BY ws.date ASC
    `).all() as any[];

    // 4. Overall completion rate
    const avgProgressRow = db.prepare('SELECT AVG(progress) as avg_progress FROM projects').get() as any;

    res.json({
      success: true,
      data: {
        projectsByStatus,
        mentorWorkload,
        overdueSubmissions,
        averageProgress: Math.round(avgProgressRow?.avg_progress || 0)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAdminSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const settings = req.body;
    if (typeof settings !== 'object') {
      res.status(400).json({ success: false, message: 'Settings must be an object of key-value pairs.' });
      return;
    }

    const upsertSetting = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    for (const [key, value] of Object.entries(settings)) {
      upsertSetting.run(key, String(value));
    }

    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
