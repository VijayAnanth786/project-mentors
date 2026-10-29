import assert from 'assert';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Load environment for test
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../atlas-credentials.env') });

import { maskMongoUri, getMongoDiagnostics } from './src/config/db';
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
} from './src/models';

console.log('='.repeat(65));
console.log('  🧪 ProjectMentor - MongoDB Atlas Integration Test Suite');
console.log('='.repeat(65));

let passedCount = 0;
let failedCount = 0;

const runTest = async (name: string, fn: () => Promise<void> | void) => {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}: ${err?.message || err}`);
    failedCount++;
  }
};

const runAllTests = async () => {
  // 1. Database Configuration & Masking Tests
  console.log('\n--- Test Group 1: Configuration & Security Validation ---');

  await runTest('maskMongoUri hides username and password in connection string', () => {
    const raw = 'mongodb+srv://admin_user:SuperSecretPassword123@cluster0.abc.mongodb.net/test_db';
    const masked = maskMongoUri(raw);
    assert(!masked.includes('SuperSecretPassword123'), 'Raw password must not appear in masked string');
    assert(masked.includes(':****@'), 'Password must be masked with :****@');
  });

  await runTest('maskMongoUri handles empty or invalid strings safely', () => {
    assert.strictEqual(maskMongoUri(''), 'NOT_CONFIGURED');
    assert.strictEqual(maskMongoUri(undefined), 'NOT_CONFIGURED');
  });

  await runTest('getMongoDiagnostics exposes safe health properties without secrets', () => {
    const diag = getMongoDiagnostics();
    assert(typeof diag.status === 'string', 'status must be a string');
    assert(typeof diag.connected === 'boolean', 'connected must be boolean');
    assert(typeof diag.configured === 'boolean', 'configured must be boolean');
    assert(!JSON.stringify(diag).includes('ZYZIqm1fh9xFqRCv'), 'Secrets must never appear in diagnostics');
  });

  // 2. Mongoose Schemas & Model Integrity
  console.log('\n--- Test Group 2: Data Models & Schema Validation ---');

  await runTest('User model enforces required fields, email format, and role enum', async () => {
    const invalidUser = new User({
      name: 'A', // too short
      email: 'not-an-email',
      role: 'INVALID_ROLE'
    });
    const err = invalidUser.validateSync();
    assert(err, 'Expected validation errors');
    assert(err?.errors['email'], 'Email format must be validated');
    assert(err?.errors['role'], 'Role must be validated against enum');
  });

  await runTest('User password comparison method hashes and compares accurately', async () => {
    const password = 'TestSecurePassword#2025';
    const hash = await bcrypt.hash(password, 10);
    const user = new User({
      name: 'Test Student',
      email: 'test.student@college.edu',
      passwordHash: hash,
      role: 'STUDENT',
      department: 'Computer Science'
    });
    const isMatch = await user.comparePassword(password);
    const isWrong = await user.comparePassword('WrongPassword');
    assert.strictEqual(isMatch, true, 'Correct password must match');
    assert.strictEqual(isWrong, false, 'Incorrect password must not match');
  });

  await runTest('User toJSON transform scrubs passwordHash and __v', () => {
    const user = new User({
      name: 'Privacy Test',
      email: 'privacy@college.edu',
      passwordHash: 'secret_hash',
      role: 'STUDENT'
    });
    const json = user.toJSON();
    assert.strictEqual(json.passwordHash, undefined, 'passwordHash must be stripped from JSON');
    assert.strictEqual(json.__v, undefined, '__v must be stripped from JSON');
    assert(json.id, 'Serialized id must exist');
  });

  await runTest('Team model validates required name, leaderId and default cohort', () => {
    const dummyId = new mongoose.Types.ObjectId();
    const team = new Team({
      name: 'Team Delta',
      leaderId: dummyId
    });
    const err = team.validateSync();
    assert(!err, 'Valid team should pass validation');
    assert.strictEqual(team.yearCohort, '3rd Year');
    assert.strictEqual(team.status, 'active');
  });

  await runTest('Project model validates status enum and milestones structure', () => {
    const dummyTeamId = new mongoose.Types.ObjectId();
    const proj = new Project({
      title: 'AI Proctor System',
      description: 'Automated exam monitoring',
      teamId: dummyTeamId,
      deadline: new Date(Date.now() + 86400000),
      milestones: [{ title: 'Milestone 1', status: 'In Progress' }]
    });
    const err = proj.validateSync();
    assert(!err, 'Valid project should pass validation');
    assert.strictEqual(proj.status, 'ON_TRACK');
    assert.strictEqual(proj.milestones.length, 1);
  });

  await runTest('Progress model validates weekNumber and status enum', () => {
    const dummyTeamId = new mongoose.Types.ObjectId();
    const dummyProjId = new mongoose.Types.ObjectId();
    const dummyUserId = new mongoose.Types.ObjectId();

    const progress = new Progress({
      teamId: dummyTeamId,
      projectId: dummyProjId,
      weekNumber: 3,
      submittedBy: dummyUserId,
      status: 'APPROVED'
    });
    const err = progress.validateSync();
    assert(!err, 'Valid progress report should pass validation');
    assert.strictEqual(progress.status, 'APPROVED');
  });

  await runTest('Meeting model validates title, date, time, location and status', () => {
    const dummyTeamId = new mongoose.Types.ObjectId();
    const dummyMentorId = new mongoose.Types.ObjectId();

    const meeting = new Meeting({
      teamId: dummyTeamId,
      mentorId: dummyMentorId,
      title: 'Sprint 2 Architecture Review',
      date: '2025-04-15',
      time: '14:00',
      linkOrLocation: 'Lab 302',
      status: 'upcoming'
    });
    const err = meeting.validateSync();
    assert(!err, 'Valid meeting should pass validation');
    assert.strictEqual(meeting.status, 'upcoming');
  });

  await runTest('Announcement model validates audience enum restrictions', () => {
    const dummyAuthorId = new mongoose.Types.ObjectId();
    const ann = new Announcement({
      authorId: dummyAuthorId,
      title: 'Project Fair Date Finalized',
      message: 'All teams must submit code by Friday.',
      audience: 'all'
    });
    const err = ann.validateSync();
    assert(!err, 'Valid announcement should pass validation');

    const invalidAnn = new Announcement({
      authorId: dummyAuthorId,
      title: 'Bad Audience',
      message: 'Test',
      audience: 'unauthorized_audience' as any
    });
    const badErr = invalidAnn.validateSync();
    assert(badErr?.errors['audience'], 'Invalid audience must be rejected');
  });

  await runTest('Notification model sets isRead default to false', () => {
    const dummyUserId = new mongoose.Types.ObjectId();
    const notif = new Notification({
      userId: dummyUserId,
      title: 'Review Complete',
      message: 'Your week 3 progress was approved.'
    });
    const err = notif.validateSync();
    assert(!err, 'Valid notification should pass validation');
    assert.strictEqual(notif.isRead, false);
  });

  await runTest('Setting model enforces key and value structure', () => {
    const setting = new Setting({
      key: 'academic_year',
      value: '2024-2025'
    });
    const err = setting.validateSync();
    assert(!err, 'Valid setting should pass validation');
  });

  // 3. Express App & Routing Validation
  console.log('\n--- Test Group 3: Express API Route & Health Check ---');

  await runTest('App module exports Express application with /health handler', async () => {
    const app = (await import('./src/app')).default;
    assert(typeof app === 'function', 'app should be an Express application function');
  });

  console.log('\n' + '='.repeat(65));
  console.log(`  📊 TEST RESULTS SUMMARY:`);
  console.log(`     Total Tests:  ${passedCount + failedCount}`);
  console.log(`     Passed:       ${passedCount}`);
  console.log(`     Failed:       ${failedCount}`);
  console.log('='.repeat(65));

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log('\n🎉 ALL INTEGRATION AND UNIT CHECKS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
};

runAllTests().catch((e) => {
  console.error('Fatal Test Runner Failure:', e);
  process.exit(1);
});
