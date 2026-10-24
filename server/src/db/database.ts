import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'project_mentor.db');

export const db = new DatabaseSync(DB_PATH);

// Enable Foreign Keys and WAL Mode for high concurrency and performance
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export const initSchema = () => {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'mentor', 'admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Mentor Profiles
    CREATE TABLE IF NOT EXISTS mentor_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      department TEXT NOT NULL,
      title TEXT,
      bio TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Student Profiles
    CREATE TABLE IF NOT EXISTS student_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      department TEXT NOT NULL,
      year_cohort TEXT,
      roll_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Projects
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      tech_stack TEXT,
      repo_url TEXT,
      status TEXT NOT NULL DEFAULT 'ON_TRACK' CHECK(status IN ('ON_TRACK', 'NEEDS_ATTENTION', 'DELAYED', 'COMPLETED')),
      deadline DATETIME,
      progress INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Teams
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      leader_id TEXT NOT NULL REFERENCES users(id),
      mentor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      year_cohort TEXT,
      department TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Team Members
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'Member',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, user_id)
    );

    -- Milestones
    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      deadline DATETIME,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Completed', 'In Progress', 'Pending')),
      order_index INTEGER DEFAULT 0
    );

    -- Weekly Submissions
    CREATE TABLE IF NOT EXISTS weekly_submissions (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      week INTEGER NOT NULL,
      date TEXT NOT NULL,
      work_completed TEXT NOT NULL,
      current_work TEXT,
      blockers TEXT,
      next_week_goals TEXT,
      repo_url TEXT,
      attachments TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'OVERDUE')),
      feedback TEXT,
      reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at DATETIME,
      submitted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Feedback History
    CREATE TABLE IF NOT EXISTS feedback_history (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES weekly_submissions(id) ON DELETE CASCADE,
      reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL,
      feedback TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Meetings
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      mentor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      link_or_location TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Announcements
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      audience TEXT NOT NULL CHECK(audience IN ('all', 'students', 'mentors')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER NOT NULL DEFAULT 0,
      link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Activity Events
    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action_type TEXT NOT NULL,
      description TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- System Settings
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Performance and Query Indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
    CREATE INDEX IF NOT EXISTS idx_teams_mentor ON teams(mentor_id);
    CREATE INDEX IF NOT EXISTS idx_teams_leader ON teams(leader_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_team ON weekly_submissions(team_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_status ON weekly_submissions(status);
    CREATE INDEX IF NOT EXISTS idx_meetings_mentor ON meetings(mentor_id);
    CREATE INDEX IF NOT EXISTS idx_meetings_team ON meetings(team_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_events(created_at DESC);
  `);
};
