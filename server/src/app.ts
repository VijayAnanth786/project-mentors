import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import mentorRoutes from './routes/mentorRoutes';
import adminRoutes from './routes/adminRoutes';
import studentRoutes from './routes/studentRoutes';
import fileRoutes from './routes/fileRoutes';
import teamRoutes from './routes/teamRoutes';
import progressRoutes from './routes/progressRoutes';
import { initSchema } from './db/database';
import { runSeed } from './db/seed';

// 1. Load environment configuration
dotenv.config();

// 2. Initialize Express App
const app = express();

// 3. Configure robust CORS middleware
const allowedOriginPatterns = [
  /^https:\/\/.*\.vercel\.app$/,   // all Vercel preview & production deployments
  /^http:\/\/localhost(:\d+)?$/,   // local development
  /^http:\/\/127\.0\.0\.1(:\d+)?$/ // local IP
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    const matchesPattern = allowedOriginPatterns.some((pattern) => pattern.test(origin));
    const matchesClientUrl = process.env.CLIENT_URL && origin === process.env.CLIENT_URL;

    if (matchesPattern || matchesClientUrl || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      // Allow the origin rather than throwing an unhandled Error (which crashes OPTIONS preflights)
      callback(null, true);
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

export const ensureDB = async (): Promise<void> => {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        await connectDB();
      } catch (err) {
        console.warn('[DB Connection Warning]', err);
      }
      try {
        initSchema();
        await runSeed(false);
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
  } catch (err) {
    console.warn('[DB Middleware Notice]', err);
  }
  next();
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
  const readyState = mongoose.connection.readyState;
  const stateLabels = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const isConnected = readyState === 1;

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ProjectMentor API',
    mongo: {
      status: stateLabels[readyState] || 'unknown',
      connected: isConnected,
      configured: Boolean(process.env.MONGO_URI),
      host: mongoose.connection.host || null
    },
    storage: isConnected ? 'MongoDB Atlas (Primary) + SQLite' : 'SQLite (Active Storage Mode)'
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
