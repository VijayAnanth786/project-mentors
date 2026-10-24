import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// 2. Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// 3. Configure middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// 4. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/progress', progressRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ProjectMentor Production API',
    database: 'MongoDB Atlas + Mongoose'
  });
});

// 5. Start database initialization and launch server
const startServer = async () => {
  try {
    // Await database connection before listening
    await connectDB();

    // Preserve existing SQLite schema and seed for teams/progress if available
    try {
      initSchema();
      await runSeed();
    } catch (dbErr) {
      console.warn('[Local Schema Notice]', dbErr);
    }

    app.listen(PORT, () => {
      console.log(`🚀 [ProjectMentor Server] Running on http://localhost:${PORT}`);
    });
  } catch (error: any) {
    console.error(`[Server Startup Failure] ${error?.message || error}`);
    process.exit(1);
  }
};

startServer();

