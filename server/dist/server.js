"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const mentorRoutes_1 = __importDefault(require("./routes/mentorRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const studentRoutes_1 = __importDefault(require("./routes/studentRoutes"));
const fileRoutes_1 = __importDefault(require("./routes/fileRoutes"));
const teamRoutes_1 = __importDefault(require("./routes/teamRoutes"));
const progressRoutes_1 = __importDefault(require("./routes/progressRoutes"));
const database_1 = require("./db/database");
const seed_1 = require("./db/seed");
// 1. Load environment configuration
dotenv_1.default.config();
// 2. Initialize Express
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// 3. Configure middleware
app.use((0, cors_1.default)({
    origin: true,
    credentials: true
}));
app.use(express_1.default.json());
// 4. API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/mentor', mentorRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/student', studentRoutes_1.default);
app.use('/api/files', fileRoutes_1.default);
app.use('/api/teams', teamRoutes_1.default);
app.use('/api/progress', progressRoutes_1.default);
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
        await (0, db_1.connectDB)();
        // Preserve existing SQLite schema and seed for teams/progress if available
        try {
            (0, database_1.initSchema)();
            await (0, seed_1.runSeed)();
        }
        catch (dbErr) {
            console.warn('[Local Schema Notice]', dbErr);
        }
        app.listen(PORT, () => {
            console.log(`🚀 [ProjectMentor Server] Running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error(`[Server Startup Failure] ${error?.message || error}`);
        process.exit(1);
    }
};
startServer();
