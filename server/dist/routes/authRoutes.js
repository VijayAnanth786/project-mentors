"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Login rate limiter: max 10 requests per 15 minutes per IP
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
router.post('/register', authController_1.register);
router.post('/login', loginLimiter, authController_1.login);
router.get('/me', authMiddleware_1.authenticateJWT, authController_1.getMe);
router.post('/change-password', authMiddleware_1.authenticateJWT, authController_1.changePassword);
router.post('/logout', authController_1.logout);
exports.default = router;
