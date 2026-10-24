"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    passwordHash: {
        type: String,
        required: [true, 'Password hash is required'],
        select: false // Excluded from normal queries and API responses
    },
    role: {
        type: String,
        enum: {
            values: ['STUDENT', 'MENTOR', 'ADMIN'],
            message: '{VALUE} is not a valid role'
        },
        required: true
    },
    status: {
        type: String,
        enum: {
            values: ['ACTIVE', 'BLOCKED'],
            message: '{VALUE} is not a valid status'
        },
        default: 'ACTIVE'
    },
    department: {
        type: String,
        trim: true
    },
    year: {
        type: String,
        trim: true
    },
    college: {
        type: String,
        trim: true
    },
    avatar: {
        type: String
    },
    mustChangePassword: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: {
        transform: (_, ret) => {
            delete ret.passwordHash;
            delete ret.__v;
            ret.id = ret._id ? ret._id.toString() : ret.id;
            return ret;
        }
    }
});
// Method to verify passwords securely
userSchema.methods.comparePassword = async function (candidate) {
    return bcryptjs_1.default.compare(candidate, this.passwordHash);
};
exports.User = (0, mongoose_1.model)('User', userSchema);
