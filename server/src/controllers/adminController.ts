import { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../db/database';
import { User } from '../models/User';

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
    try {
      const activeTeamsRow = db.prepare("SELECT COUNT(*) as count FROM teams WHERE status = 'active'").get() as any;
      const teamsWithoutMentorsRow = db.prepare("SELECT COUNT(*) as count FROM teams WHERE mentor_id IS NULL AND status = 'active'").get() as any;
      activeTeams = activeTeamsRow?.count || 0;
      teamsWithoutMentors = teamsWithoutMentorsRow?.count || 0;
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

    if (isMongoReady) {
      const mentors = await User.find({ role: 'MENTOR' }).sort({ name: 1 });

      const formatted = mentors.map((m) => ({
        id: m._id.toString(),
        name: m.name,
        email: m.email,
        status: m.status.toLowerCase(),
        avatar: m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        department: m.department || 'Computer Science',
        title: 'Faculty Mentor',
        bio: null,
        phone: null,
        team_count: 0,
        mustChangePassword: m.mustChangePassword,
        created_at: m.createdAt
      }));

      res.json({ success: true, count: formatted.length, data: formatted });
      return;
    }

    // Local SQLite fallback
    const mentors = db.prepare(`
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

    res.json({ success: true, count: mentors.length, data: mentors });
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

    // Generate strong random temporary password
    const tempPassword = 'Temp_' + crypto.randomBytes(4).toString('hex') + '!' + Math.floor(100 + Math.random() * 900);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    let mentorId = '';

    if (isMongoReady) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        res.status(409).json({ success: false, message: 'A user with this email address already exists.' });
        return;
      }

      const newMentor = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'MENTOR',
        status: 'ACTIVE',
        department: department.trim(),
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        mustChangePassword: true
      });
      mentorId = newMentor._id.toString();
    } else {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail) as any;
      if (existing) {
        res.status(409).json({ success: false, message: 'A user with this email address already exists.' });
        return;
      }
      mentorId = `usr_mentor_${Date.now()}`;
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, status, avatar)
        VALUES (?, ?, ?, ?, 'mentor', 'active', ?)
      `).run(mentorId, name.trim(), normalizedEmail, passwordHash, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80');

      try {
        db.prepare(`
          INSERT INTO mentor_profiles (id, user_id, department, title)
          VALUES (?, ?, ?, 'Faculty Mentor')
        `).run(`mp_${Date.now()}`, mentorId, department.trim());
      } catch {}
    }

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
    const { search, mentorFilter, status, page = '1', limit = '10' } = req.query;

    let countQuery = `
      SELECT COUNT(*) as count
      FROM teams t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users lu ON t.leader_id = lu.id
      LEFT JOIN users mu ON t.mentor_id = mu.id
      WHERE 1=1
    `;

    let dataQuery = `
      SELECT t.id, t.name, t.status, t.year_cohort, t.department, t.created_at,
             p.id as project_id, p.title as project_title, p.progress as project_progress, p.status as project_status,
             lu.id as leader_id, lu.name as leader_name, lu.email as leader_email,
             mu.id as mentor_id, mu.name as mentor_name, mu.email as mentor_email,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users lu ON t.leader_id = lu.id
      LEFT JOIN users mu ON t.mentor_id = mu.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (search) {
      const term = `%${search}%`;
      const searchClause = ` AND (t.name LIKE ? OR p.title LIKE ? OR lu.name LIKE ? OR mu.name LIKE ?)`;
      countQuery += searchClause;
      dataQuery += searchClause;
      params.push(term, term, term, term);
    }

    if (mentorFilter === 'assigned') {
      countQuery += ` AND t.mentor_id IS NOT NULL`;
      dataQuery += ` AND t.mentor_id IS NOT NULL`;
    } else if (mentorFilter === 'unassigned') {
      countQuery += ` AND t.mentor_id IS NULL`;
      dataQuery += ` AND t.mentor_id IS NULL`;
    }

    if (status && status !== 'all') {
      countQuery += ` AND t.status = ?`;
      dataQuery += ` AND t.status = ?`;
      params.push(status);
    }

    const totalCountRow = db.prepare(countQuery).get(...params) as any;
    const totalCount = totalCountRow?.count || 0;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    dataQuery += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    const teams = db.prepare(dataQuery).all(...params, limitNum, offset) as any[];

    res.json({
      success: true,
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      data: teams
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

    const team = db.prepare('SELECT id, name, mentor_id FROM teams WHERE id = ?').get(id) as any;
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found.' });
      return;
    }

    let mentorName = 'None';
    if (mentorId) {
      const mentor = db.prepare('SELECT id, name, status, role FROM users WHERE id = ?').get(mentorId) as any;
      if (!mentor || mentor.role !== 'mentor') {
        res.status(400).json({ success: false, message: 'Invalid mentor selected.' });
        return;
      }
      if (mentor.status !== 'active') {
        res.status(400).json({ success: false, message: 'Cannot assign an inactive mentor.' });
        return;
      }
      mentorName = mentor.name;
    }

    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare('UPDATE teams SET mentor_id = ? WHERE id = ?').run(mentorId || null, id);

      // Log activity event
      const actDesc = mentorId
        ? `Admin assigned mentor ${mentorName} to team "${team.name}"`
        : `Admin removed mentor assignment from team "${team.name}"`;

      db.prepare(`
        INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
        VALUES (?, ?, 'MENTOR_ASSIGNED', ?, 'team', ?, ?)
      `).run(`act_${Date.now()}`, adminId, actDesc, id, now);

      // Notify mentor if assigned
      if (mentorId) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
          VALUES (?, ?, 'New Team Assigned', ?, 'team', 0, '/mentor/teams', ?)
        `).run(`notif_${Date.now()}`, mentorId, `You have been assigned as the mentor for team "${team.name}".`, now);
      }

      db.exec('COMMIT;');

      res.json({
        success: true,
        message: mentorId ? `Mentor ${mentorName} assigned to ${team.name} successfully.` : `Mentor unassigned from ${team.name}.`
      });
    } catch (err: any) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, status } = req.query;

    let query = `
      SELECT p.id, p.title, p.description, p.tech_stack, p.repo_url, p.status, p.deadline, p.progress, p.created_at,
             t.id as team_id, t.name as team_name,
             lu.name as leader_name,
             mu.name as mentor_name
      FROM projects p
      LEFT JOIN teams t ON t.project_id = p.id
      LEFT JOIN users lu ON t.leader_id = lu.id
      LEFT JOIN users mu ON t.mentor_id = mu.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      const term = `%${search}%`;
      query += ` AND (p.title LIKE ? OR p.description LIKE ? OR t.name LIKE ?)`;
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
