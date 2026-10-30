import { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { useMongo } from '../config/storageMode';
import { connectDB } from '../config/db';
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
  ActivityEvent,
  Setting
} from '../models';

const escapeRegex = (str: string) => String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getAdminDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Ensure MongoDB connection before deciding which store to use
    try { await connectDB(); } catch {}
    const isMongoReady = useMongo();
    let totalStudents = 0;
    let totalMentors = 0;

    if (isMongoReady) {
      // MongoDB counts
      totalStudents = await User.countDocuments({ role: 'STUDENT' });
      totalMentors = await User.countDocuments({ role: 'MENTOR' });

      // Add any SQLite-only users that aren't mirrored yet (dual-read)
      try {
        const sqliteStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get() as any;
        const sqliteMentors = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'mentor'").get() as any;
        const mongoStudentEmails = new Set((await User.find({ role: 'STUDENT' }).select('email').lean()).map((u: any) => u.email.toLowerCase()));
        const mongoMentorEmails = new Set((await User.find({ role: 'MENTOR' }).select('email').lean()).map((u: any) => u.email.toLowerCase()));
        const sqliteStudentRows = db.prepare("SELECT email FROM users WHERE role = 'student'").all() as any[];
        const sqliteMentorRows = db.prepare("SELECT email FROM users WHERE role = 'mentor'").all() as any[];
        const extraStudents = sqliteStudentRows.filter((r: any) => !mongoStudentEmails.has((r.email || '').toLowerCase())).length;
        const extraMentors = sqliteMentorRows.filter((r: any) => !mongoMentorEmails.has((r.email || '').toLowerCase())).length;
        totalStudents += extraStudents;
        totalMentors += extraMentors;
      } catch {}
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
        activeTeams = await Team.countDocuments({ status: 'active' });
        teamsWithoutMentors = await Team.countDocuments({
          status: 'active',
          $or: [{ mentorId: null }, { mentorId: { $exists: false } }]
        });
      } catch {}
      // Also include SQLite-only teams not yet mirrored
      try {
        const sqlActiveTeams = db.prepare("SELECT COUNT(*) as count FROM teams WHERE status = 'active'").get() as any;
        const mongoTeamNames = new Set((await Team.find({ status: 'active' }).select('name').lean()).map((t: any) => (t.name || '').trim().toLowerCase()));
        const sqlTeamNames = db.prepare("SELECT name FROM teams WHERE status = 'active'").all() as any[];
        const extraActive = sqlTeamNames.filter((r: any) => !mongoTeamNames.has((r.name || '').trim().toLowerCase())).length;
        activeTeams += extraActive;
      } catch {}
    } else {
      try {
        const activeTeamsRow = db.prepare("SELECT COUNT(*) as count FROM teams WHERE status = 'active'").get() as any;
        const teamsWithoutMentorsRow = db.prepare("SELECT COUNT(*) as count FROM teams WHERE mentor_id IS NULL AND status = 'active'").get() as any;
        activeTeams = activeTeamsRow?.count || 0;
        teamsWithoutMentors = teamsWithoutMentorsRow?.count || 0;
      } catch {
        // Teams table empty or not initialized yet
      }
    }

    const summary = {
      totalStudents,
      totalMentors,
      activeTeams,
      teamsWithoutMentors
    };

    // 2. Teams & Project Overview (Dual Database Fetch)
    let teams: any[] = [];
    const seenNames = new Set<string>();

    if (isMongoReady) {
      try {
        const mongoTeams = await Team.find()
          .populate('leaderId', 'name email avatar')
          .populate('mentorId', 'name email avatar')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();

        const tIds = mongoTeams.map((t: any) => t._id);
        const mongoProjs = await Project.find({ teamId: { $in: tIds } }).lean();
        const pMap = new Map(mongoProjs.map((p: any) => [p.teamId.toString(), p]));

        for (const t of mongoTeams) {
          const proj = pMap.get(t._id.toString());
          const leader = t.leaderId as any;
          const mentor = t.mentorId as any;
          teams.push({
            id: t._id.toString(),
            name: t.name,
            team_status: 'active',
            year_cohort: t.yearCohort || '3rd Year',
            project_id: proj ? proj._id.toString() : null,
            project_title: proj?.title || null,
            project_progress: proj?.progressPercentage || 0,
            project_status: proj?.status || 'ON_TRACK',
            leader_name: leader?.name || 'Student Leader',
            leader_email: leader?.email || '',
            mentor_id: mentor ? (mentor._id ? mentor._id.toString() : String(mentor)) : null,
            mentor_name: mentor?.name || null,
            mentor_email: mentor?.email || null
          });
          seenNames.add(t.name.trim().toLowerCase());
        }
      } catch (mErr) {
        console.warn('[MongoDB getAdminDashboard teams notice]', mErr);
      }
    }

    // Always try SQLite teams too (dual-read) so teams created before mirror are visible
    try {
      const sqlTeams = db.prepare(`
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

      for (const st of sqlTeams) {
        if (!seenNames.has(st.name.trim().toLowerCase())) {
          teams.push(st);
          seenNames.add(st.name.trim().toLowerCase());
        }
      }
    } catch {}

    // 3. Needs Attention
    let needsAttention: any[] = [];
    const seenNeedsAttention = new Set<string>();

    if (isMongoReady) {
      try {
        const unassignedMongoTeams = await Team.find({
          $or: [{ mentorId: null }, { mentorId: { $exists: false } }]
        }).sort({ createdAt: -1 }).limit(5).lean();

        for (const ut of unassignedMongoTeams) {
          needsAttention.push({
            id: ut._id.toString(),
            name: ut.name,
            reason: 'No mentor assigned',
            item_type: 'team'
          });
          seenNeedsAttention.add(ut.name.trim().toLowerCase());
        }
      } catch (mErr) {
        console.warn('[MongoDB needsAttention notice]', mErr);
      }
    }

    if (!isMongoReady) {
      try {
        const unassignedTeams = db.prepare(`
          SELECT t.id, t.name, 'No mentor assigned' as reason, 'team' as item_type
          FROM teams t
          WHERE t.mentor_id IS NULL AND t.status = 'active'
          LIMIT 5
        `).all() as any[];

        for (const ut of unassignedTeams) {
          if (!seenNeedsAttention.has(ut.name.trim().toLowerCase())) {
            needsAttention.push(ut);
            seenNeedsAttention.add(ut.name.trim().toLowerCase());
          }
        }

        const overdueTeams = db.prepare(`
          SELECT DISTINCT t.id, t.name, 'Has overdue progress submission' as reason, 'submission' as item_type
          FROM weekly_submissions ws
          JOIN teams t ON ws.team_id = t.id
          WHERE ws.status = 'PENDING' AND ws.date < date('now')
          LIMIT 5
        `).all() as any[];

        needsAttention = [...needsAttention, ...overdueTeams];
      } catch {}
    }

    // 4. Recent Activity
    let recentActivity: any[] = [];
    if (isMongoReady) {
      try {
        const events = await ActivityEvent.find()
          .populate('userId', 'name')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
        recentActivity = events.map((event: any) => ({
          id: event._id.toString(),
          action_type: event.actionType,
          description: event.description,
          created_at: event.createdAt,
          user_name: event.userId?.name || 'System'
        }));
      } catch {}
    } else {
      try {
        recentActivity = db.prepare(`
          SELECT ae.id, ae.action_type, ae.description, ae.created_at, u.name as user_name
          FROM activity_events ae
          LEFT JOIN users u ON ae.user_id = u.id
          ORDER BY ae.created_at DESC
          LIMIT 10
        `).all() as any[];
      } catch {}
    }

    // 5. Mentor Workload
    let mentorAssignments: any[] = [];
    if (isMongoReady) {
      try {
        const mentorUsers = await User.find({ role: 'MENTOR' }).sort({ name: 1 }).lean();
        const mIds = mentorUsers.map((m: any) => m._id);
        const teamCounts = await Team.aggregate([
          { $match: { mentorId: { $in: mIds } } },
          { $group: { _id: '$mentorId', count: { $sum: 1 } } }
        ]);
        const countMap = new Map(teamCounts.map((tc: any) => [tc._id.toString(), tc.count]));

        mentorAssignments = mentorUsers.map((m: any) => ({
          id: m._id.toString(),
          name: m.name,
          email: m.email,
          status: m.status ? m.status.toLowerCase() : 'active',
          department: m.department || 'Computer Science',
          team_count: countMap.get(m._id.toString()) || 0
        }));
      } catch (err) {
        console.warn('[MongoDB mentor workload notice]', err);
      }
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

    // Dual-read: merge any SQLite-only mentors not in mentorAssignments
    try {
      const sqliteMentorRows = db.prepare(`
        SELECT u.id, u.name, u.email, u.status,
               COALESCE(mp.department, 'Computer Science') as department,
               COUNT(t.id) as team_count
        FROM users u
        LEFT JOIN mentor_profiles mp ON u.id = mp.user_id
        LEFT JOIN teams t ON u.id = t.mentor_id AND t.status = 'active'
        WHERE u.role = 'mentor'
        GROUP BY u.id
      `).all() as any[];
      const existingMentorEmails = new Set(mentorAssignments.map((m: any) => (m.email || '').toLowerCase()));
      for (const row of sqliteMentorRows) {
        if (!existingMentorEmails.has((row.email || '').toLowerCase())) {
          mentorAssignments.push({ ...row, status: String(row.status || 'active').toLowerCase() });
        }
      }
    } catch {}

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
    try { await connectDB(); } catch {}
    const isMongoReady = useMongo();

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

      // Also merge any SQLite-only students (e.g. seeded demo data) not in MongoDB
      const sqliteStudents = db.prepare(`
        SELECT u.id, u.name, u.email, u.status, u.avatar, u.created_at,
               sp.department, sp.year_cohort, sp.roll_number
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE u.role = 'student'
      `).all() as any[];
      const mongoEmails = new Set(formatted.map((s: any) => s.email.toLowerCase()));
      for (const row of sqliteStudents) {
        if (!mongoEmails.has((row.email || '').toLowerCase())) {
          formatted.push({
            id: row.id, name: row.name, email: row.email,
            status: String(row.status || 'active').toLowerCase(),
            avatar: row.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
            created_at: row.created_at,
            department: row.department || 'Computer Science',
            year_cohort: row.year_cohort || '1st Year',
            roll_number: row.roll_number || 'N/A',
            team_id: null, team_name: null, team_role: null
          });
        }
      }

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
    try { await connectDB(); } catch {}
    const isMongoReady = useMongo();
    const mentors: any[] = [];

    if (isMongoReady) {
      const docs = await User.find({ role: 'MENTOR' }).sort({ name: 1 });
      const counts = await Team.aggregate([
        { $match: { mentorId: { $in: docs.map((doc) => doc._id) } } },
        { $group: { _id: '$mentorId', count: { $sum: 1 } } }
      ]);
      const countMap = new Map(counts.map((row: any) => [row._id.toString(), row.count]));

      for (const m of docs) {
        mentors.push({
          id: m._id.toString(),
          name: m.name,
          email: m.email,
          status: String(m.status).toLowerCase(),
          avatar: m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          department: m.department || 'Computer Science',
          title: m.title || 'Faculty Mentor',
          bio: m.bio || null,
          phone: m.phone || null,
          team_count: countMap.get(m._id.toString()) || 0,
          mustChangePassword: Boolean(m.mustChangePassword),
          temporaryPasswordExpiresAt: m.tempPasswordExpiresAt || null,
          created_at: m.createdAt
        });
      }
    } else {
      const rows = db.prepare(`
        SELECT u.id, u.name, u.email, u.status, u.avatar, u.created_at,
               u.must_change_password, u.temp_password_expires_at,
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

      for (const row of rows) {
        mentors.push({
          ...row,
          status: String(row.status).toLowerCase(),
          mustChangePassword: Boolean(row.must_change_password),
          temporaryPasswordExpiresAt: row.temp_password_expires_at || null
        });
      }
    }

    // Dual-read: also include SQLite-only mentors not in MongoDB
    if (isMongoReady) {
      const sqliteMentors = db.prepare(`
        SELECT u.id, u.name, u.email, u.status, u.avatar, u.created_at,
               u.must_change_password, u.temp_password_expires_at,
               COALESCE(mp.department, 'Computer Science') as department,
               mp.title, mp.bio, mp.phone, 0 as team_count
        FROM users u
        LEFT JOIN mentor_profiles mp ON u.id = mp.user_id
        WHERE u.role = 'mentor'
      `).all() as any[];
      const existingEmails = new Set(mentors.map((m: any) => m.email.toLowerCase()));
      for (const row of sqliteMentors) {
        if (!existingEmails.has((row.email || '').toLowerCase())) {
          mentors.push({
            ...row,
            status: String(row.status || 'active').toLowerCase(),
            mustChangePassword: Boolean(row.must_change_password),
            temporaryPasswordExpiresAt: row.temp_password_expires_at || null
          });
        }
      }
    }

    res.json({ success: true, count: mentors.length, data: mentors });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Unable to load mentors.' });
  }
};

const TEMP_PASSWORD_TTL_HOURS = Number(process.env.TEMP_PASSWORD_TTL_HOURS || 72);

const generateTemporaryPassword = (): string => {
  return `Temp-${crypto.randomBytes(12).toString('base64url')}`;
};

const temporaryPasswordExpiry = (): Date => {
  return new Date(Date.now() + TEMP_PASSWORD_TTL_HOURS * 60 * 60 * 1000);
};

export const addAdminMentor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    try { await connectDB(); } catch {}
    const { name, email, department } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Name is required (at least 2 characters).' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Please provide a valid institutional email address.' });
      return;
    }

    if (!department || typeof department !== 'string' || department.trim().length < 2) {
      res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Department is required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const normalizedDepartment = department.trim();
    const isMongoReady = useMongo();

    const tempPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const expiresAt = temporaryPasswordExpiry();
    const avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

    let mentorId: string;

    if (isMongoReady) {
      const existingMongo = await User.findOne({ email: normalizedEmail })
        .collation({ locale: 'en', strength: 2 });
      if (existingMongo) {
        res.status(409).json({ success: false, code: 'EMAIL_EXISTS', message: 'A user with this email address already exists.' });
        return;
      }

      const created = await User.create({
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role: 'MENTOR',
        status: 'ACTIVE',
        department: normalizedDepartment,
        title: 'Faculty Mentor',
        avatar,
        mustChangePassword: true,
        tempPasswordIssuedAt: new Date(),
        tempPasswordExpiresAt: expiresAt,
        tempPasswordAttempts: 0,
        tempPasswordConsumedAt: null
      });
      mentorId = created._id.toString();
    } else {
      const existingSQLite = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(normalizedEmail) as any;
      if (existingSQLite) {
        res.status(409).json({ success: false, code: 'EMAIL_EXISTS', message: 'A user with this email address already exists.' });
        return;
      }

      mentorId = `usr_mentor_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      try {
        db.exec('BEGIN');
        db.prepare(`
          INSERT INTO users (
            id, name, email, password_hash, role, status, avatar,
            must_change_password, temp_password_issued_at, temp_password_expires_at, temp_password_attempts
          )
          VALUES (?, ?, ?, ?, 'mentor', 'active', ?, 1, CURRENT_TIMESTAMP, ?, 0)
        `).run(mentorId, normalizedName, normalizedEmail, passwordHash, avatar, expiresAt.toISOString());

        db.prepare(`
          INSERT INTO mentor_profiles (id, user_id, department, title)
          VALUES (?, ?, ?, 'Faculty Mentor')
        `).run(`mp_${mentorId}`, mentorId, normalizedDepartment);

        db.exec('COMMIT');
      } catch (writeErr) {
        try { db.exec('ROLLBACK'); } catch {}
        throw writeErr;
      }
    }

    // Mirror the new mentor into SQLite so it's visible even when the next
    // request hits a serverless instance without an active MongoDB connection.
    if (isMongoReady) {
      try {
        const existsInSqlite = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(normalizedEmail) as any;
        if (!existsInSqlite) {
          db.prepare(`
            INSERT INTO users (id, name, email, password_hash, role, status, avatar,
              must_change_password, temp_password_issued_at, temp_password_expires_at, temp_password_attempts)
            VALUES (?, ?, ?, ?, 'mentor', 'active', ?, 1, CURRENT_TIMESTAMP, ?, 0)
          `).run(mentorId, normalizedName, normalizedEmail, passwordHash, avatar, expiresAt.toISOString());
          try {
            db.prepare(`INSERT INTO mentor_profiles (id, user_id, department, title) VALUES (?, ?, ?, 'Faculty Mentor')`)
              .run(`mp_${mentorId}`, mentorId, normalizedDepartment);
          } catch {}
        }
      } catch (sqlMirrorErr) {
        console.warn('[Mentor SQLite Mirror Warning]', sqlMirrorErr);
      }
    }

    try {
      db.prepare(`
        INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id)
        VALUES (?, ?, 'MENTOR_ADDED', ?, 'user', ?)
      `).run(`act_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`, req.user?.id || '', `Admin added faculty mentor ${normalizedName} (${normalizedDepartment})`, mentorId);
    } catch {}

    // The plaintext temporary password is returned exactly once and never logged.
    res.status(201).json({
      success: true,
      message: 'Mentor account created successfully. No invitation email was sent; please share the temporary credentials with the mentor privately.',
      data: {
        id: mentorId,
        name: normalizedName,
        email: normalizedEmail,
        department: normalizedDepartment,
        role: 'mentor',
        status: 'active',
        temporaryPassword: tempPassword,
        temporaryPasswordExpiresAt: expiresAt.toISOString(),
        mustChangePassword: true,
        delivery: 'manual',
        notice: 'No invitation email was sent. Please share this temporary password securely with the mentor.'
      }
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({ success: false, code: 'EMAIL_EXISTS', message: 'A user with this email address already exists.' });
      return;
    }
    console.error('[Add Mentor Error]', error?.message || error);
    res.status(500).json({ success: false, message: 'Failed to create mentor. No account was created.' });
  }
};

const normalizeMentorStatus = (value: unknown): 'ACTIVE' | 'BLOCKED' => {
  const norm = String(value || '').toUpperCase();
  return norm === 'BLOCKED' || norm === 'INACTIVE' ? 'BLOCKED' : 'ACTIVE';
};

export const updateAdminMentor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, department, status } = req.body;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      res.status(400).json({ success: false, message: 'Name must be at least 2 characters.' });
      return;
    }
    if (department !== undefined && (typeof department !== 'string' || department.trim().length < 2)) {
      res.status(400).json({ success: false, message: 'Department is required.' });
      return;
    }

    if (useMongo()) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(404).json({ success: false, message: 'Mentor not found.' });
        return;
      }
      const mentor = await User.findOne({ _id: id, role: 'MENTOR' });
      if (!mentor) {
        res.status(404).json({ success: false, message: 'Mentor not found.' });
        return;
      }

      if (typeof name === 'string') mentor.name = name.trim();
      if (typeof department === 'string') mentor.department = department.trim();
      if (status !== undefined) mentor.status = normalizeMentorStatus(status);

      await mentor.save();

      res.json({
        success: true,
        message: 'Mentor profile updated successfully.',
        data: {
          id: mentor._id.toString(),
          name: mentor.name,
          email: mentor.email,
          department: mentor.department,
          status: String(mentor.status).toLowerCase()
        }
      });
      return;
    }

    const row = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'mentor'").get(id) as any;
    if (!row) {
      res.status(404).json({ success: false, message: 'Mentor not found.' });
      return;
    }

    const nextName = typeof name === 'string' ? name.trim() : row.name;
    const nextStatus = status !== undefined ? normalizeMentorStatus(status) : String(row.status).toUpperCase();
    db.prepare('UPDATE users SET name = ?, status = ? WHERE id = ?').run(
      nextName,
      nextStatus === 'ACTIVE' ? 'active' : 'inactive',
      id
    );

    if (typeof department === 'string') {
      db.prepare(`
        INSERT INTO mentor_profiles (id, user_id, department, title)
        VALUES (?, ?, ?, 'Faculty Mentor')
        ON CONFLICT(user_id) DO UPDATE SET department = excluded.department
      `).run(`mp_${id}`, id, department.trim());
    }

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    const profile = db.prepare('SELECT department FROM mentor_profiles WHERE user_id = ?').get(id) as any;

    res.json({
      success: true,
      message: 'Mentor profile updated successfully.',
      data: {
        id,
        name: updated.name,
        email: updated.email,
        department: profile?.department || 'Computer Science',
        status: String(updated.status).toLowerCase()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Unable to update mentor.' });
  }
};

export const updateMentorStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const targetStatus = normalizeMentorStatus(req.body?.status);

    if (useMongo()) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(404).json({ success: false, message: 'Mentor not found.' });
        return;
      }
      const mentor = await User.findOne({ _id: id, role: 'MENTOR' });
      if (!mentor) {
        res.status(404).json({ success: false, message: 'Mentor not found.' });
        return;
      }
      mentor.status = targetStatus;
      await mentor.save();
    } else {
      const result = db.prepare("UPDATE users SET status = ? WHERE id = ? AND role = 'mentor'").run(
        targetStatus === 'ACTIVE' ? 'active' : 'inactive',
        id
      );
      if (!result.changes) {
        res.status(404).json({ success: false, message: 'Mentor not found.' });
        return;
      }
    }

    res.json({
      success: true,
      message: `Mentor marked as ${targetStatus.toLowerCase()}.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Unable to update mentor status.' });
  }
};

export const reissueMentorTemporaryPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const expiresAt = temporaryPasswordExpiry();

    if (useMongo()) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(404).json({ success: false, message: 'Mentor not found.' });
        return;
      }
      const mentor = await User.findOne({ _id: id, role: 'MENTOR' }).select('+passwordHash');
      if (!mentor) {
        res.status(404).json({ success: false, message: 'Mentor not found.' });
        return;
      }
      mentor.passwordHash = passwordHash;
      mentor.mustChangePassword = true;
      mentor.tempPasswordIssuedAt = new Date();
      mentor.tempPasswordExpiresAt = expiresAt;
      mentor.tempPasswordAttempts = 0;
      mentor.tempPasswordConsumedAt = null;
      await mentor.save();
    } else {
      const result = db.prepare(`
        UPDATE users
        SET password_hash = ?, must_change_password = 1, temp_password_issued_at = CURRENT_TIMESTAMP,
            temp_password_expires_at = ?, temp_password_attempts = 0, temp_password_consumed_at = NULL
        WHERE id = ? AND role = 'mentor'
      `).run(passwordHash, expiresAt.toISOString(), id);
      if (!result.changes) {
        res.status(404).json({ success: false, message: 'Mentor not found.' });
        return;
      }
    }

    res.json({
      success: true,
      message: 'A new temporary password was issued. The previous one is no longer valid.',
      data: {
        id,
        temporaryPassword: tempPassword,
        temporaryPasswordExpiresAt: expiresAt.toISOString(),
        mustChangePassword: true,
        delivery: 'manual'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Unable to issue a temporary password.' });
  }
};

export const deleteAdminMentor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (useMongo()) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(404).json({ success: false, message: 'Mentor not found.' });
        return;
      }
      const mentor = await User.findOne({ _id: id, role: 'MENTOR' });
      if (!mentor) {
        res.status(404).json({ success: false, message: 'Mentor not found.' });
        return;
      }
      await Team.updateMany({ mentorId: mentor._id }, { $set: { mentorId: null } });
      await User.deleteOne({ _id: mentor._id });
    } else {
      const row = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'mentor'").get(id) as any;
      if (!row) {
        res.status(404).json({ success: false, message: 'Mentor not found.' });
        return;
      }
      db.prepare('UPDATE teams SET mentor_id = NULL WHERE mentor_id = ?').run(id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
    }

    try {
      db.prepare(`
        INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id)
        VALUES (?, ?, 'MENTOR_REMOVED', ?, 'user', ?)
      `).run(`act_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`, req.user?.id || '', `Admin removed mentor ${id}`, id);
    } catch {}

    res.json({ success: true, message: 'Mentor removed successfully.', data: { id } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Unable to remove mentor.' });
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
    const rawId = req.params.id;
    const teamParam = decodeURIComponent(String(rawId || '').trim());
    const rawMentorId = req.body?.mentorId;
    const rawTeamName = req.body?.teamName || req.body?.name;
    const rawTeamId = req.body?.teamId;
    const isUnassign = !rawMentorId || rawMentorId === 'unassigned' || rawMentorId === 'none' || String(rawMentorId).trim() === '';
    const cleanMentorId = isUnassign ? null : String(rawMentorId).trim();
    const adminId = req.user?.id || 'usr_admin_1';
    const isMongoReady = mongoose.connection.readyState === 1;

    // 1. Resolve Team across SQLite & MongoDB
    let sqlTeam: any = null;
    let mTeam: any = null;

    // Try SQLite lookup
    try {
      sqlTeam = db.prepare(`
        SELECT id, name, mentor_id, year_cohort, department FROM teams 
        WHERE id = ? OR name = ? OR (id = ? AND ? != '') OR (name = ? AND ? != '') COLLATE NOCASE
      `).get(teamParam, teamParam, rawTeamId || '', rawTeamId || '', rawTeamName || '', rawTeamName || '') as any;
    } catch {}

    // Try MongoDB lookup
    if (isMongoReady) {
      try {
        const candidateIds = [teamParam, rawTeamId].filter((x) => x && mongoose.Types.ObjectId.isValid(x));
        for (const cid of candidateIds) {
          mTeam = await Team.findById(cid);
          if (mTeam) break;
        }

        const candidateNames = [rawTeamName, teamParam, sqlTeam?.name].filter(Boolean);
        for (const cname of candidateNames) {
          if (mTeam) break;
          mTeam = await Team.findOne({ name: { $regex: new RegExp(`^${escapeRegex(cname)}$`, 'i') } });
        }

        // Fallback: search Project by title
        if (!mTeam) {
          for (const cname of candidateNames) {
            const proj = await Project.findOne({ title: { $regex: new RegExp(`^${escapeRegex(cname)}$`, 'i') } });
            if (proj && proj.teamId) {
              mTeam = await Team.findById(proj.teamId);
              if (mTeam) break;
            }
          }
        }
      } catch (mErr) {
        console.warn('[MongoDB team lookup notice]', mErr);
      }
    }

    // Cross-bridge: If found in Mongo but not in SQLite, look up or mirror into SQLite
    if (!sqlTeam && mTeam?.name) {
      try {
        sqlTeam = db.prepare('SELECT id, name, mentor_id, year_cohort, department FROM teams WHERE name = ? COLLATE NOCASE OR id = ?').get(mTeam.name, mTeam._id.toString()) as any;
      } catch {}
    }

    // Cross-bridge: If found in SQLite but not in Mongo, find in Mongo by name
    if (sqlTeam && !mTeam && isMongoReady) {
      try {
        mTeam = await Team.findOne({ name: { $regex: new RegExp(`^${escapeRegex(sqlTeam.name)}$`, 'i') } });
      } catch {}
    }

    if (!sqlTeam && !mTeam) {
      res.status(404).json({ success: false, message: 'Team not found in database.' });
      return;
    }

    const teamName = mTeam?.name || sqlTeam?.name || rawTeamName || 'Team';

    // 2. Handle Unassign
    if (isUnassign) {
      if (mTeam) {
        mTeam.mentorId = null;
        await mTeam.save();
      }
      if (sqlTeam) {
        db.prepare('UPDATE teams SET mentor_id = NULL WHERE id = ?').run(sqlTeam.id);
      }

      const now = new Date().toISOString();
      try {
        db.prepare(`
          INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
          VALUES (?, ?, 'MENTOR_UNASSIGNED', ?, 'team', ?, ?)
        `).run(`act_${Date.now()}`, adminId, `Admin removed mentor assignment from team "${teamName}"`, sqlTeam?.id || mTeam?._id.toString(), now);
      } catch {}

      res.json({
        success: true,
        message: `Mentor unassigned from team "${teamName}" successfully.`
      });
      return;
    }

    // 3. Resolve & Validate Mentor
    let mongoMentorDoc: any = null;
    let sqlMentorDoc: any = null;

    if (isMongoReady && cleanMentorId) {
      try {
        if (mongoose.Types.ObjectId.isValid(cleanMentorId)) {
          mongoMentorDoc = await User.findById(cleanMentorId);
        }
        if (!mongoMentorDoc) {
          mongoMentorDoc = await User.findOne({
            $or: [
              { email: cleanMentorId.toLowerCase() },
              { name: cleanMentorId }
            ]
          });
        }
      } catch (err) {
        console.warn('[MongoDB mentor lookup notice]', err);
      }
    }

    if (cleanMentorId) {
      try {
        sqlMentorDoc = db.prepare('SELECT id, name, email, role, status, avatar FROM users WHERE id = ? OR email = ? COLLATE NOCASE').get(cleanMentorId, cleanMentorId) as any;
      } catch {}
    }

    // Cross-bridge: If mentor found in SQLite, ensure Mongo has it
    if (sqlMentorDoc && isMongoReady && !mongoMentorDoc && sqlMentorDoc.email) {
      try {
        mongoMentorDoc = await User.findOne({ email: sqlMentorDoc.email.toLowerCase() });
        if (!mongoMentorDoc) {
          mongoMentorDoc = await User.create({
            name: sqlMentorDoc.name,
            email: sqlMentorDoc.email.toLowerCase(),
            passwordHash: 'oauth_managed',
            role: 'MENTOR',
            status: 'ACTIVE',
            department: 'Computer Science',
            avatar: sqlMentorDoc.avatar || ''
          });
        }
      } catch {}
    }

    // Cross-bridge: If mentor found in Mongo, ensure SQLite has it
    if (mongoMentorDoc && !sqlMentorDoc) {
      const sqlId = mongoMentorDoc._id.toString();
      const mEmail = (mongoMentorDoc.email || `${sqlId}@university.edu`).toLowerCase();
      try {
        db.prepare(`
          INSERT OR REPLACE INTO users (id, name, email, password_hash, role, status, avatar)
          VALUES (?, ?, ?, 'managed_auth', 'mentor', 'active', ?)
        `).run(sqlId, mongoMentorDoc.name, mEmail, mongoMentorDoc.avatar || '');
        sqlMentorDoc = { id: sqlId, name: mongoMentorDoc.name, email: mEmail, role: 'mentor', status: 'active' };
      } catch {}
    }

    const mentorName = mongoMentorDoc?.name || sqlMentorDoc?.name;
    const roleStr = String(mongoMentorDoc?.role || sqlMentorDoc?.role || '').toLowerCase();
    const statusStr = String(mongoMentorDoc?.status || sqlMentorDoc?.status || '').toLowerCase();

    if (!mentorName) {
      res.status(400).json({ success: false, message: 'Selected faculty mentor not found.' });
      return;
    }

    if (roleStr !== 'mentor') {
      res.status(400).json({ success: false, message: 'Selected user is not a faculty mentor.' });
      return;
    }
    if (statusStr === 'inactive' || statusStr === 'blocked') {
      res.status(400).json({ success: false, message: 'Cannot assign an inactive mentor.' });
      return;
    }

    // 4. Update MongoDB Team
    if (mTeam && mongoMentorDoc) {
      mTeam.mentorId = mongoMentorDoc._id;
      await mTeam.save();
    } else if (isMongoReady && !mTeam && sqlTeam && mongoMentorDoc) {
      try {
        let defaultLeader = await User.findOne({ role: 'STUDENT' }) || await User.findOne();
        mTeam = await Team.create({
          name: sqlTeam.name,
          yearCohort: sqlTeam.year_cohort || '3rd Year',
          leaderId: defaultLeader ? defaultLeader._id : new mongoose.Types.ObjectId(),
          memberIds: defaultLeader ? [defaultLeader._id] : [],
          mentorId: mongoMentorDoc._id,
          department: sqlTeam.department || 'Computer Science'
        });
      } catch (err) {
        console.warn('[MongoDB team create on assign notice]', err);
      }
    }

    // 5. Update SQLite Team
    if (sqlTeam && sqlMentorDoc) {
      db.prepare('UPDATE teams SET mentor_id = ? WHERE id = ?').run(sqlMentorDoc.id, sqlTeam.id);
    } else if (mTeam && !sqlTeam && sqlMentorDoc) {
      const leaderIdStr = mTeam.leaderId ? mTeam.leaderId.toString() : `ldr_${Date.now()}`;
      try {
        db.prepare(`
          INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status, avatar)
          VALUES (?, 'Team Leader', ?, 'managed_auth', 'student', 'active', '')
        `).run(leaderIdStr, `leader_${leaderIdStr}@university.edu`);
      } catch {}

      try {
        db.prepare(`
          INSERT OR REPLACE INTO teams (id, name, leader_id, mentor_id, year_cohort, department, status)
          VALUES (?, ?, ?, ?, ?, ?, 'active')
        `).run(mTeam._id.toString(), mTeam.name, leaderIdStr, sqlMentorDoc.id, mTeam.yearCohort || '3rd Year', mTeam.department || 'Computer Science');
        sqlTeam = { id: mTeam._id.toString(), name: mTeam.name };
      } catch {}
    }

    // 6. Notifications & Activity Logging
    const now = new Date().toISOString();
    try {
      db.prepare(`
        INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
        VALUES (?, ?, 'MENTOR_ASSIGNED', ?, 'team', ?, ?)
      `).run(`act_${Date.now()}`, adminId, `Admin assigned mentor ${mentorName} to team "${teamName}"`, sqlTeam?.id || mTeam?._id.toString(), now);
    } catch {}

    if (sqlMentorDoc?.id) {
      try {
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
          VALUES (?, ?, 'New Team Assigned', ?, 'team', 0, '/mentor/teams', ?)
        `).run(`notif_${Date.now()}`, sqlMentorDoc.id, `You have been assigned as mentor for "${teamName}".`, now);
      } catch {}
    }

    res.json({
      success: true,
      message: `Mentor ${mentorName} assigned to team "${teamName}" successfully.`
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
    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady) {
      try {
        const mongoAnnouncements = await Announcement.find()
          .populate('authorId', 'name email')
          .sort({ createdAt: -1 })
          .lean();

        if (mongoAnnouncements.length > 0) {
          const formatted = mongoAnnouncements.map((a: any) => ({
            id: a._id.toString(),
            title: a.title,
            message: a.message,
            audience: a.audience,
            created_at: a.createdAt,
            author_name: (a.authorId as any)?.name || 'Administrator',
            author_email: (a.authorId as any)?.email || ''
          }));

          res.json({ success: true, count: formatted.length, data: formatted });
          return;
        }
      } catch (mErr) {
        console.warn('[MongoDB getAdminAnnouncements notice]', mErr);
      }
    }

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
    const adminEmail = (req.user?.email || '').toLowerCase();
    const isMongoReady = mongoose.connection.readyState === 1;

    if (!title || !message || !audience) {
      res.status(400).json({ success: false, message: 'Title, message, and audience are required.' });
      return;
    }

    if (!['all', 'students', 'mentors'].includes(audience)) {
      res.status(400).json({ success: false, message: 'Audience must be "all", "students", or "mentors".' });
      return;
    }

    let annId = `ann_${Date.now()}`;
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Persist to MongoDB Atlas if connected
    if (isMongoReady) {
      try {
        let adminUser = null;
        if (mongoose.Types.ObjectId.isValid(adminId)) {
          adminUser = await User.findById(adminId);
        }
        if (!adminUser && adminEmail) {
          adminUser = await User.findOne({ email: adminEmail });
        }
        if (!adminUser) {
          adminUser = await User.findOne({ role: 'ADMIN' });
        }

        if (adminUser) {
          const newAnn = await Announcement.create({
            authorId: adminUser._id,
            title: title.trim(),
            message: message.trim(),
            audience
          });

          annId = newAnn._id.toString();

          await ActivityEvent.create({
            userId: adminUser._id,
            actionType: 'ANNOUNCEMENT_PUBLISHED',
            description: `Published announcement "${title.trim()}" for ${audience}`,
            targetType: 'announcement',
            targetId: annId
          });

          const userFilter: any = { status: 'ACTIVE' };
          if (audience === 'students') userFilter.role = 'STUDENT';
          if (audience === 'mentors') userFilter.role = 'MENTOR';

          const targetUsers = await User.find(userFilter).select('_id').lean();
          for (const u of targetUsers) {
            await Notification.create({
              userId: u._id,
              title: `Announcement: ${title.trim()}`,
              message: message.trim().slice(0, 100),
              type: 'announcement',
              link: '/notifications'
            });
          }
        }
      } catch (mErr) {
        console.warn('[MongoDB createAdminAnnouncement notice]', mErr);
      }
    }

    // 2. Persist to SQLite store
    try {
      let sqliteAuthorId = adminId;
      const sqliteAdmin = db.prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE OR id = ?").get(adminEmail, adminId) as any;
      if (sqliteAdmin) {
        sqliteAuthorId = sqliteAdmin.id;
      } else {
        const fallbackAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any;
        if (fallbackAdmin) sqliteAuthorId = fallbackAdmin.id;
      }

      db.exec('BEGIN TRANSACTION;');
      db.prepare(`
        INSERT INTO announcements (id, author_id, title, message, audience, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(annId, sqliteAuthorId, title.trim(), message.trim(), audience, nowIso);

      db.prepare(`
        INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
        VALUES (?, ?, 'ANNOUNCEMENT_PUBLISHED', ?, 'announcement', ?, ?)
      `).run(`act_${Date.now()}`, sqliteAuthorId, `Published announcement "${title.trim()}" for ${audience}`, annId, nowIso);

      let userQuery = "SELECT id FROM users WHERE status = 'active'";
      if (audience === 'students') userQuery += " AND role = 'student'";
      if (audience === 'mentors') userQuery += " AND role = 'mentor'";

      const targetUsers = db.prepare(userQuery).all() as any[];
      const insertNotif = db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
        VALUES (?, ?, ?, ?, 'announcement', 0, ?, ?)
      `);

      for (const u of targetUsers) {
        insertNotif.run(`notif_${Date.now()}_${u.id}`, u.id, `Announcement: ${title.trim()}`, message.trim().slice(0, 100), '/notifications', nowIso);
      }
      db.exec('COMMIT;');
    } catch (sqlErr) {
      try { db.exec('ROLLBACK;'); } catch {}
      console.warn('[SQLite announcement notice]', sqlErr);
    }

    res.status(201).json({
      success: true,
      message: 'Announcement published successfully.',
      data: { id: annId, title, message, audience, createdAt: nowIso }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady) {
      try {
        // 1. Projects by Status
        const projectsByStatusAgg = await Project.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const projectsByStatus = projectsByStatusAgg.map((p) => ({
          status: p._id,
          count: p.count
        }));

        // 2. Mentor Workload
        const mentorUsers = await User.find({ role: 'MENTOR', status: 'ACTIVE' }).sort({ name: 1 }).lean();
        const mIds = mentorUsers.map((m: any) => m._id);
        const teamCounts = await Team.aggregate([
          { $match: { mentorId: { $in: mIds }, status: 'active' } },
          { $group: { _id: '$mentorId', count: { $sum: 1 } } }
        ]);
        const countMap = new Map(teamCounts.map((tc: any) => [tc._id.toString(), tc.count]));

        const mentorWorkload = mentorUsers.map((m: any) => ({
          mentor_id: m._id.toString(),
          mentor_name: m.name,
          department: m.department || 'Computer Science',
          team_count: countMap.get(m._id.toString()) || 0
        })).sort((a, b) => b.team_count - a.team_count);

        // 3. Overdue Submissions
        const now = new Date();
        const overdueSubs = await Progress.find({
          status: { $in: ['PENDING', 'SUBMITTED'] },
          submissionDate: { $lt: now }
        })
          .populate('teamId', 'name mentorId')
          .populate('projectId', 'title')
          .limit(10)
          .lean();

        const overdueSubmissions = overdueSubs.map((ws: any) => {
          const team = ws.teamId as any;
          const proj = ws.projectId as any;
          return {
            id: ws._id.toString(),
            week: ws.weekNumber,
            deadline: ws.submissionDate,
            status: ws.status,
            team_name: team?.name || 'Team',
            project_title: proj?.title || 'Project',
            mentor_name: 'Assigned Mentor'
          };
        });

        // 4. Overall completion rate
        const avgAgg = await Project.aggregate([
          { $group: { _id: null, avgProgress: { $avg: '$progressPercentage' } } }
        ]);
        const averageProgress = Math.round(avgAgg[0]?.avgProgress || 0);

        res.json({
          success: true,
          data: {
            projectsByStatus,
            mentorWorkload,
            overdueSubmissions,
            averageProgress
          }
        });
        return;
      } catch (mErr) {
        console.warn('[MongoDB getAdminReports notice]', mErr);
      }
    }

    // SQLite Fallback
    const projectsByStatus = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM projects
      GROUP BY status
    `).all() as any[];

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
    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady) {
      try {
        const mongoSettings = await Setting.find().lean();
        if (mongoSettings.length > 0) {
          const settings: Record<string, string> = {};
          for (const s of mongoSettings) {
            settings[s.key] = s.value;
          }
          res.json({ success: true, data: settings });
          return;
        }
      } catch (mErr) {
        console.warn('[MongoDB getAdminSettings notice]', mErr);
      }
    }

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
    if (typeof settings !== 'object' || !settings) {
      res.status(400).json({ success: false, message: 'Settings must be an object of key-value pairs.' });
      return;
    }

    const isMongoReady = mongoose.connection.readyState === 1;

    if (isMongoReady) {
      try {
        for (const [key, value] of Object.entries(settings)) {
          await Setting.findOneAndUpdate(
            { key },
            { value: String(value), updatedAt: new Date() },
            { upsert: true, new: true }
          );
        }
      } catch (mErr) {
        console.warn('[MongoDB updateAdminSettings notice]', mErr);
      }
    }

    try {
      const upsertSetting = db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `);

      for (const [key, value] of Object.entries(settings)) {
        upsertSetting.run(key, String(value));
      }
    } catch (sqlErr) {
      console.warn('[SQLite updateSettings notice]', sqlErr);
    }

    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
