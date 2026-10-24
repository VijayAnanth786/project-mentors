import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import teamRoutes from './routes/teamRoutes';
import progressRoutes from './routes/progressRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/progress', progressRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ProjectMentor Backend API'
  });
});

// Resilient MongoDB Initialization
const connectDatabase = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_mentor';
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log(`[Database] MongoDB successfully connected at ${mongoUri}`);
  } catch (err: any) {
    console.warn(`[Database Warning] Could not connect to local MongoDB (${err.message}). Running with in-memory controllers.`);
  }
};

connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 [ProjectMentor Server] Running on http://localhost:${PORT}`);
  });
});
