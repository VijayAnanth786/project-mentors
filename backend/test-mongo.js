const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const https = require('https');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

// Load env files in priority order
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../atlas-credentials.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'atlas-credentials.env') });

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
const dbName = process.env.DB_NAME || 'pulse_app';

async function checkPublicIp() {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('Unknown (timeout)'), 2500);
    const req = https.get('https://api.ipify.org?format=json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timer);
        try {
          resolve(JSON.parse(data).ip);
        } catch {
          resolve('Unknown');
        }
      });
    });
    req.on('error', () => {
      clearTimeout(timer);
      resolve('Unknown');
    });
  });
}

async function testConnection() {
  console.log('='.repeat(65));
  console.log('  🔍 ProjectMentor - MongoDB Atlas Connection Diagnostic Tool');
  console.log('='.repeat(65));

  if (!mongoUri) {
    console.error('\n❌ ERROR: Neither MONGO_URI nor MONGODB_URI found in environment.');
    console.log('Please ensure backend/.env or atlas-credentials.env is configured.');
    process.exit(1);
  }

  // Mask password for display
  const maskedUri = mongoUri.replace(/:([^:@]+)@/, ':****@');
  console.log(`\n📌 Target URI: ${maskedUri}`);

  const publicIp = await checkPublicIp();
  console.log(`🌐 Detected Public IP: ${publicIp}`);
  console.log('\n⏳ Attempting to connect to MongoDB Atlas (timeout 8s)...');

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      dbName
    });

    console.log('\n🎉 SUCCESS: Successfully connected to MongoDB Atlas!');
    console.log(`   Host:     ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   State:    Connected (Ready State: 1)`);
    console.log('\n✅ Your MongoDB Atlas database is functioning properly!\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.log('\n❌ FAILED TO CONNECT TO MONGODB ATLAS:');
    console.log(`   Error Name:    ${err.name}`);
    console.log(`   Error Message: ${err.message}`);

    const isIpWhitelistError = 
      err.message.includes('SSL alert number 80') ||
      err.message.includes('tlsv1 alert internal error') ||
      err.message.includes('whitelist') ||
      err.name === 'MongooseServerSelectionError';

    if (isIpWhitelistError) {
      console.log('\n' + '='.repeat(65));
      console.log('  🚨 ROOT CAUSE: MongoDB Atlas IP Access List (Firewall)');
      console.log('='.repeat(65));
      console.log(`\nYour current IP address (${publicIp}) is not permitted by MongoDB Atlas.`);
      console.log('MongoDB Atlas actively dropped the TLS handshake (SSL alert 80).\n');
      console.log('📋 ACTION REQUIRED TO RESOLVE:');
      console.log('  1. Open your browser and log in to https://cloud.mongodb.com/');
      console.log('  2. In the left sidebar under "Security", click "Network Access"');
      console.log('  3. Click the green "+ ADD IP ADDRESS" button');
      console.log('  4. Click "ALLOW ACCESS FROM ANYWHERE" (adds 0.0.0.0/0)');
      console.log('     (This is essential for both your machine and Vercel cloud functions)');
      console.log('  5. Click "Confirm" and wait ~30 seconds for Atlas to apply it');
      console.log('  6. Re-run this test: npm run test:mongo\n');
    } else if (err.message.includes('bad auth') || err.message.includes('Authentication failed')) {
      console.log('\n' + '='.repeat(65));
      console.log('  🚨 ROOT CAUSE: Authentication Failed');
      console.log('='.repeat(65));
      console.log('\nThe MongoDB username or password in your URI is incorrect.');
      console.log('Please check your credentials in atlas-credentials.env or backend/.env.\n');
    }

    process.exit(1);
  }
}

testConnection();
