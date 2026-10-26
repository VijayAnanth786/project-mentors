import mongoose from 'mongoose';
import dns from 'dns';

// Reliable DNS resolvers for SRV record resolution across all networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

let isRetrying = false;
let lastMongoError: string | null = null;

export const getMongoDiagnostics = () => {
  const readyState = mongoose.connection.readyState;
  const stateLabels = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  return {
    status: stateLabels[readyState] || 'unknown',
    connected: readyState === 1,
    configured: Boolean(uri && !uri.includes('<username>') && !uri.includes('<password>')),
    host: mongoose.connection.host || null,
    lastError: lastMongoError
  };
};

const startAtlasBackgroundRetry = (mongoUri: string) => {
  if (isRetrying) return;
  isRetrying = true;

  const interval = setInterval(async () => {
    if (mongoose.connection.readyState === 1) {
      lastMongoError = null;
      clearInterval(interval);
      return;
    }
    try {
      const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000, dbName: 'pulse_app' });
      lastMongoError = null;
      console.log(`\n🚀 [MongoDB Atlas Connected] Host: ${conn.connection.host}`);
      clearInterval(interval);
    } catch (err: any) {
      // Atlas still rejecting IP whitelist, keep server running
    }
  }, 10000);
  interval.unref();
};

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri || mongoUri.includes('<username>') || mongoUri.includes('<password>')) {
    lastMongoError = 'Valid MONGO_URI or MONGODB_URI not provided in environment';
    console.warn('[MongoDB Atlas Notice] Valid MONGO_URI not configured. Operating in active storage mode.');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000, dbName: 'pulse_app' });
    lastMongoError = null;
    console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
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
    startAtlasBackgroundRetry(mongoUri);
  }
};

export default connectDB;
