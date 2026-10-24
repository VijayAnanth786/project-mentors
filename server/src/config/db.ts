import mongoose from 'mongoose';

let isRetrying = false;

const startAtlasBackgroundRetry = (mongoUri: string) => {
  if (isRetrying) return;
  isRetrying = true;
  const interval = setInterval(async () => {
    if (mongoose.connection.readyState === 1) {
      clearInterval(interval);
      return;
    }
    try {
      const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log(`\n🚀 [MongoDB Atlas Connected] Host: ${conn.connection.host}`);
      clearInterval(interval);
    } catch {
      // Atlas still rejecting IP whitelist, keep server running locally
    }
  }, 10000);
};

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri || mongoUri.includes('<username>') || mongoUri.includes('<password>')) {
    console.warn('[MongoDB Atlas Notice] Valid MONGO_URI not configured. Operating in local storage mode.');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.warn(`\n⚠️  [MongoDB Atlas Connection Notice] Could not connect directly to Atlas cluster.`);
    console.warn(`   Reason: Your current IP is not yet whitelisted in Atlas Network Access.`);
    console.warn(`   Server will remain ONLINE at http://localhost:5000 and retry Atlas in background.\n`);
    startAtlasBackgroundRetry(mongoUri);
  }
};

export default connectDB;
