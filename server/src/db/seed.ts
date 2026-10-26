import bcrypt from 'bcryptjs';
import { db, initSchema } from './database';

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

  // Ensure base accounts exist
  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, password_hash, role, status, avatar, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMentorProfile = db.prepare(`
    INSERT OR REPLACE INTO mentor_profiles (id, user_id, department, title, bio, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertStudentProfile = db.prepare(`
    INSERT OR REPLACE INTO student_profiles (id, user_id, department, year_cohort, roll_number, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // 1. Admin Account
  const adminId = 'usr_admin_1';
  insertUser.run(
    adminId,
    'Administrator',
    'admin@college.edu',
    defaultPassword,
    'admin',
    'active',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    now
  );

  // 2. Mentor Account (Clean, 0 teams assigned initially)
  const vetriId = 'usr_mentor_vetri';
  insertUser.run(
    vetriId,
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

  // 3. Student Account (Clean, ready to create or join a team)
  const vijayId = 'usr_s_vijay';
  insertUser.run(
    vijayId,
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

  console.log('[Seed] Base accounts verified: admin@college.edu, vetri@college.edu, vijay@college.edu (password: siet@2727)');
};
