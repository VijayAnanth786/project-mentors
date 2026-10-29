const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration in serverless context
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../backend/.env') });
dotenv.config({ path: path.join(__dirname, '../atlas-credentials.env') });

const app = require('../backend/dist/app').default;

module.exports = app;
