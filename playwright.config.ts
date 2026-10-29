import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = __dirname;
const e2eTmpDir = path.join(rootDir, 'e2e', '.tmp');
const sqlitePath = path.join(e2eTmpDir, 'e2e.db');

// Playwright loads this config before it starts the webServer entries. Remove
// the E2E database here so the backend always starts from a clean SQLite file
// and runs the demo seed exactly once for this suite. A globalSetup hook is
// too late: webServer plugins are started before globalSetup. The worker
// processes also load this config, so only reset the file in the orchestrator.
if (!process.env.TEST_WORKER_INDEX) {
  fs.mkdirSync(e2eTmpDir, { recursive: true });
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(`${sqlitePath}${suffix}`, { force: true });
  }
}

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 15_000
  },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join('e2e', '.artifacts', 'report'), open: 'never' }]
  ],
  outputDir: path.join('e2e', '.artifacts', 'test-results'),
  use: {
    baseURL: 'http://127.0.0.1:5173',
    channel: 'chrome',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: [
    {
      command: 'npm --prefix backend run dev',
      name: 'backend',
      port: 5000,
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        DB_MODE: 'sqlite',
        SQLITE_PATH: sqlitePath,
        NODE_ENV: 'development',
        JWT_SECRET: 'e2e-test-secret',
        SEED_DEMO_DATA: 'true',
        PORT: '5000',
        LOGIN_RATE_LIMIT_MAX: '1000',
        CHANGE_PASSWORD_RATE_LIMIT_MAX: '1000',
        // Keep the suite hermetic: never attempt to reach an Atlas cluster
        // that may be configured in local .env / atlas-credentials.env files.
        MONGODB_URI: '',
        MONGO_URI: ''
      }
    },
    {
      command: 'npm --prefix frontend run dev',
      name: 'frontend',
      port: 5173,
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        BROWSER: 'none'
      }
    }
  ]
});
