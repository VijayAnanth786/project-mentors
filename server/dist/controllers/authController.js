"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email and password are required' });
            return;
        }
        // Attempt DB find or fallback demo accounts
        let user = await User_1.User.findOne({ email: email.toLowerCase() });
        // Seed/demo fallback if not found in db
        if (!user) {
            if (email.includes('kumar') || email.includes('mentor')) {
                user = {
                    _id: '670000000000000000000001',
                    name: 'Dr. R. Kumar',
                    email: 'kumar@college.edu',
                    role: 'mentor',
                    department: 'Computer Science'
                };
            }
            else if (email.includes('admin')) {
                user = {
                    _id: '670000000000000000000002',
                    name: 'Prof. S. Narayanan (Admin)',
                    email: 'admin@college.edu',
                    role: 'admin',
                    department: 'Academic Affairs'
                };
            }
            else {
                user = {
                    _id: '670000000000000000000003',
                    name: 'Vijay Ananth R S',
                    email: 'vijay@college.edu',
                    role: 'student',
                    department: 'Computer Science'
                };
            }
        }
        const token = jsonwebtoken_1.default.sign({
            id: user._id.toString(),
            name: user.name,
            role: user.role,
            department: user.department
        }, process.env.JWT_SECRET || 'dev_secret_jwt_key_123', { expiresIn: '7d' });
        res.json({
            success: true,
            token,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.login = login;
