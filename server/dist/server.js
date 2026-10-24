"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const teamRoutes_1 = __importDefault(require("./routes/teamRoutes"));
const progressRoutes_1 = __importDefault(require("./routes/progressRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/teams', teamRoutes_1.default);
app.use('/api/progress', progressRoutes_1.default);
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
        await mongoose_1.default.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
        console.log(`[Database] MongoDB successfully connected at ${mongoUri}`);
    }
    catch (err) {
        console.warn(`[Database Warning] Could not connect to local MongoDB (${err.message}). Running with in-memory controllers.`);
    }
};
connectDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 [ProjectMentor Server] Running on http://localhost:${PORT}`);
    });
});
