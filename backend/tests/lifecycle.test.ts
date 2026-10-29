/**
 * Real integration test suite for the mentor lifecycle.
 *
 * No mocks: the Express app is started on a real TCP socket, every assertion uses
 * real HTTP via global fetch, and database state is verified directly through the
 * same SQLite file the app is using.
 *
 * Run from backend/:
 *   npx tsx --test tests/lifecycle.test.ts
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// Environment MUST be configured before any src/ module is imported. Static
// imports are hoisted, so src modules are only loaded dynamically inside hooks.
// ---------------------------------------------------------------------------
const TEST_DIR = __dirname;
const TMP_DIR = path.join(TEST_DIR, '.tmp');
const DB_FILE = path.join(TMP_DIR, 'lifecycle.db'); // backend/tests/.tmp/lifecycle.db
const BACKEND_DIR = path.resolve(TEST_DIR, '..');

if (fs.existsSync(TMP_DIR)) {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TMP_DIR, { recursive: true });

process.env.DB_MODE = 'sqlite';
process.env.SQLITE_PATH = DB_FILE;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret';
process.env.SEED_DEMO_DATA = 'false';
process.env.LOGIN_RATE_LIMIT_MAX = '1000';
process.env.CHANGE_PASSWORD_RATE_LIMIT_MAX = '1000';
process.env.TEMP_PASSWORD_TTL_HOURS = '72';
process.env.TEMP_PASSWORD_MAX_ATTEMPTS = '5';

// app.ts calls dotenv.config() for several locations. Empty (but present)
// values stop dotenv from re-introducing Atlas/Mongo settings from .env files,
// so DB_MODE=sqlite can never accidentally open a MongoDB connection.
process.env.MONGODB_URI = '';
process.env.MONGO_URI = '';

const RUN_ID = `${Date.now()}-${process.pid}`;
const ADMIN_EMAIL = 'admin-test@example.com';
const ADMIN_PASSWORD = 'Admin-Test-Password-123!';
const STUDENT_EMAIL = 'student-test@example.com';
const STUDENT_PASSWORD = 'Student-Test-Password-123!';

let emailCounter = 0;
function uniqueEmail(label: string): string {
  emailCounter += 1;
  return `lifecycle-${label}-${RUN_ID}-${emailCounter}@example.com`.toLowerCase();
}

let db: any;
let server: any;
let baseUrl = '';

interface ApiResult {
  status: number;
  body: any;
  text: string;
}

async function request(
  method: string,
  route: string,
  options: { body?: any; token?: string; base?: string } = {}
): Promise<ApiResult> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.token) headers.authorization = `Bearer ${options.token}`;

  const response = await fetch(`${options.base || baseUrl}${route}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body, text };
}

async function login(email: string, password: string, base?: string): Promise<ApiResult> {
  return request('POST', '/api/auth/login', { body: { email, password }, base });
}

async function adminLogin(base?: string): Promise<ApiResult> {
  const result = await login(ADMIN_EMAIL, ADMIN_PASSWORD, base);
  assert.equal(result.status, 200, `Admin login failed: ${result.status} ${result.text}`);
  assert.equal(result.body?.user?.role, 'admin');
  return result;
}

function cleanupEmails(emails: string[]): void {
  if (!db) return;
  for (const email of new Set(emails)) {
    try {
      db.prepare(
        'DELETE FROM mentor_profiles WHERE user_id IN (SELECT id FROM users WHERE email = ? COLLATE NOCASE)'
      ).run(email);
      db.prepare(
        'DELETE FROM student_profiles WHERE user_id IN (SELECT id FROM users WHERE email = ? COLLATE NOCASE)'
      ).run(email);
      db.prepare('DELETE FROM activity_events WHERE user_id IN (SELECT id FROM users WHERE email = ? COLLATE NOCASE)').run(
        email
      );
      db.prepare('DELETE FROM users WHERE email = ? COLLATE NOCASE').run(email);
    } catch (error: any) {
      // Cleanup is best-effort, but surface the problem because it can hide state leaks.
      console.error(`[cleanup] Failed to remove ${email}:`, error?.message || error);
    }
  }
}

function userRow(email: string): any {
  return db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email);
}

function mentorCountInDb(): number {
  return Number((db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'mentor'").get() as any).count);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (typeof (timer as any).unref === 'function') (timer as any).unref();
  });
}

async function stopChild(child: any): Promise<void> {
  if (!child || child.exitCode !== null) return;

  const exited = once(child, 'exit');
  child.kill();
  await Promise.race([exited, delay(5000)]);

  if (child.exitCode === null) {
    if (process.platform === 'win32' && child.pid) {
      spawnSync('taskkill', ['/pid', String(child.pid), '/f', '/t'], { stdio: 'ignore' });
    } else {
      try {
        child.kill('SIGKILL');
      } catch {}
    }
    await Promise.race([once(child, 'exit'), delay(5000)]);
  }
}

function startRestartServer(): Promise<{ child: any; base: string; logs: () => string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', path.join(TEST_DIR, 'restart-server.ts')], {
      cwd: BACKEND_DIR,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const fail = (reason: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.kill();
      } catch {}
      reject(new Error(`${reason}\n--- child stdout ---\n${stdout}\n--- child stderr ---\n${stderr}`));
    };

    const timer = setTimeout(() => fail('Timed out waiting for restart server to listen'), 30000);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      const match = stdout.match(/RESTART_SERVER_PORT=(\d+)/);
      if (match && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve({
          child,
          base: `http://127.0.0.1:${match[1]}`,
          logs: () => `--- child stdout ---\n${stdout}\n--- child stderr ---\n${stderr}`
        });
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => fail(`Failed to spawn restart server: ${error.message}`));
    child.on('exit', (code, signal) => fail(`Restart server exited before listening (code=${code}, signal=${signal})`));
  });
}

// ---------------------------------------------------------------------------
// Suite setup
// ---------------------------------------------------------------------------
before(async () => {
  const databaseModule = await import('../src/db/database');
  db = databaseModule.db;
  assert.equal(
    path.resolve(databaseModule.getSqlitePath()),
    path.resolve(DB_FILE),
    'Tests must run against the isolated lifecycle SQLite file'
  );
  databaseModule.initSchema();

  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, status, must_change_password)
    VALUES (?, ?, ?, ?, 'admin', 'active', 0)
  `).run('usr_test_admin', 'Lifecycle Test Admin', ADMIN_EMAIL, adminHash);

  const studentHash = await bcrypt.hash(STUDENT_PASSWORD, 10);
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, status, must_change_password)
    VALUES (?, ?, ?, ?, 'student', 'active', 0)
  `).run('usr_test_student', 'Lifecycle Test Student', STUDENT_EMAIL, studentHash);
  db.prepare(`
    INSERT INTO student_profiles (id, user_id, department, year_cohort, roll_number)
    VALUES (?, ?, 'Computer Science', '3rd Year', 'TEST-001')
  `).run('sp_usr_test_student', 'usr_test_student');

  const appModule = await import('../src/app');
  await appModule.ensureDB();

  const seededUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get() as any;
  assert.equal(Number(seededUsers.count), 2, 'SEED_DEMO_DATA=false must keep the DB limited to the two test users');

  await new Promise<void>((resolve, reject) => {
    server = appModule.default.listen(0, '127.0.0.1', () => resolve());
    server.once('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object', 'Expected a bound TCP address');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections?.();
    });
  }
  try {
    db?.close?.();
  } catch {}
  try {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {}
});

// ---------------------------------------------------------------------------
// 1. Admin login + /me
// ---------------------------------------------------------------------------
test('1. admin login returns role admin and /api/auth/me reflects it', async () => {
  const result = await adminLogin();
  assert.equal(result.status, 200);
  assert.equal(result.body.user.role, 'admin');
  assert.equal(result.body.mustChangePassword, false);
  assert.equal(result.body.user.mustChangePassword, false);
  assert.equal(typeof result.body.token, 'string');

  const me = await request('GET', '/api/auth/me', { token: result.body.token });
  assert.equal(me.status, 200, me.text);
  assert.equal(me.body.success, true);
  assert.equal(me.body.user.role, 'admin');
  assert.equal(me.body.user.email, ADMIN_EMAIL);

  const row = userRow(ADMIN_EMAIL);
  assert.ok(row, 'Admin row must exist in SQLite');
  assert.equal(row.role, 'admin');
  assert.equal(row.status, 'active');
  assert.equal(await bcrypt.compare(ADMIN_PASSWORD, row.password_hash), true);
});

// ---------------------------------------------------------------------------
// 2. Validation + case-insensitive duplicate email
// ---------------------------------------------------------------------------
test('2. mentor creation validates missing fields and rejects duplicate emails case-insensitively', async (t) => {
  const admin = await adminLogin();
  const token = admin.body.token;

  const missingNameEmail = uniqueEmail('missing-name');
  const missingDepartmentEmail = uniqueEmail('missing-department');
  const missingEmailName = `Missing Email Marker ${RUN_ID}`;
  const duplicateEmail = uniqueEmail('duplicate');
  const cleanupList = [missingNameEmail, missingDepartmentEmail, duplicateEmail];
  t.after(() => cleanupEmails(cleanupList));

  const missingName = await request('POST', '/api/admin/mentors', {
    token,
    body: { email: missingNameEmail, department: 'Computer Science' }
  });
  assert.equal(missingName.status, 400, missingName.text);
  assert.equal(missingName.body.code, 'VALIDATION_ERROR');
  assert.equal(userRow(missingNameEmail), undefined);

  const missingEmail = await request('POST', '/api/admin/mentors', {
    token,
    body: { name: missingEmailName, department: 'Computer Science' }
  });
  assert.equal(missingEmail.status, 400, missingEmail.text);
  assert.equal(missingEmail.body.code, 'VALIDATION_ERROR');
  const missingEmailRows = db.prepare('SELECT id FROM users WHERE name = ?').all(missingEmailName);
  assert.equal(missingEmailRows.length, 0);

  const missingDepartment = await request('POST', '/api/admin/mentors', {
    token,
    body: { name: `No Department ${RUN_ID}`, email: missingDepartmentEmail }
  });
  assert.equal(missingDepartment.status, 400, missingDepartment.text);
  assert.equal(missingDepartment.body.code, 'VALIDATION_ERROR');
  assert.equal(userRow(missingDepartmentEmail), undefined);

  const created = await request('POST', '/api/admin/mentors', {
    token,
    body: { name: `Duplicate Source ${RUN_ID}`, email: duplicateEmail, department: 'Computer Science' }
  });
  assert.equal(created.status, 201, created.text);

  const duplicate = await request('POST', '/api/admin/mentors', {
    token,
    body: {
      name: `Duplicate Attempt ${RUN_ID}`,
      email: duplicateEmail.toUpperCase(),
      department: 'Computer Science'
    }
  });
  assert.equal(duplicate.status, 409, duplicate.text);
  assert.equal(duplicate.body.code, 'EMAIL_EXISTS');

  const rows = db
    .prepare('SELECT id, email FROM users WHERE email = ? COLLATE NOCASE')
    .all(duplicateEmail) as any[];
  assert.equal(rows.length, 1, 'Duplicate creation must not add a second row');
  assert.equal(rows[0].email, duplicateEmail);
});

// ---------------------------------------------------------------------------
// 3. Create mentor: temp password, expiry, DB hash
// ---------------------------------------------------------------------------
test('3. creating a mentor returns one-time temp password and stores a bcrypt hash plus future expiry', async (t) => {
  const admin = await adminLogin();
  const email = uniqueEmail('create');
  t.after(() => cleanupEmails([email]));

  const before = Date.now();
  const created = await request('POST', '/api/admin/mentors', {
    token: admin.body.token,
    body: { name: `Create Mentor ${RUN_ID}`, email, department: 'Electrical Engineering' }
  });
  assert.equal(created.status, 201, created.text);
  assert.equal(created.body.success, true);
  assert.equal(created.body.data.email, email);
  assert.equal(created.body.data.role, 'mentor');
  assert.equal(created.body.data.mustChangePassword, true);

  const tempPassword = created.body.data.temporaryPassword;
  assert.equal(typeof tempPassword, 'string');
  assert.ok(tempPassword.length >= 8, 'Temporary password must be reasonably long');

  const responseExpiry = new Date(created.body.data.temporaryPasswordExpiresAt);
  assert.ok(Number.isFinite(responseExpiry.getTime()), 'Temporary password expiry must be a valid date');
  const hoursUntilExpiry = (responseExpiry.getTime() - before) / (60 * 60 * 1000);
  assert.ok(hoursUntilExpiry > 71 && hoursUntilExpiry < 73, `Expected ~72h expiry, got ${hoursUntilExpiry}h`);

  const row = userRow(email);
  assert.ok(row, 'Mentor row must exist');
  assert.equal(row.role, 'mentor');
  assert.equal(row.status, 'active');
  assert.equal(Number(row.must_change_password), 1);
  assert.ok(String(row.password_hash).startsWith('$2'), 'Password must be a bcrypt hash');
  assert.notEqual(row.password_hash, tempPassword, 'Plaintext password must never be stored');
  assert.equal(await bcrypt.compare(tempPassword, row.password_hash), true);
  assert.equal(await bcrypt.compare('definitely-not-the-temp-password', row.password_hash), false);
  assert.ok(new Date(row.temp_password_expires_at).getTime() > Date.now(), 'DB expiry must be in the future');
  assert.equal(new Date(row.temp_password_expires_at).getTime(), responseExpiry.getTime());
  assert.equal(Number(row.temp_password_attempts), 0);

  const profile = db.prepare('SELECT * FROM mentor_profiles WHERE user_id = ?').get(row.id) as any;
  assert.ok(profile, 'Mentor profile must exist');
  assert.equal(profile.department, 'Electrical Engineering');
});

// ---------------------------------------------------------------------------
// 4. Temp-password login is restricted to onboarding
// ---------------------------------------------------------------------------
test('4. new mentor can log in with temp password but dashboard is blocked with PASSWORD_CHANGE_REQUIRED', async (t) => {
  const admin = await adminLogin();
  const email = uniqueEmail('onboarding');
  t.after(() => cleanupEmails([email]));

  const created = await request('POST', '/api/admin/mentors', {
    token: admin.body.token,
    body: { name: `Onboarding Mentor ${RUN_ID}`, email, department: 'Computer Science' }
  });
  assert.equal(created.status, 201, created.text);
  const tempPassword = created.body.data.temporaryPassword;

  const loginResult = await login(email, tempPassword);
  assert.equal(loginResult.status, 200, loginResult.text);
  assert.equal(loginResult.body.mustChangePassword, true);
  assert.equal(loginResult.body.user.mustChangePassword, true);
  assert.equal(loginResult.body.user.role, 'mentor');
  assert.equal(typeof loginResult.body.token, 'string');

  const dashboard = await request('GET', '/api/mentor/dashboard', { token: loginResult.body.token });
  assert.equal(dashboard.status, 403, dashboard.text);
  assert.equal(dashboard.body.code, 'PASSWORD_CHANGE_REQUIRED');
  assert.equal(dashboard.body.mustChangePassword, true);

  const row = userRow(email);
  assert.equal(Number(row.must_change_password), 1);
  assert.equal(Number(row.temp_password_attempts), 0);
  assert.ok(row.last_login_at, 'Successful login must record last_login_at');
});

// ---------------------------------------------------------------------------
// 5. Change-password validation + success
// ---------------------------------------------------------------------------
test('5. change-password rejects short/same/wrong current passwords then succeeds and clears DB flag', async (t) => {
  const admin = await adminLogin();
  const email = uniqueEmail('change');
  t.after(() => cleanupEmails([email]));

  const created = await request('POST', '/api/admin/mentors', {
    token: admin.body.token,
    body: { name: `Change Password Mentor ${RUN_ID}`, email, department: 'Computer Science' }
  });
  assert.equal(created.status, 201, created.text);
  const tempPassword = created.body.data.temporaryPassword;

  const initialLogin = await login(email, tempPassword);
  assert.equal(initialLogin.status, 200, initialLogin.text);
  const token = initialLogin.body.token;
  const originalHash = userRow(email).password_hash;

  const shortPassword = await request('POST', '/api/auth/change-password', {
    token,
    body: { currentPassword: tempPassword, newPassword: 'short', confirmPassword: 'short' }
  });
  assert.equal(shortPassword.status, 400, shortPassword.text);
  assert.match(String(shortPassword.body.message), /at least 8/i);

  const samePassword = await request('POST', '/api/auth/change-password', {
    token,
    body: { currentPassword: tempPassword, newPassword: tempPassword, confirmPassword: tempPassword }
  });
  assert.equal(samePassword.status, 400, samePassword.text);

  const wrongCurrent = await request('POST', '/api/auth/change-password', {
    token,
    body: {
      currentPassword: 'wrong-current-password',
      newPassword: `Valid-New-Password-${RUN_ID}`,
      confirmPassword: `Valid-New-Password-${RUN_ID}`
    }
  });
  assert.equal(wrongCurrent.status, 400, wrongCurrent.text);
  assert.equal(wrongCurrent.body.code, 'CURRENT_PASSWORD_INCORRECT');

  const afterFailures = userRow(email);
  assert.equal(afterFailures.password_hash, originalHash, 'Rejected attempts must not change the hash');
  assert.equal(Number(afterFailures.must_change_password), 1);

  const newPassword = `Permanent-Password-${RUN_ID}-A1!`;
  const changed = await request('POST', '/api/auth/change-password', {
    token,
    body: { currentPassword: tempPassword, newPassword, confirmPassword: newPassword }
  });
  assert.equal(changed.status, 200, changed.text);
  assert.equal(changed.body.success, true);
  assert.equal(changed.body.user.mustChangePassword, false);
  assert.equal(typeof changed.body.token, 'string');

  const row = userRow(email);
  assert.equal(Number(row.must_change_password), 0);
  assert.notEqual(row.password_hash, originalHash);
  assert.equal(await bcrypt.compare(newPassword, row.password_hash), true);
  assert.equal(await bcrypt.compare(tempPassword, row.password_hash), false);
  assert.ok(row.password_changed_at, 'password_changed_at must be recorded');
  assert.ok(row.temp_password_consumed_at, 'temp_password_consumed_at must be recorded');

  const dashboard = await request('GET', '/api/mentor/dashboard', { token: changed.body.token });
  assert.equal(dashboard.status, 200, dashboard.text);
});

// ---------------------------------------------------------------------------
// 6. Old temp password stops working, new permanent password works
// ---------------------------------------------------------------------------
test('6. old temp password is rejected after change and new password can access dashboard', async (t) => {
  const admin = await adminLogin();
  const email = uniqueEmail('permanent');
  t.after(() => cleanupEmails([email]));

  const created = await request('POST', '/api/admin/mentors', {
    token: admin.body.token,
    body: { name: `Permanent Password Mentor ${RUN_ID}`, email, department: 'Computer Science' }
  });
  assert.equal(created.status, 201, created.text);
  const tempPassword = created.body.data.temporaryPassword;

  const tempLogin = await login(email, tempPassword);
  assert.equal(tempLogin.status, 200, tempLogin.text);

  const newPassword = `Permanent-Password-${RUN_ID}-B2!`;
  const changed = await request('POST', '/api/auth/change-password', {
    token: tempLogin.body.token,
    body: { currentPassword: tempPassword, newPassword, confirmPassword: newPassword }
  });
  assert.equal(changed.status, 200, changed.text);

  const oldLogin = await login(email, tempPassword);
  assert.equal(oldLogin.status, 401, oldLogin.text);
  assert.equal(oldLogin.body.code, 'INVALID_CREDENTIALS');

  const newLogin = await login(email, newPassword);
  assert.equal(newLogin.status, 200, newLogin.text);
  assert.equal(newLogin.body.mustChangePassword, false);
  assert.equal(newLogin.body.user.mustChangePassword, false);

  const dashboard = await request('GET', '/api/mentor/dashboard', { token: newLogin.body.token });
  assert.equal(dashboard.status, 200, dashboard.text);
  assert.equal(dashboard.body.success, true);

  const row = userRow(email);
  assert.equal(Number(row.must_change_password), 0);
  assert.equal(await bcrypt.compare(newPassword, row.password_hash), true);
  assert.equal(await bcrypt.compare(tempPassword, row.password_hash), false);
  assert.equal(Number(row.temp_password_attempts), 0);
});

// ---------------------------------------------------------------------------
// 7. Expired temporary password
// ---------------------------------------------------------------------------
test('7. expired temporary password is rejected with TEMP_PASSWORD_EXPIRED', async (t) => {
  const admin = await adminLogin();
  const email = uniqueEmail('expired');
  t.after(() => cleanupEmails([email]));

  const created = await request('POST', '/api/admin/mentors', {
    token: admin.body.token,
    body: { name: `Expired Mentor ${RUN_ID}`, email, department: 'Computer Science' }
  });
  assert.equal(created.status, 201, created.text);
  const tempPassword = created.body.data.temporaryPassword;
  const mentorId = created.body.data.id;

  const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const update = db.prepare('UPDATE users SET temp_password_expires_at = ? WHERE id = ?').run(past, mentorId);
  assert.equal(Number(update.changes), 1);

  const loginResult = await login(email, tempPassword);
  assert.equal(loginResult.status, 403, loginResult.text);
  assert.equal(loginResult.body.code, 'TEMP_PASSWORD_EXPIRED');

  const row = userRow(email);
  assert.equal(Number(row.must_change_password), 1);
  assert.equal(row.temp_password_expires_at, past);
  assert.ok(new Date(row.temp_password_expires_at).getTime() < Date.now());
});

// ---------------------------------------------------------------------------
// 8. Temporary password attempt lock + admin reissue
// ---------------------------------------------------------------------------
test('8. five wrong temp passwords lock the account; admin reissue restores access and invalidates the old password', async (t) => {
  const admin = await adminLogin();
  const email = uniqueEmail('locked');
  t.after(() => cleanupEmails([email]));

  const created = await request('POST', '/api/admin/mentors', {
    token: admin.body.token,
    body: { name: `Locked Mentor ${RUN_ID}`, email, department: 'Computer Science' }
  });
  assert.equal(created.status, 201, created.text);
  const oldTempPassword = created.body.data.temporaryPassword;
  const mentorId = created.body.data.id;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const failed = await login(email, `wrong-password-${attempt}`);
    if (attempt < 5) {
      assert.equal(failed.status, 401, `Attempt ${attempt}: ${failed.text}`);
      assert.equal(failed.body.code, 'INVALID_CREDENTIALS');
    } else {
      assert.equal(failed.status, 403, `Attempt ${attempt}: ${failed.text}`);
      assert.equal(failed.body.code, 'TEMP_PASSWORD_LOCKED');
    }
  }

  const lockedRow = userRow(email);
  assert.equal(Number(lockedRow.temp_password_attempts), 5);
  assert.equal(Number(lockedRow.must_change_password), 1);

  const nextAttempt = await login(email, oldTempPassword);
  assert.equal(nextAttempt.status, 403, nextAttempt.text);
  assert.equal(nextAttempt.body.code, 'TEMP_PASSWORD_LOCKED');

  const reissued = await request('POST', `/api/admin/mentors/${mentorId}/temp-password`, {
    token: admin.body.token
  });
  assert.equal(reissued.status, 200, reissued.text);
  assert.equal(reissued.body.success, true);
  const newTempPassword = reissued.body.data.temporaryPassword;
  assert.equal(typeof newTempPassword, 'string');
  assert.notEqual(newTempPassword, oldTempPassword);

  const reissuedRow = userRow(email);
  assert.equal(Number(reissuedRow.must_change_password), 1);
  assert.equal(Number(reissuedRow.temp_password_attempts), 0);
  assert.equal(await bcrypt.compare(newTempPassword, reissuedRow.password_hash), true);
  assert.equal(await bcrypt.compare(oldTempPassword, reissuedRow.password_hash), false);
  assert.ok(new Date(reissuedRow.temp_password_expires_at).getTime() > Date.now());

  const oldLogin = await login(email, oldTempPassword);
  assert.equal(oldLogin.status, 401, oldLogin.text);
  assert.equal(oldLogin.body.code, 'INVALID_CREDENTIALS');
  assert.equal(Number(userRow(email).temp_password_attempts), 1, 'Wrong old password must count as a failed attempt');

  const newLogin = await login(email, newTempPassword);
  assert.equal(newLogin.status, 200, newLogin.text);
  assert.equal(newLogin.body.mustChangePassword, true);
  assert.equal(Number(userRow(email).temp_password_attempts), 0, 'Successful login resets attempts');
});

// ---------------------------------------------------------------------------
// 9. Role authorization
// ---------------------------------------------------------------------------
test('9. mentor token cannot create mentors, student cannot access admin, admin can do both', async (t) => {
  const admin = await adminLogin();
  const mentorEmail = uniqueEmail('role-mentor');
  const blockedEmail = uniqueEmail('mentor-forbidden-attempt');
  const adminCreatedEmail = uniqueEmail('admin-created');
  t.after(() => cleanupEmails([mentorEmail, blockedEmail, adminCreatedEmail]));

  const created = await request('POST', '/api/admin/mentors', {
    token: admin.body.token,
    body: { name: `Role Mentor ${RUN_ID}`, email: mentorEmail, department: 'Computer Science' }
  });
  assert.equal(created.status, 201, created.text);
  const tempPassword = created.body.data.temporaryPassword;

  const tempLogin = await login(mentorEmail, tempPassword);
  assert.equal(tempLogin.status, 200, tempLogin.text);

  const mentorPassword = `Mentor-Password-${RUN_ID}-C3!`;
  const changed = await request('POST', '/api/auth/change-password', {
    token: tempLogin.body.token,
    body: { currentPassword: tempPassword, newPassword: mentorPassword, confirmPassword: mentorPassword }
  });
  assert.equal(changed.status, 200, changed.text);

  const mentorLogin = await login(mentorEmail, mentorPassword);
  assert.equal(mentorLogin.status, 200, mentorLogin.text);
  const mentorToken = mentorLogin.body.token;

  const forbiddenCreate = await request('POST', '/api/admin/mentors', {
    token: mentorToken,
    body: { name: `Forbidden Mentor ${RUN_ID}`, email: blockedEmail, department: 'Computer Science' }
  });
  assert.equal(forbiddenCreate.status, 403, forbiddenCreate.text);
  assert.equal(userRow(blockedEmail), undefined, 'Forbidden request must not write a mentor row');

  const adminCreate = await request('POST', '/api/admin/mentors', {
    token: admin.body.token,
    body: { name: `Admin Created Mentor ${RUN_ID}`, email: adminCreatedEmail, department: 'Computer Science' }
  });
  assert.equal(adminCreate.status, 201, adminCreate.text);
  const adminCreatedRow = userRow(adminCreatedEmail);
  assert.ok(adminCreatedRow);
  assert.equal(adminCreatedRow.role, 'mentor');

  const studentLogin = await login(STUDENT_EMAIL, STUDENT_PASSWORD);
  assert.equal(studentLogin.status, 200, studentLogin.text);
  assert.equal(studentLogin.body.user.role, 'student');

  const studentAdmin = await request('GET', '/api/admin/dashboard', { token: studentLogin.body.token });
  assert.equal(studentAdmin.status, 403, studentAdmin.text);

  const studentRow = userRow(STUDENT_EMAIL);
  assert.equal(studentRow.role, 'student');
  assert.equal(Number(studentRow.must_change_password), 0);
});

// ---------------------------------------------------------------------------
// 10. Counts consistency before/after deactivate + delete
// ---------------------------------------------------------------------------
test('10. dashboard totalMentors, mentors list count and DB count stay consistent through deactivate and delete', async (t) => {
  const admin = await adminLogin();
  const token = admin.body.token;

  const snapshot = async () => {
    const dashboard = await request('GET', '/api/admin/dashboard', { token });
    assert.equal(dashboard.status, 200, dashboard.text);
    const list = await request('GET', '/api/admin/mentors', { token });
    assert.equal(list.status, 200, list.text);
    return {
      dashboard: Number(dashboard.body.data.summary.totalMentors),
      listCount: Number(list.body.count),
      listLength: Number(list.body.data.length),
      db: mentorCountInDb()
    };
  };

  const baseline = await snapshot();
  assert.equal(baseline.dashboard, baseline.listCount);
  assert.equal(baseline.listCount, baseline.listLength);
  assert.equal(baseline.listLength, baseline.db);

  const email = uniqueEmail('counted');
  t.after(() => cleanupEmails([email]));

  const created = await request('POST', '/api/admin/mentors', {
    token,
    body: { name: `Counted Mentor ${RUN_ID}`, email, department: 'Computer Science' }
  });
  assert.equal(created.status, 201, created.text);
  const mentorId = created.body.data.id;

  const afterCreate = await snapshot();
  assert.equal(afterCreate.dashboard, baseline.dashboard + 1);
  assert.equal(afterCreate.listCount, afterCreate.dashboard);
  assert.equal(afterCreate.listLength, afterCreate.dashboard);
  assert.equal(afterCreate.db, afterCreate.dashboard);
  assert.ok(userRow(email), 'Created mentor must be present in DB');

  const deactivated = await request('PUT', `/api/admin/mentors/${mentorId}/status`, {
    token,
    body: { status: 'BLOCKED' }
  });
  assert.equal(deactivated.status, 200, deactivated.text);
  assert.equal(userRow(email).status, 'inactive');

  const afterDeactivate = await snapshot();
  assert.equal(afterDeactivate.dashboard, afterCreate.dashboard, 'Deactivation must not change role-based counts');
  assert.equal(afterDeactivate.listCount, afterDeactivate.dashboard);
  assert.equal(afterDeactivate.db, afterDeactivate.dashboard);

  const deleted = await request('DELETE', `/api/admin/mentors/${mentorId}`, { token });
  assert.equal(deleted.status, 200, deleted.text);
  assert.equal(userRow(email), undefined, 'Delete endpoint must remove the user row');
  const profileCount = db.prepare('SELECT COUNT(*) AS count FROM mentor_profiles WHERE user_id = ?').get(mentorId) as any;
  assert.equal(Number(profileCount.count), 0, 'Mentor profile must be removed with the user');

  const afterDelete = await snapshot();
  assert.equal(afterDelete.dashboard, baseline.dashboard);
  assert.equal(afterDelete.listCount, afterDelete.dashboard);
  assert.equal(afterDelete.listLength, afterDelete.dashboard);
  assert.equal(afterDelete.db, afterDelete.dashboard);
});

// ---------------------------------------------------------------------------
// 11. Persistence across real child-process restarts
// ---------------------------------------------------------------------------
test('11. created mentor survives two real server process restarts and can still log in', async (t) => {
  const admin = await adminLogin();
  const email = uniqueEmail('restart');
  const permanentPassword = `Restart-Password-${RUN_ID}-D4!`;
  t.after(() => cleanupEmails([email]));

  const created = await request('POST', '/api/admin/mentors', {
    token: admin.body.token,
    body: { name: `Restart Mentor ${RUN_ID}`, email, department: 'Computer Science' }
  });
  assert.equal(created.status, 201, created.text);
  const tempPassword = created.body.data.temporaryPassword;

  const tempLogin = await login(email, tempPassword);
  assert.equal(tempLogin.status, 200, tempLogin.text);
  const changed = await request('POST', '/api/auth/change-password', {
    token: tempLogin.body.token,
    body: { currentPassword: tempPassword, newPassword: permanentPassword, confirmPassword: permanentPassword }
  });
  assert.equal(changed.status, 200, changed.text);

  assert.ok(userRow(email), 'Mentor must exist in parent process DB before restart');

  let firstChild: any = null;
  let secondChild: any = null;
  try {
    const first = await startRestartServer();
    firstChild = first.child;

    const firstLogin = await login(email, permanentPassword, first.base);
    assert.equal(firstLogin.status, 200, `${firstLogin.text}\n${first.logs()}`);
    assert.equal(firstLogin.body.user.role, 'mentor');
    assert.equal(firstLogin.body.mustChangePassword, false);

    const firstAdmin = await adminLogin(first.base);
    const firstList = await request('GET', '/api/admin/mentors', { token: firstAdmin.body.token, base: first.base });
    assert.equal(firstList.status, 200, firstList.text);
    assert.ok(
      firstList.body.data.some((mentor: any) => String(mentor.email).toLowerCase() === email),
      'Restarted server must list the persisted mentor'
    );

    await stopChild(firstChild);
    firstChild = null;

    const parentRowAfterFirstRestart = userRow(email);
    assert.ok(parentRowAfterFirstRestart, 'Mentor must still exist in SQLite after first child process exit');
    assert.equal(parentRowAfterFirstRestart.role, 'mentor');
    assert.equal(await bcrypt.compare(permanentPassword, parentRowAfterFirstRestart.password_hash), true);

    const second = await startRestartServer();
    secondChild = second.child;

    const secondLogin = await login(email, permanentPassword, second.base);
    assert.equal(secondLogin.status, 200, `${secondLogin.text}\n${second.logs()}`);
    assert.equal(secondLogin.body.user.email, email);

    const secondAdmin = await adminLogin(second.base);
    const secondList = await request('GET', '/api/admin/mentors', { token: secondAdmin.body.token, base: second.base });
    assert.equal(secondList.status, 200, secondList.text);
    assert.ok(
      secondList.body.data.some((mentor: any) => String(mentor.email).toLowerCase() === email),
      'Mentor must survive a second process restart'
    );

    await stopChild(secondChild);
    secondChild = null;

    const finalRow = userRow(email);
    assert.ok(finalRow, 'Mentor row must remain after both restarts');
    assert.equal(finalRow.role, 'mentor');
    assert.equal(Number(finalRow.must_change_password), 0);
    assert.equal(await bcrypt.compare(permanentPassword, finalRow.password_hash), true);
    assert.equal(mentorCountInDb() >= 1, true);
  } finally {
    await stopChild(firstChild);
    await stopChild(secondChild);
  }
});
