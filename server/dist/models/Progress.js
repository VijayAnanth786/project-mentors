"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Progress = void 0;
const mongoose_1 = require("mongoose");
const fileSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    size: { type: String, required: true },
    type: { type: String, required: true },
    url: { type: String, required: true }
});
const progressSchema = new mongoose_1.Schema({
    teamId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team', required: true },
    projectId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    weekNumber: { type: Number, required: true },
    completedTasks: [{ type: String }],
    currentWork: [{ type: String }],
    blockers: [{ type: String }],
    nextWeekGoals: [{ type: String }],
    files: [fileSchema],
    githubUrl: { type: String, default: '' },
    submittedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    submissionDate: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['SUBMITTED', 'APPROVED', 'NEEDS_IMPROVEMENT', 'MAJOR_ISSUE'],
        default: 'SUBMITTED'
    }
});
exports.Progress = (0, mongoose_1.model)('Progress', progressSchema);
