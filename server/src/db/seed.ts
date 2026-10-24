import bcrypt from 'bcryptjs';
import { db, initSchema } from './database';

export const runSeed = async () => {
  initSchema();

  // Check if already seeded with Vetri
  const existingVetri = db.prepare('SELECT id FROM users WHERE email = ?').get('vetri@college.edu') as any;
  if (existingVetri) {
    console.log('[Seed] Database already seeded. Ensuring schema is up to date.');
    return;
  }

  console.log('[Seed] Seeding database with production-ready dev dataset...');

  const defaultPassword = await bcrypt.hash('siet@2727', 10);
  const passwordStudent = defaultPassword;
  const passwordMentor = defaultPassword;
  const passwordAdmin = defaultPassword;

  // Clear existing records to ensure clean relational integrity
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
    DELETE FROM student_profiles;
    DELETE FROM mentor_profiles;
    DELETE FROM users;
    DELETE FROM settings;
  `);

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, status, avatar, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMentorProfile = db.prepare(`
    INSERT INTO mentor_profiles (id, user_id, department, title, bio, phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertStudentProfile = db.prepare(`
    INSERT INTO student_profiles (id, user_id, department, year_cohort, roll_number)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertProject = db.prepare(`
    INSERT INTO projects (id, title, description, tech_stack, repo_url, status, deadline, progress, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTeam = db.prepare(`
    INSERT INTO teams (id, name, leader_id, mentor_id, project_id, year_cohort, department, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMember = db.prepare(`
    INSERT INTO team_members (id, team_id, user_id, role)
    VALUES (?, ?, ?, ?)
  `);

  const insertMilestone = db.prepare(`
    INSERT INTO milestones (id, project_id, title, deadline, status, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertSubmission = db.prepare(`
    INSERT INTO weekly_submissions (
      id, team_id, project_id, week, date, work_completed, current_work, blockers, next_week_goals,
      repo_url, attachments, status, feedback, reviewer_id, reviewed_at, submitted_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMeeting = db.prepare(`
    INSERT INTO meetings (id, team_id, mentor_id, title, date, time, link_or_location, notes, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAnnouncement = db.prepare(`
    INSERT INTO announcements (id, author_id, title, message, audience, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertActivity = db.prepare(`
    INSERT INTO activity_events (id, user_id, action_type, description, target_type, target_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSetting = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
  `);

  // 1. Admin User
  const adminId = 'usr_admin_1';
  insertUser.run(
    adminId,
    'Dr. Aruna Admin',
    'admin@college.edu',
    passwordAdmin,
    'admin',
    'active',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    '2026-09-01 09:00:00'
  );

  // 2. Mentors
  // Mentor Vetri (with 4 teams)
  const vetriId = 'usr_mentor_vetri';
  insertUser.run(
    vetriId,
    'Dr. Vetri Chelvan',
    'vetri@college.edu',
    passwordMentor,
    'mentor',
    'active',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    '2026-09-01 10:00:00'
  );
  insertMentorProfile.run('mp_vetri', vetriId, 'Computer Science', 'Associate Professor', 'Specializing in AI/ML, Distributed Systems, and Full-Stack Engineering.', '+91 98401 23456');

  // Mentor Meena (Active, 0 teams assigned)
  const meenaId = 'usr_mentor_meena';
  insertUser.run(
    meenaId,
    'Dr. Meena Sundaram',
    'meena@college.edu',
    passwordMentor,
    'mentor',
    'active',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    '2026-09-05 11:00:00'
  );
  insertMentorProfile.run('mp_meena', meenaId, 'Information Technology', 'Assistant Professor', 'Cybersecurity, Cloud Architecture, and IoT.', '+91 98402 34567');

  // Inactive Mentor Suresh
  const sureshId = 'usr_mentor_suresh';
  insertUser.run(
    sureshId,
    'Dr. Suresh Babu',
    'suresh@college.edu',
    passwordMentor,
    'mentor',
    'inactive',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    '2026-08-15 11:00:00'
  );
  insertMentorProfile.run('mp_suresh', sureshId, 'Mechanical Engineering', 'Professor', 'Robotics and Automated Systems.', '+91 98403 45678');

  // 3. Students (16 students under Vetri + students for unassigned team + inactive student)
  const createStudent = (id: string, name: string, email: string, roll: string, dept: string = 'Computer Science', status: 'active' | 'inactive' = 'active') => {
    insertUser.run(
      id,
      name,
      email,
      passwordStudent,
      'student',
      status,
      `https://images.unsplash.com/photo-${1530000000000 + Math.floor(Math.random() * 1000000)}?auto=format&fit=crop&w=160&q=80`,
      '2026-09-10 10:00:00'
    );
    insertStudentProfile.run(`sp_${id}`, id, dept, '3rd Year', roll);
  };

  // Team 1 Students (CodeCrew - 4 students)
  createStudent('usr_s_vijay', 'Vijay Ananth R S', 'vijay@college.edu', '21CS001');
  createStudent('usr_s_priya', 'Priya Dharshini', 'priya@college.edu', '21CS002');
  createStudent('usr_s_karthik', 'Karthik Raja', 'karthik@college.edu', '21CS003');
  createStudent('usr_s_divya', 'Divya Bharathi', 'divya@college.edu', '21CS004');

  // Team 2 Students (TechTitans - 4 students)
  createStudent('usr_s_arun', 'Arun Kumar', 'arun@college.edu', '21CS005');
  createStudent('usr_s_swetha', 'Swetha Raman', 'swetha@college.edu', '21CS006');
  createStudent('usr_s_manoj', 'Manoj Krishnan', 'manoj@college.edu', '21CS007');
  createStudent('usr_s_sneha', 'Sneha Reddy', 'sneha@college.edu', '21CS008');

  // Team 3 Students (ByteBuilders - 4 students)
  createStudent('usr_s_kavya', 'Kavya Murugan', 'kavya@college.edu', '21CS009');
  createStudent('usr_s_rajesh', 'Rajesh Kannan', 'rajesh@college.edu', '21CS010');
  createStudent('usr_s_ananya', 'Ananya Sharma', 'ananya@college.edu', '21CS011');
  createStudent('usr_s_pradeep', 'Pradeep Chandran', 'pradeep@college.edu', '21CS012');

  // Team 4 Students (DataDynamos - 4 students)
  createStudent('usr_s_siddharth', 'Siddharth Verma', 'siddharth@college.edu', '21CS013');
  createStudent('usr_s_meera', 'Meera Nair', 'meera@college.edu', '21CS014');
  createStudent('usr_s_varun', 'Varun Teja', 'varun@college.edu', '21CS015');
  createStudent('usr_s_pooja', 'Pooja Hegde', 'pooja@college.edu', '21CS016');

  // Team 5 Students (CloudCrafters - Team with no mentor)
  createStudent('usr_s_rohit', 'Rohit Sen', 'rohit@college.edu', '21CS017');
  createStudent('usr_s_diya', 'Diya Kapoor', 'diya@college.edu', '21CS018');

  // Inactive Student
  createStudent('usr_s_dinesh', 'Dinesh Kumar', 'dinesh@college.edu', '21CS099', 'Computer Science', 'inactive');

  // 4. Projects
  // Project 1: Attendance System (CodeCrew - 45%)
  const p1Id = 'proj_attendance';
  insertProject.run(
    p1Id,
    'Attendance System',
    'Automated Face Recognition Attendance System with geolocation verification and real-time mentor reporting.',
    JSON.stringify(['React', 'TypeScript', 'Node.js', 'Python', 'OpenCV']),
    'https://github.com/codecrew/attendance-system',
    'ON_TRACK',
    '2026-11-30',
    45,
    '2026-09-15 10:00:00'
  );

  // Project 2: Campus Connect (TechTitans - 30%)
  const p2Id = 'proj_campus_connect';
  insertProject.run(
    p2Id,
    'Campus Connect',
    'Centralized campus event, club activities, and peer-to-peer mentoring discovery portal.',
    JSON.stringify(['Next.js', 'Express', 'PostgreSQL', 'TailwindCSS']),
    'https://github.com/techtitans/campus-connect',
    'NEEDS_ATTENTION',
    '2026-11-20',
    30,
    '2026-09-15 11:00:00'
  );

  // Project 3: Library Manager (ByteBuilders - 60%)
  const p3Id = 'proj_library_mgr';
  insertProject.run(
    p3Id,
    'Library Manager',
    'Smart RFID and QR-code enabled automated inventory, checkout, and fine management ecosystem.',
    JSON.stringify(['Vue.js', 'FastAPI', 'MongoDB', 'Redis']),
    'https://github.com/bytebuilders/library-manager',
    'ON_TRACK',
    '2026-12-15',
    60,
    '2026-09-15 12:00:00'
  );

  // Project 4: Smart Health Monitoring (DataDynamos - 70%)
  const p4Id = 'proj_health_mon';
  insertProject.run(
    p4Id,
    'Smart Health Monitoring',
    'Wearable telemetry ingestion pipeline featuring anomaly detection for student stress and physical health.',
    JSON.stringify(['React Native', 'Node.js', 'TimescaleDB', 'TensorFlow']),
    'https://github.com/datadynamos/smart-health',
    'ON_TRACK',
    '2026-12-05',
    70,
    '2026-09-15 13:00:00'
  );

  // Project 5: Cloud Cost Optimizer (CloudCrafters - No mentor - 20%)
  const p5Id = 'proj_cloud_opt';
  insertProject.run(
    p5Id,
    'Cloud Cost Optimizer',
    'FinOps dashboard identifying idle Kubernetes pods and unused AWS/GCP resources across research labs.',
    JSON.stringify(['Go', 'React', 'Docker', 'AWS SDK']),
    'https://github.com/cloudcrafters/cloud-optimizer',
    'NEEDS_ATTENTION',
    '2026-11-25',
    20,
    '2026-09-20 14:00:00'
  );

  // 5. Teams
  // Team 1: CodeCrew (Vetri)
  const t1Id = 'team_codecrew';
  insertTeam.run(t1Id, 'CodeCrew', 'usr_s_vijay', vetriId, p1Id, '3rd Year', 'Computer Science', 'active', '2026-09-15');
  insertMember.run('tm_1', t1Id, 'usr_s_vijay', 'Team Leader');
  insertMember.run('tm_2', t1Id, 'usr_s_priya', 'Member');
  insertMember.run('tm_3', t1Id, 'usr_s_karthik', 'Member');
  insertMember.run('tm_4', t1Id, 'usr_s_divya', 'Member');

  // Team 2: TechTitans (Vetri)
  const t2Id = 'team_techtitans';
  insertTeam.run(t2Id, 'TechTitans', 'usr_s_arun', vetriId, p2Id, '3rd Year', 'Computer Science', 'active', '2026-09-15');
  insertMember.run('tm_5', t2Id, 'usr_s_arun', 'Team Leader');
  insertMember.run('tm_6', t2Id, 'usr_s_swetha', 'Member');
  insertMember.run('tm_7', t2Id, 'usr_s_manoj', 'Member');
  insertMember.run('tm_8', t2Id, 'usr_s_sneha', 'Member');

  // Team 3: ByteBuilders (Vetri)
  const t3Id = 'team_bytebuilders';
  insertTeam.run(t3Id, 'ByteBuilders', 'usr_s_kavya', vetriId, p3Id, '3rd Year', 'Computer Science', 'active', '2026-09-15');
  insertMember.run('tm_9', t3Id, 'usr_s_kavya', 'Team Leader');
  insertMember.run('tm_10', t3Id, 'usr_s_rajesh', 'Member');
  insertMember.run('tm_11', t3Id, 'usr_s_ananya', 'Member');
  insertMember.run('tm_12', t3Id, 'usr_s_pradeep', 'Member');

  // Team 4: DataDynamos (Vetri)
  const t4Id = 'team_datadynamos';
  insertTeam.run(t4Id, 'DataDynamos', 'usr_s_siddharth', vetriId, p4Id, '3rd Year', 'Computer Science', 'active', '2026-09-15');
  insertMember.run('tm_13', t4Id, 'usr_s_siddharth', 'Team Leader');
  insertMember.run('tm_14', t4Id, 'usr_s_meera', 'Member');
  insertMember.run('tm_15', t4Id, 'usr_s_varun', 'Member');
  insertMember.run('tm_16', t4Id, 'usr_s_pooja', 'Member');

  // Team 5: CloudCrafters (No mentor)
  const t5Id = 'team_cloudcrafters';
  insertTeam.run(t5Id, 'CloudCrafters', 'usr_s_rohit', null, p5Id, '3rd Year', 'Computer Science', 'active', '2026-09-20');
  insertMember.run('tm_17', t5Id, 'usr_s_rohit', 'Team Leader');
  insertMember.run('tm_18', t5Id, 'usr_s_diya', 'Member');

  // 6. Milestones for Projects
  insertMilestone.run('m_1', p1Id, 'System Architecture & Database Schema', '2026-10-01', 'Completed', 1);
  insertMilestone.run('m_2', p1Id, 'Face Embeddings Pipeline & API', '2026-10-20', 'In Progress', 2);
  insertMilestone.run('m_3', p1Id, 'Mobile Client & Geolocation Check', '2026-11-10', 'Pending', 3);
  insertMilestone.run('m_4', p1Id, 'End-to-End Validation & Final Demo', '2026-11-30', 'Pending', 4);

  insertMilestone.run('m_5', p2Id, 'Requirements Gathering & Wireframes', '2026-09-30', 'Completed', 1);
  insertMilestone.run('m_6', p2Id, 'Authentication & Club Feed Services', '2026-10-15', 'In Progress', 2);
  insertMilestone.run('m_7', p2Id, 'Event Registration & Notifications', '2026-11-05', 'Pending', 3);

  insertMilestone.run('m_8', p3Id, 'Book Catalog & Search API', '2026-10-05', 'Completed', 1);
  insertMilestone.run('m_9', p3Id, 'RFID Integration & Checkout Flow', '2026-10-22', 'Completed', 2);
  insertMilestone.run('m_10', p3Id, 'Automated Overdue Fines & Alerts', '2026-11-15', 'In Progress', 3);

  // 7. Weekly Submissions
  // 3 submissions awaiting review (status: 'PENDING')
  // 1. CodeCrew Week 4 submission (Pending review)
  insertSubmission.run(
    'sub_cc_w4',
    t1Id,
    p1Id,
    4,
    '2026-10-23',
    'Implemented face vector embedding generation using MobileNet, created REST endpoint for video stream chunk ingestion.',
    'Integrating anti-spoofing liveness detection and testing latency under 5 concurrent camera feeds.',
    'Occasional False Rejection Rate during low-light conditions in Classroom 204.',
    'Complete camera sync and calibrate confidence threshold.',
    'https://github.com/codecrew/attendance-system/tree/week-4',
    JSON.stringify([
      { name: 'Architecture_Diagram_v2.pdf', size: '2.1 MB', type: 'pdf', url: '/api/files/architecture-diagram-v2.pdf' },
      { name: 'FRR_Analysis.png', size: '840 KB', type: 'image', url: '/api/files/frr-analysis.png' }
    ]),
    'PENDING',
    null,
    null,
    null,
    'usr_s_vijay',
    '2026-10-23 18:30:00'
  );

  // 2. TechTitans Week 3 submission (Pending review)
  insertSubmission.run(
    'sub_tt_w3',
    t2Id,
    p2Id,
    3,
    '2026-10-22',
    'Built Next.js frontend pages for clubs listing, student discovery, and RSVP state management.',
    'Connecting WebSocket channel for real-time announcements.',
    'PostgreSQL connection pool exhaustion on serverless edge functions.',
    'Set up Prisma connection pooler and deploy staging environment.',
    'https://github.com/techtitans/campus-connect/tree/v0.3',
    JSON.stringify([
      { name: 'UI_Screenshots_Review.pdf', size: '4.5 MB', type: 'pdf', url: '/api/files/ui-screenshots.pdf' }
    ]),
    'PENDING',
    null,
    null,
    null,
    'usr_s_arun',
    '2026-10-22 14:15:00'
  );

  // 3. DataDynamos Week 6 submission (Pending review)
  insertSubmission.run(
    'sub_dd_w6',
    t4Id,
    p4Id,
    6,
    '2026-10-23',
    'Finalized timeseries ingestion worker; hooked up anomaly inference model for elevated heart rate trends.',
    'Stress score calculation algorithm calibration.',
    'Bluetooth LE pairing dropouts on Android 14 devices.',
    'Implement background auto-reconnect logic.',
    'https://github.com/datadynamos/smart-health/commits/sprint-3',
    JSON.stringify([
      { name: 'Telemetry_Model_Accuracy.pdf', size: '3.2 MB', type: 'pdf', url: '/api/files/telemetry-model-accuracy.pdf' }
    ]),
    'PENDING',
    null,
    null,
    null,
    'usr_s_siddharth',
    '2026-10-23 20:00:00'
  );

  // 4. Overdue submission (TechTitans Week 2 - missed deadline in past, status PENDING)
  insertSubmission.run(
    'sub_tt_w2_overdue',
    t2Id,
    p2Id,
    2,
    '2026-10-12',
    'Drafted club directory entity schemas and wireframes.',
    'Database migration scripts.',
    'Team member was on medical leave.',
    'Catch up on schema validations.',
    'https://github.com/techtitans/campus-connect/tree/draft',
    JSON.stringify([]),
    'PENDING',
    null,
    null,
    null,
    'usr_s_arun',
    '2026-10-12 11:00:00'
  );

  // 5. Approved historical submission (ByteBuilders Week 5)
  insertSubmission.run(
    'sub_bb_w5_approved',
    t3Id,
    p3Id,
    5,
    '2026-10-18',
    'Integrated RFID reader hardware via serial port emulator; verified book check-out and check-in workflows in under 800ms.',
    'Fine calculation rule engine.',
    'None',
    'Deliver alpha release to college librarian for feedback.',
    'https://github.com/bytebuilders/library-manager/releases/tag/v0.5.0',
    JSON.stringify([
      { name: 'RFID_Test_Report.pdf', size: '1.4 MB', type: 'pdf', url: '/api/files/rfid-test-report.pdf' }
    ]),
    'APPROVED',
    'Excellent hardware integration work. Ensure error states are clearly surfaced on the reader screen.',
    vetriId,
    '2026-10-19 15:40:00',
    'usr_s_kavya',
    '2026-10-18 16:00:00'
  );

  // 8. Feedback History
  db.prepare(`
    INSERT INTO feedback_history (id, submission_id, reviewer_id, status, feedback, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'fb_1',
    'sub_bb_w5_approved',
    vetriId,
    'APPROVED',
    'Excellent hardware integration work. Ensure error states are clearly surfaced on the reader screen.',
    '2026-10-19 15:40:00'
  );

  // 9. Meetings (2 upcoming meetings for Vetri's teams)
  insertMeeting.run(
    'meet_1',
    t1Id,
    vetriId,
    'Sprint 3 Review & Face Recognition Calibration',
    '2026-10-25',
    '10:30 AM',
    'https://meet.google.com/prj-codecrew-sync',
    'Review FRR data and Classroom 204 low-light demo.',
    'upcoming',
    '2026-10-23 10:00:00'
  );

  insertMeeting.run(
    'meet_2',
    t2Id,
    vetriId,
    'Database Architecture & Connection Pool Troubleshooting',
    '2026-10-27',
    '02:30 PM',
    'Department Seminar Hall - Room 302',
    'Bring laptop with local PostgreSQL setup.',
    'upcoming',
    '2026-10-23 11:30:00'
  );

  // Past completed meeting
  insertMeeting.run(
    'meet_3',
    t3Id,
    vetriId,
    'RFID Hardware Validation Session',
    '2026-10-16',
    '04:00 PM',
    'IoT Innovation Lab',
    'Validated serial reader drivers with librarian.',
    'completed',
    '2026-10-14 09:00:00'
  );

  // 10. Announcements
  insertAnnouncement.run(
    'ann_1',
    adminId,
    'Mid-Semester Project Review Guidelines',
    'All teams must submit their working prototypes along with updated sprint documentation by November 15. Mentors are requested to schedule pre-evaluation sessions.',
    'all',
    '2026-10-20 09:00:00'
  );

  insertAnnouncement.run(
    'ann_2',
    adminId,
    'Mentor Weekly Evaluation & Grade Submissions Open',
    'The faculty portal has opened for Week 4 & Week 5 rubric grading. Please file reviews for all pending student team reports.',
    'mentors',
    '2026-10-21 14:00:00'
  );

  insertAnnouncement.run(
    'ann_3',
    adminId,
    'GitHub Repository Sync & Commit Checklist',
    'All student teams are required to link their official GitHub repository URL in their project workspace. Ensure your team branch policies are enabled.',
    'students',
    '2026-10-22 10:30:00'
  );

  // 11. Activity Events (~10 events)
  const activities = [
    { u: adminId, act: 'MENTOR_ADDED', desc: 'Admin added Dr. Vetri Chelvan to Department of Computer Science', tgt: 'mentor', id: vetriId, ts: '2026-10-10 09:15:00' },
    { u: adminId, act: 'TEAM_CREATED', desc: 'Created team "CodeCrew" with leader Vijay Ananth', tgt: 'team', id: t1Id, ts: '2026-10-11 10:00:00' },
    { u: adminId, act: 'MENTOR_ASSIGNED', desc: 'Assigned mentor Dr. Vetri Chelvan to CodeCrew', tgt: 'team', id: t1Id, ts: '2026-10-11 10:30:00' },
    { u: 'usr_s_vijay', act: 'PROGRESS_SUBMITTED', desc: 'CodeCrew submitted Week 4 progress report', tgt: 'submission', id: 'sub_cc_w4', ts: '2026-10-23 18:30:00' },
    { u: 'usr_s_arun', act: 'PROGRESS_SUBMITTED', desc: 'TechTitans submitted Week 3 progress report', tgt: 'submission', id: 'sub_tt_w3', ts: '2026-10-22 14:15:00' },
    { u: vetriId, act: 'REVIEW_COMPLETED', desc: 'Dr. Vetri Chelvan approved ByteBuilders Week 5 submission', tgt: 'submission', id: 'sub_bb_w5_approved', ts: '2026-10-19 15:40:00' },
    { u: vetriId, act: 'MEETING_SCHEDULED', desc: 'Dr. Vetri Chelvan scheduled meeting with CodeCrew for Oct 25', tgt: 'meeting', id: 'meet_1', ts: '2026-10-23 10:00:00' },
    { u: adminId, act: 'ANNOUNCEMENT_PUBLISHED', desc: 'Published announcement: "Mid-Semester Project Review Guidelines"', tgt: 'announcement', id: 'ann_1', ts: '2026-10-20 09:00:00' },
    { u: 'usr_s_siddharth', act: 'PROGRESS_SUBMITTED', desc: 'DataDynamos submitted Week 6 progress report', tgt: 'submission', id: 'sub_dd_w6', ts: '2026-10-23 20:00:00' },
    { u: adminId, act: 'TEAM_CREATED', desc: 'Created team "CloudCrafters" (Awaiting Mentor Assignment)', tgt: 'team', id: t5Id, ts: '2026-10-24 08:30:00' }
  ];

  for (let i = 0; i < activities.length; i++) {
    const a = activities[i];
    insertActivity.run(`act_${i + 1}`, a.u, a.act, a.desc, a.tgt, a.id, a.ts);
  }

  // 12. Notifications
  insertNotification.run('notif_1', vetriId, 'New Submission for Review', 'CodeCrew has submitted their Week 4 progress report.', 'submission', 0, '/mentor/reviews', '2026-10-23 18:30:00');
  insertNotification.run('notif_2', vetriId, 'New Submission for Review', 'DataDynamos submitted Week 6 report.', 'submission', 0, '/mentor/reviews', '2026-10-23 20:00:00');
  insertNotification.run('notif_3', vetriId, 'Announcement Published', 'Mid-Semester Project Review Guidelines published by Admin.', 'announcement', 0, '/mentor/notifications', '2026-10-20 09:00:00');
  insertNotification.run('notif_4', 'usr_s_vijay', 'Meeting Scheduled', 'Dr. Vetri scheduled a review session for Oct 25 at 10:30 AM.', 'meeting', 0, '/student/dashboard', '2026-10-23 10:00:00');

  // 13. System Settings
  insertSetting.run('institution_name', 'College of Engineering & Technology');
  insertSetting.run('academic_year', '2026-2027');
  insertSetting.run('review_frequency_days', '7');
  insertSetting.run('email_notifications_enabled', 'false');

  console.log('[Seed] Database successfully populated!');
};

if (require.main === module) {
  runSeed().catch((err) => {
    console.error('[Seed Error]', err);
    process.exit(1);
  });
}
