"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = exports.requireRoles = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const database_1 = require("../db/database");
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_replace_in_production';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        let userDoc = null;
        if (mongoose_1.default.connection.readyState === 1) {
            try {
                userDoc = await User_1.User.findById(decoded.id);
            }
            catch { }
        }
        if (!userDoc) {
            try {
                const row = database_1.db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
                if (row) {
                    userDoc = {
                        _id: row.id,
                        id: row.id,
                        name: row.name,
                        email: row.email,
                        role: row.role,
                        status: row.status.toUpperCase(),
                        department: 'Computer Science',
                        mustChangePassword: false
                    };
                }
            }
            catch { }
        }
        // In serverless multi-container environments, respect verified signed JWT token claims
        if (!userDoc && decoded && decoded.id && decoded.email) {
            userDoc = {
                _id: decoded.id,
                id: decoded.id,
                name: decoded.name || 'User',
                email: decoded.email,
                role: decoded.role || 'student',
                status: 'ACTIVE',
                department: decoded.department || 'Computer Science',
                mustChangePassword: false
            };
        }
        if (!userDoc) {
            res.status(401).json({ success: false, message: 'User not found or session invalid.' });
            return;
        }
        if (userDoc.status === 'BLOCKED' || userDoc.status === 'INACTIVE') {
            res.status(403).json({ success: false, message: 'Account is blocked. Please contact an administrator.' });
            return;
        }
        req.user = {
            id: userDoc.id || userDoc._id.toString(),
            name: userDoc.name,
            email: userDoc.email,
            role: userDoc.role.toLowerCase(),
            status: userDoc.status.toLowerCase(),
            department: userDoc.department,
            mustChangePassword: userDoc.mustChangePassword
        };
        // If user must change password, restrict them from protected operational routes
        if (userDoc.mustChangePassword &&
            !req.path.includes('/change-password') &&
            !req.path.includes('/me') &&
            !req.path.includes('/logout')) {
            res.status(403).json({
                success: false,
                mustChangePassword: true,
                message: 'Password change required before accessing other dashboard resources.'
            });
            return;
        }
        next();
    }
    catch (error) {
        res.status(401).json({ success: false, message: 'Session expired or token invalid.' });
    }
};
exports.authenticate = authenticate;
const requireRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required.' });
            return;
        }
        const normalizedUserRole = (req.user.role || '').toUpperCase();
        const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
        if (!normalizedAllowed.includes(normalizedUserRole)) {
            res.status(403).json({
                success: false,
                message: `Forbidden: Access requires ${allowedRoles.join(' or ')} privileges.`
            });
            return;
        }
        next();
    };
};
exports.requireRoles = requireRoles;
// Aliases for compatibility
exports.authenticateJWT = exports.authenticate;
