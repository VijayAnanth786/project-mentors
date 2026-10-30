const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration in serverless context
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../backend/.env') });
dotenv.config({ path: path.join(__dirname, '../atlas-credentials.env') });

// Vercel serverless startup diagnostics (visible in Vercel function logs)
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const hasUri = mongoUri.length > 0 && !mongoUri.includes('<username>') && !mongoUri.includes('<password>');
console.log(
  `[Vercel Startup] NODE_ENV=${process.env.NODE_ENV} | DB_MODE=${process.env.DB_MODE || 'unset'} | MONGODB_URI=${hasUri ? 'configured' : 'MISSING'}`
);
if (!hasUri) {
  console.error(
    '[Vercel Startup] MONGODB_URI is not set. Go to Vercel Dashboard → Settings → Environment Variables and add MONGODB_URI.'
  );
}

const app = require('../backend/dist/app').default;

module.exports = app;
