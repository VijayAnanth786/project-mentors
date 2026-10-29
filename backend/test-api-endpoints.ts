import http from 'http';
import assert from 'assert';
import path from 'path';
import dotenv from 'dotenv';

// Load environment for test
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../atlas-credentials.env') });

import app from './src/app';

console.log('='.repeat(65));
console.log('  🌐 ProjectMentor - Live API Endpoints Verification Suite');
console.log('='.repeat(65));

let server: http.Server;
let baseUrl: string;
let passedCount = 0;
let failedCount = 0;

const runTest = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}: ${err?.message || err}`);
    failedCount++;
  }
};

const startServerAndRun = async () => {
  // Bind to an ephemeral port
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      console.log(`\n🚀 Test server listening on ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // 1. Health Diagnostics
    console.log('--- Test Group 1: Health & Diagnostics Endpoints ---');

    await runTest('GET /health returns health diagnostics without leaking secrets', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      const body = await res.json() as any;
      assert.strictEqual(body.status, 'healthy');
      assert(body.mongo, 'Mongo diagnostics object must be present');
      assert(typeof body.mongo.configured === 'boolean', 'configured must be boolean');
      assert(typeof body.mongo.connected === 'boolean', 'connected must be boolean');
      assert(!JSON.stringify(body).includes('ZYZIqm1fh9xFqRCv'), 'Password must never leak');
    });

    await runTest('GET /api/health also resolves via /api prefix router', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      const body = await res.json() as any;
      assert.strictEqual(body.status, 'healthy');
    });

    // 2. Authentication Flow
    console.log('\n--- Test Group 2: Authentication & Security Endpoints ---');

    await runTest('POST /api/auth/login rejects invalid credentials with 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@college.edu', password: 'wrong' })
      });
      assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
      const body = await res.json() as any;
      assert.strictEqual(body.success, false);
    });

    let adminToken = '';
    await runTest('POST /api/auth/login succeeds with seeded admin account and issues JWT', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@college.edu', password: 'siet@2727' })
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      const body = await res.json() as any;
      assert.strictEqual(body.success, true);
      assert(body.token, 'JWT token must be returned');
      assert.strictEqual(body.user.role, 'admin');
      adminToken = body.token;
    });

    await runTest('GET /api/auth/me returns current authenticated user profile', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      const body = await res.json() as any;
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.user.email, 'admin@college.edu');
    });

    // 3. Admin Protected Endpoints
    console.log('\n--- Test Group 3: Protected Role-Governed Endpoints ---');

    await runTest('GET /api/admin/dashboard returns operational summary to authenticated admin', async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      const body = await res.json() as any;
      assert.strictEqual(body.success, true);
      assert(body.data.summary, 'Summary stats should be provided');
    });

    await runTest('GET /api/admin/settings returns system settings', async () => {
      const res = await fetch(`${baseUrl}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      const body = await res.json() as any;
      assert.strictEqual(body.success, true);
      assert(typeof body.data === 'object');
    });

    await runTest('POST /api/admin/announcements creates a new notice', async () => {
      const res = await fetch(`${baseUrl}/api/admin/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: 'Atlas Integration Test Notice',
          message: 'Automated verification test broadcast.',
          audience: 'all'
        })
      });
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
      const body = await res.json() as any;
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.title, 'Atlas Integration Test Notice');
    });

    await runTest('GET /api/admin/announcements retrieves the published notice', async () => {
      const res = await fetch(`${baseUrl}/api/admin/announcements`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      const body = await res.json() as any;
      assert.strictEqual(body.success, true);
      const found = body.data.some((a: any) => a.title === 'Atlas Integration Test Notice');
      assert(found, 'Created announcement must appear in list');
    });

    // 4. Role Authorization Restrictions
    console.log('\n--- Test Group 4: Authorization Guard Validation ---');

    await runTest('Protected endpoints reject requests without Authorization token with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`);
      assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    });

    await runTest('POST /api/student/submissions rejects unauthenticated submissions with 401', async () => {
      const res = await fetch(`${baseUrl}/api/student/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: 'team1', weekNumber: 1 })
      });
      assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    });

  } finally {
    server.close();
  }

  console.log('\n' + '='.repeat(65));
  console.log(`  📊 API VERIFICATION RESULTS:`);
  console.log(`     Total Endpoints Tested: ${passedCount + failedCount}`);
  console.log(`     Passed:                 ${passedCount}`);
  console.log(`     Failed:                 ${failedCount}`);
  console.log('='.repeat(65));

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log('\n🎉 ALL LIVE API ENDPOINT VERIFICATIONS PASSED!\n');
    process.exit(0);
  }
};

startServerAndRun().catch((err) => {
  console.error('Fatal API Test Error:', err);
  if (server) server.close();
  process.exit(1);
});
