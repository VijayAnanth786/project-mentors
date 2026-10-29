import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB, getMongoDiagnostics } from './config/db';
import authRoutes from './routes/authRoutes';
import mentorRoutes from './routes/mentorRoutes';
import adminRoutes from './routes/adminRoutes';
import studentRoutes from './routes/studentRoutes';
import fileRoutes from './routes/fileRoutes';
import teamRoutes from './routes/teamRoutes';
import progressRoutes from './routes/progressRoutes';
import { initSchema, isSqlitePersistent } from './db/database';
import { runSeed } from './db/seed';
import { assertStorageReady, getStorageMode, useMongo } from './config/storageMode';

// 1. Load environment configuration across multiple possible locations
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'atlas-credentials.env') });
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../atlas-credentials.env') });
dotenv.config({ path: path.resolve(__dirname, '../atlas-credentials.env') });

// 2. Initialize Express App
const app = express();
app.set('trust proxy', 1);

// 3. Configure robust CORS middleware
const localOriginPatterns = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/
];
const productionOriginPatterns = [
  /^https:\/\/.*\.vercel\.app$/
];
const configuredOrigins = String(process.env.CORS_ORIGINS || process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    const isDev = process.env.NODE_ENV !== 'production';
    const patterns = isDev ? [...localOriginPatterns, ...productionOriginPatterns] : productionOriginPatterns;
    const matchesPattern = patterns.some((pattern) => pattern.test(origin));
    const matchesConfigured = configuredOrigins.includes(origin);

    if (matchesPattern || matchesConfigured) {
      callback(null, true);
    } else {
      // Reject without CORS headers. Do not throw, so preflight does not crash.
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Handle preflight OPTIONS requests cleanly across all routes
app.options('*', cors());

// 4. Body Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 5. Database Initialization Management
let dbInitPromise: Promise<void> | null = null;
let hasAttemptedInitialConnect = false;

export const ensureDB = async (): Promise<void> => {
  if (!hasAttemptedInitialConnect && mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
    hasAttemptedInitialConnect = true;
    // In DB_MODE=mongo this throws, deliberately failing startup instead of
    // silently accepting writes into ephemeral storage.
    await connectDB();
  }

  // MongoDB was requested and is connected: SQLite is not initialized or used.
  if (useMongo()) {
    assertStorageReady();
    return;
  }

  if (getStorageMode() === 'mongo') {
    assertStorageReady();
    return;
  }

  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        initSchema();
        const shouldSeed = process.env.SEED_DEMO_DATA
          ? process.env.SEED_DEMO_DATA === 'true'
          : process.env.NODE_ENV !== 'production';
        if (shouldSeed) {
          await runSeed(false);
        }
      } catch (dbErr) {
        console.warn('[Local Schema Notice]', dbErr);
      }
    })();
  }
  await dbInitPromise;
};

// Ensure DB is initialized before executing route handlers
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureDB();
    next();
  } catch (err: any) {
    console.error('[DB Middleware Failure]', err?.message || err);
    res.status(503).json({
      success: false,
      code: 'STORAGE_UNAVAILABLE',
      message: 'The configured database is unavailable. No data was written.'
    });
  }
});

// 6. API Router (mounted on both /api and root to handle any routing/proxy prefix variation)
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/mentor', mentorRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/student', studentRoutes);
apiRouter.use('/files', fileRoutes);
apiRouter.use('/teams', teamRoutes);
apiRouter.use('/progress', progressRoutes);

apiRouter.get('/health', (req: Request, res: Response) => {
  const mongoDiag = getMongoDiagnostics();
  const mode = getStorageMode();
  const mongoHealthy = mongoDiag.connected;
  const sqliteHealthy = mode !== 'mongo';
  const healthy = mode === 'mongo' ? mongoHealthy : sqliteHealthy;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    service: 'ProjectMentor API',
    mongo: mongoDiag,
    storage: {
      mode,
      connected: mode === 'mongo' ? mongoHealthy : sqliteHealthy,
      persistent: mode === 'mongo' ? mongoHealthy : isSqlitePersistent(),
      dbName: mode === 'mongo' ? mongoDiag.dbName : 'project_mentor.db'
    }
  });
});

app.use('/api', apiRouter);
app.use(apiRouter);

// 7. Global Error Handler (guarantees JSON response instead of HTML 500 error pages)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled API Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An internal server error occurred.'
  });
});

export default app;
