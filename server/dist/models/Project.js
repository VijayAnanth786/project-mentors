"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
const mongoose_1 = require("mongoose");
const milestoneSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    status: { type: String, enum: ['Completed', 'In Progress', 'Pending'], default: 'Pending' },
    targetDate: { type: Date }
});
const projectSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    techStack: [{ type: String }],
    teamId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team', required: true },
    githubUrl: { type: String, default: '' },
    currentPhase: { type: String, default: 'Development' },
    deadline: { type: Date, required: true },
    lastUpdateDate: { type: Date, default: Date.now },
    progressPercentage: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['ON_TRACK', 'NEEDS_ATTENTION', 'DELAYED', 'COMPLETED'],
        default: 'ON_TRACK'
    },
    hasPendingReview: { type: Boolean, default: false },
    milestones: [milestoneSchema],
    createdAt: { type: Date, default: Date.now }
});
exports.Project = (0, mongoose_1.model)('Project', projectSchema);
