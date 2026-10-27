"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDB = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
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
// 1. Load environment configuration across multiple possible locations
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), 'server/.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), 'atlas-credentials.env') });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../server/.env') });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../atlas-credentials.env') });
// 2. Initialize Express App
const app = (0, express_1.default)();
// 3. Configure robust CORS middleware
const allowedOriginPatterns = [
    /^https:\/\/.*\.vercel\.app$/, // all Vercel preview & production deployments
    /^http:\/\/localhost(:\d+)?$/, // local development
    /^http:\/\/127\.0\.0\.1(:\d+)?$/ // local IP
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow non-browser requests (curl, Postman, server-to-server)
        if (!origin)
            return callback(null, true);
        const matchesPattern = allowedOriginPatterns.some((pattern) => pattern.test(origin));
        const matchesClientUrl = process.env.CLIENT_URL && origin === process.env.CLIENT_URL;
        if (matchesPattern || matchesClientUrl || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        }
        else {
            // Allow the origin rather than throwing an unhandled Error (which crashes OPTIONS preflights)
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
// Handle preflight OPTIONS requests cleanly across all routes
app.options('*', (0, cors_1.default)());
// 4. Body Parsers
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// 5. Database Initialization Management
let dbInitPromise = null;
const ensureDB = async () => {
    if (mongoose_1.default.connection.readyState !== 1 && mongoose_1.default.connection.readyState !== 2) {
        try {
            await (0, db_1.connectDB)();
        }
        catch (err) {
            console.warn('[DB Connection Warning]', err);
        }
    }
    if (!dbInitPromise) {
        dbInitPromise = (async () => {
            try {
                (0, database_1.initSchema)();
                await (0, seed_1.runSeed)(false);
            }
            catch (dbErr) {
                console.warn('[Local Schema Notice]', dbErr);
            }
        })();
    }
    await dbInitPromise;
};
exports.ensureDB = ensureDB;
// Ensure DB is initialized before executing route handlers
app.use(async (req, res, next) => {
    try {
        await (0, exports.ensureDB)();
    }
    catch (err) {
        console.warn('[DB Middleware Notice]', err);
    }
    next();
});
// 6. API Router (mounted on both /api and root to handle any routing/proxy prefix variation)
const apiRouter = express_1.default.Router();
apiRouter.use('/auth', authRoutes_1.default);
apiRouter.use('/mentor', mentorRoutes_1.default);
apiRouter.use('/admin', adminRoutes_1.default);
apiRouter.use('/student', studentRoutes_1.default);
apiRouter.use('/files', fileRoutes_1.default);
apiRouter.use('/teams', teamRoutes_1.default);
apiRouter.use('/progress', progressRoutes_1.default);
apiRouter.get('/health', (req, res) => {
    const mongoDiag = (0, db_1.getMongoDiagnostics)();
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'ProjectMentor API',
        mongo: mongoDiag,
        storage: mongoDiag.connected ? 'MongoDB Atlas (Primary) + SQLite' : 'SQLite (Active Storage Mode)'
    });
});
app.use('/api', apiRouter);
app.use(apiRouter);
// 7. Global Error Handler (guarantees JSON response instead of HTML 500 error pages)
app.use((err, req, res, next) => {
    console.error('[Unhandled API Error]', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'An internal server error occurred.'
    });
});
exports.default = app;
