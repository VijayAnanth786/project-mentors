"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.changePassword = exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const database_1 = require("../db/database");
const register = async (req, res) => {
    try {
        const { name, email, password, department, year, college } = req.body;
        // Strict input validation
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            res.status(400).json({ success: false, message: 'Name is required (at least 2 characters).' });
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
            res.status(400).json({ success: false, message: 'Please provide a valid institutional email address.' });
            return;
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
            res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
            return;
        }
        const normalizedEmail = email.trim().toLowerCase();
        // Check if MongoDB Atlas is connected
        const isMongoReady = mongoose_1.default.connection.readyState === 1;
        if (isMongoReady) {
            const existing = await User_1.User.findOne({ email: normalizedEmail });
            if (existing) {
                res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
                return;
            }
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash(password, salt);
            const newUser = await User_1.User.create({
                name: name.trim(),
                email: normalizedEmail,
                passwordHash,
                role: 'STUDENT',
                status: 'ACTIVE',
                department: department?.trim() || 'Computer Science',
                year: year?.trim() || '1st Year',
                college: college?.trim() || 'College of Engineering & Technology',
                avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80`,
                mustChangePassword: false
            });
            const userObj = newUser.toJSON();
            res.status(201).json({
                success: true,
                message: 'Student account registered successfully. Please sign in.',
                user: userObj
            });
            return;
        }
        // Seamless Local Fallback when Atlas connection is pending whitelist
        const existingLocal = database_1.db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
        if (existingLocal) {
            res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const newId = `usr_s_${Date.now()}`;
        database_1.db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, status, avatar)
      VALUES (?, ?, ?, ?, 'student', 'active', ?)
    `).run(newId, name.trim(), normalizedEmail, passwordHash, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80');
        try {
            database_1.db.prepare(`
        INSERT INTO student_profiles (id, user_id, department, year_cohort)
        VALUES (?, ?, ?, ?)
      `).run(`sp_${Date.now()}`, newId, department?.trim() || 'Computer Science', year?.trim() || '1st Year');
        }
        catch { }
        res.status(201).json({
            success: true,
            message: 'Student account registered successfully. Please sign in.',
            user: {
                id: newId,
                name: name.trim(),
                email: normalizedEmail,
                role: 'student',
                status: 'active',
                department: department?.trim() || 'Computer Science',
                year: year?.trim() || '1st Year',
                mustChangePassword: false
            }
        });
    }
    catch (error) {
        if (error.code === 11000) {
            res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
            return;
        }
        console.error('[Registration Error]', error);
        res.status(500).json({ success: false, message: error.message || 'Registration failed' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email and password are required.' });
            return;
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        const isMongoReady = mongoose_1.default.connection.readyState === 1;
        let userObj = null;
        let passwordHash = null;
        let mustChangePassword = false;
        // 1. Try MongoDB Atlas if connected
        if (isMongoReady) {
            const userDoc = await User_1.User.findOne({ email: normalizedEmail }).select('+passwordHash');
            if (userDoc) {
                if (userDoc.status === 'BLOCKED') {
                    res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact an administrator.' });
                    return;
                }
                const isMatch = await userDoc.comparePassword(String(password));
                if (!isMatch) {
                    res.status(401).json({ success: false, message: 'Invalid email or password.' });
                    return;
                }
                userObj = {
                    id: userDoc._id.toString(),
                    name: userDoc.name,
                    email: userDoc.email,
                    role: userDoc.role.toLowerCase(),
                    department: userDoc.department,
                    avatar: userDoc.avatar
                };
                mustChangePassword = userDoc.mustChangePassword;
            }
        }
        // 2. Try Local Fallback Store
        if (!userObj) {
            const row = database_1.db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
            if (row) {
                if (row.status === 'inactive' || row.status === 'blocked') {
                    res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact an administrator.' });
                    return;
                }
                const isMatch = await bcryptjs_1.default.compare(String(password), row.password_hash);
                if (!isMatch) {
                    res.status(401).json({ success: false, message: 'Invalid email or password.' });
                    return;
                }
                userObj = {
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    role: row.role.toLowerCase(),
                    department: 'Computer Science',
                    avatar: row.avatar
                };
                mustChangePassword = false;
            }
        }
        if (!userObj) {
            res.status(401).json({ success: false, message: 'Invalid email or password.' });
            return;
        }
        const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_replace_in_production';
        const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
        const token = jsonwebtoken_1.default.sign({
            id: userObj.id,
            name: userObj.name,
            email: userObj.email,
            role: userObj.role,
            department: userObj.department
        }, secret, { expiresIn: expiresIn || '7d' });
        const redirectUrl = userObj.role === 'admin'
            ? '/admin/dashboard'
            : userObj.role === 'mentor'
                ? '/mentor/dashboard'
                : '/student/dashboard';
        res.json({
            success: true,
            token,
            redirectUrl,
            mustChangePassword,
            user: userObj
        });
    }
    catch (error) {
        console.error('[Login Error]', error);
        res.status(500).json({ success: false, message: 'Internal server authentication error.' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authenticated.' });
            return;
        }
        const isMongoReady = mongoose_1.default.connection.readyState === 1;
        if (isMongoReady) {
            const user = await User_1.User.findById(req.user.id);
            if (user) {
                if (user.status === 'BLOCKED') {
                    res.status(403).json({ success: false, message: 'Account is blocked.' });
                    return;
                }
                res.json({
                    success: true,
                    user: {
                        ...user.toJSON(),
                        role: user.role.toLowerCase()
                    }
                });
                return;
            }
        }
        // Local fallback
        const row = database_1.db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (row) {
            res.json({
                success: true,
                user: {
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    role: row.role.toLowerCase(),
                    department: req.user.department || 'Computer Science',
                    avatar: row.avatar
                }
            });
            return;
        }
        res.json({
            success: true,
            user: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role.toLowerCase(),
                department: req.user.department
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMe = getMe;
const changePassword = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ success: false, message: 'Current password and new password are required.' });
            return;
        }
        if (newPassword.length < 6) {
            res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
            return;
        }
        const user = await User_1.User.findById(userId).select('+passwordHash');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found.' });
            return;
        }
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            res.status(400).json({ success: false, message: 'Current password is incorrect.' });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        user.passwordHash = await bcryptjs_1.default.hash(newPassword, salt);
        user.mustChangePassword = false;
        await user.save();
        res.json({
            success: true,
            message: 'Password updated successfully. You now have full access to your dashboard.'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.changePassword = changePassword;
const logout = async (req, res) => {
    res.json({ success: true, message: 'Logged out successfully.' });
};
exports.logout = logout;
