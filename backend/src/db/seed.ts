import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { db, initSchema } from './database';
import { User, Setting, Announcement } from '../models';

export const runSeed = async (forceClean = false) => {
  initSchema();

  const defaultPassword = await bcrypt.hash('siet@2727', 10);
  const now = new Date().toISOString();

  // Clear demo data only when explicitly instructed
  if (forceClean) {
    try {
      db.exec(`
        DELETE FROM feedback_history;
        DELETE FROM weekly_submissions;
        DELETE FROM milestones;
        DELETE FROM team_members;
        DELETE FROM meetings;
        DELETE FROM activity_events;
        DELETE FROM notifications;
        DELETE FROM announcements;
        DELETE FROM teams;
        DELETE FROM projects;
      `);
      console.log('[Seed] Removed demo teams, demo projects, and demo submissions.');
    } catch {}
  }

  // Safe Upsert helper to prevent SQLite cascade deletes of teams/projects
  const upsertUser = (id: string, name: string, email: string, passwordHash: string, role: string, status: string, avatar: string, createdAt: string) => {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email) as any;
    if (existing) {
      // Never reset credentials, roles, or status for an existing account.
      // Restarting the server must not invalidate a password the user changed.
      db.prepare('UPDATE users SET name = ?, avatar = ? WHERE id = ?').run(name, avatar, existing.id);
      return existing.id;
    } else {
      const existingId = db.prepare('SELECT id FROM users WHERE id = ?').get(id) as any;
      const targetId = existingId ? `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : id;
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, status, avatar, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(targetId, name, email, passwordHash, role, status, avatar, createdAt);
      return targetId;
    }
  };

  const insertMentorProfile = db.prepare(`
    INSERT OR IGNORE INTO mentor_profiles (id, user_id, department, title, bio, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertStudentProfile = db.prepare(`
    INSERT OR IGNORE INTO student_profiles (id, user_id, department, year_cohort, roll_number, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // 1. Admin Account (Primary: admin@gmail.com, Fallback: admin@college.edu)
  upsertUser(
    'usr_admin_1',
    'Administrator',
    'admin@gmail.com',
    defaultPassword,
    'admin',
    'active',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    now
  );
  upsertUser(
    'usr_admin_edu',
    'Administrator',
    'admin@college.edu',
    defaultPassword,
    'admin',
    'active',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    now
  );

  // 2. Mentor Account (Primary: vetri@gmail.com, Fallback: vetri@college.edu)
  const vetriId = 'usr_mentor_vetri';
  upsertUser(
    vetriId,
    'Dr. Vetri Chelvan',
    'vetri@gmail.com',
    defaultPassword,
    'mentor',
    'active',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    now
  );
  upsertUser(
    'usr_mentor_vetri_edu',
    'Dr. Vetri Chelvan',
    'vetri@college.edu',
    defaultPassword,
    'mentor',
    'active',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    now
  );
  insertMentorProfile.run(
    'mp_vetri',
    vetriId,
    'Computer Science',
    'Associate Professor',
    'Specializing in AI/ML, Distributed Systems, and Full-Stack Engineering.',
    '+91 98401 23456',
    now
  );

  // 3. Student Account (Primary: vijay@gmail.com, Fallback: vijay@college.edu)
  const vijayId = 'usr_s_vijay';
  upsertUser(
    vijayId,
    'Vijay Ananth R S',
    'vijay@gmail.com',
    defaultPassword,
    'student',
    'active',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    now
  );
  upsertUser(
    'usr_s_vijay_edu',
    'Vijay Ananth R S',
    'vijay@college.edu',
    defaultPassword,
    'student',
    'active',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    now
  );
  insertStudentProfile.run(
    `sp_${vijayId}`,
    vijayId,
    'Computer Science',
    '3rd Year',
    '21CS001',
    now
  );

  // Also seed MongoDB Atlas User collection if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const baseUsers = [
        {
          name: 'Administrator',
          email: 'admin@gmail.com',
          passwordHash: defaultPassword,
          role: 'ADMIN',
          status: 'ACTIVE',
          department: 'Computer Science',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
          mustChangePassword: false
        },
        {
          name: 'Administrator',
          email: 'admin@college.edu',
          passwordHash: defaultPassword,
          role: 'ADMIN',
          status: 'ACTIVE',
          department: 'Computer Science',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
          mustChangePassword: false
        },
        {
          name: 'Dr. Vetri Chelvan',
          email: 'vetri@gmail.com',
          passwordHash: defaultPassword,
          role: 'MENTOR',
          status: 'ACTIVE',
          department: 'Computer Science',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          mustChangePassword: false
        },
        {
          name: 'Dr. Vetri Chelvan',
          email: 'vetri@college.edu',
          passwordHash: defaultPassword,
          role: 'MENTOR',
          status: 'ACTIVE',
          department: 'Computer Science',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          mustChangePassword: false
        },
        {
          name: 'Vijay Ananth R S',
          email: 'vijay@gmail.com',
          passwordHash: defaultPassword,
          role: 'STUDENT',
          status: 'ACTIVE',
          department: 'Computer Science',
          year: '3rd Year',
          college: 'College of Engineering & Technology',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
          mustChangePassword: false
        },
        {
          name: 'Vijay Ananth R S',
          email: 'vijay@college.edu',
          passwordHash: defaultPassword,
          role: 'STUDENT',
          status: 'ACTIVE',
          department: 'Computer Science',
          year: '3rd Year',
          college: 'College of Engineering & Technology',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
          mustChangePassword: false
        }
      ];

      for (const u of baseUsers) {
        const existing = await User.findOne({ email: u.email });
        if (!existing) {
          await User.create(u);
        }
      }

      // Seed default system settings in MongoDB Atlas
      const defaultSettings: Record<string, string> = {
        academic_year: '2024-2025',
        current_semester: 'Even Semester (Spring 2025)',
        submission_cadence_days: '7',
        allow_student_team_creation: 'true',
        max_team_size: '4',
        min_team_size: '2',
        notification_email_enabled: 'false'
      };

      for (const [key, value] of Object.entries(defaultSettings)) {
        await Setting.findOneAndUpdate(
          { key },
          { value, updatedAt: new Date() },
          { upsert: true, new: true }
        );
      }

      await User.updateMany(
        { email: { $in: ['admin@gmail.com', 'admin@college.edu'] } },
        { $set: { role: 'ADMIN', status: 'ACTIVE' } }
      );
      console.log('[Seed] Base accounts and system settings verified in MongoDB Atlas.');
    } catch (mErr) {
      console.warn('[MongoDB Atlas Seed Warning]', mErr);
    }
  }

  // Always enforce admin role for reserved admin emails
  try {
    db.prepare("UPDATE users SET role = 'admin', status = 'active' WHERE email IN ('admin@gmail.com', 'admin@college.edu')").run();
  } catch {}

  console.log('[Seed] Base accounts verified: admin@gmail.com, vetri@gmail.com, vijay@gmail.com (password: siet@2727)');
};
