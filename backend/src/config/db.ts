import mongoose from 'mongoose';
import dns from 'dns';
import { isMongoMode } from './storageMode';

// Reliable DNS resolvers for SRV record resolution across all networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

let isRetrying = false;
let lastMongoError: string | null = null;
let retryInterval: NodeJS.Timeout | null = null;
let listenersRegistered = false;

/**
 * Safely masks MongoDB connection string to prevent credential exposure in logs
 */
export const maskMongoUri = (uri?: string): string => {
  if (!uri) return 'NOT_CONFIGURED';
  try {
    return uri.replace(/:([^:@]+)@/, ':****@');
  } catch {
    return '[MASKED_URI]';
  }
};

/**
 * Returns database health and connectivity status without exposing sensitive credentials
 */
export const getMongoDiagnostics = () => {
  const readyState = mongoose.connection.readyState;
  const stateLabels = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || 'pulse_app';

  return {
    status: stateLabels[readyState] || 'unknown',
    connected: readyState === 1,
    configured: Boolean(uri && !uri.includes('<username>') && !uri.includes('<password>')),
    host: mongoose.connection.host || null,
    dbName: mongoose.connection.name || dbName,
    lastError: lastMongoError,
    mode: process.env.DB_MODE || (process.env.NODE_ENV === 'production' ? 'mongo' : 'auto')
  };
};

/**
 * Sets up global Mongoose connection lifecycle listeners and graceful process shutdown
 */
const registerConnectionLifecycle = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('connected', () => {
    lastMongoError = null;
    console.log(`🚀 [MongoDB Atlas] Connected to host: ${mongoose.connection.host} | Database: ${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (err: any) => {
    const errorMsg = err?.message || String(err);
    lastMongoError = errorMsg;
    console.warn(`⚠️  [MongoDB Atlas Connection Error] ${errorMsg}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('ℹ️  [MongoDB Atlas] Disconnected from database cluster.');
  });

  // Graceful shutdown on process termination
  const gracefulShutdown = async (signal: string) => {
    if (retryInterval) clearInterval(retryInterval);
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.connection.close(false);
        console.log(`[MongoDB Atlas] Connection closed cleanly due to ${signal}.`);
      } catch (err) {
        console.warn('[MongoDB Atlas] Error closing connection on shutdown:', err);
      }
    }
  };

  process.once('SIGINT', () => gracefulShutdown('SIGINT'));
  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
};

const startAtlasBackgroundRetry = (mongoUri: string, dbName: string) => {
  if (isRetrying) return;
  isRetrying = true;

  retryInterval = setInterval(async () => {
    if (mongoose.connection.readyState === 1) {
      lastMongoError = null;
      if (retryInterval) clearInterval(retryInterval);
      isRetrying = false;
      return;
    }
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
        dbName
      });
      lastMongoError = null;
      if (retryInterval) clearInterval(retryInterval);
      isRetrying = false;
    } catch {
      // Atlas still rejecting (e.g. firewall/whitelist), continue running
    }
  }, 10000);

  if (retryInterval.unref) {
    retryInterval.unref();
  }
};

/**
 * Connect to MongoDB Atlas with connection pooling and non-blocking offline resilience
 */
export const connectDB = async (): Promise<void> => {
  registerConnectionLifecycle();

  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || 'pulse_app';

  if (!mongoUri || mongoUri.includes('<username>') || mongoUri.includes('<password>')) {
    lastMongoError = 'Valid MONGODB_URI or MONGO_URI not provided in environment';
    if (isMongoMode()) {
      throw new Error('DB_MODE=mongo requires a valid MONGODB_URI. Refusing to start with ephemeral storage.');
    }
    console.warn('[MongoDB Atlas Notice] Valid MONGODB_URI not configured. Operating in active storage mode.');
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      dbName
    });
    lastMongoError = null;
  } catch (error: any) {
    if (isMongoMode()) {
      lastMongoError = error?.message || 'MongoDB connection failed';
      await mongoose.disconnect().catch(() => {});
      throw new Error(
        `MongoDB is required (DB_MODE=mongo) but the connection failed: ${lastMongoError}. ` +
        'Refusing to serve requests with ephemeral SQLite storage.'
      );
    }

    const isIpIssue =
      error.message?.includes('SSL alert number 80') ||
      error.message?.includes('tlsv1 alert internal error') ||
      error.message?.includes('whitelist') ||
      error.name === 'MongooseServerSelectionError';

    lastMongoError = isIpIssue
      ? 'MongoDB Atlas Firewall: Client IP not whitelisted. Please add 0.0.0.0/0 to Atlas Network Access.'
      : (error.message || 'Unknown MongoDB connection error');

    console.warn(`\n⚠️  [MongoDB Atlas Connection Notice] Could not connect directly to Atlas cluster.`);
    console.warn(`   Reason: ${lastMongoError}`);
    console.warn(`   Server will remain ONLINE using active storage and retry Atlas in background.\n`);
    startAtlasBackgroundRetry(mongoUri, dbName);
  }
};

export default connectDB;
