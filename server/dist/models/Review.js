"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Review = void 0;
const mongoose_1 = require("mongoose");
const reviewSchema = new mongoose_1.Schema({
    progressId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Progress', required: true },
    teamId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team', required: true },
    mentorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['Approved', 'Needs Improvement', 'Major Issue'],
        required: true
    },
    feedback: { type: String, required: true, maxlength: 500 },
    reviewedAt: { type: Date, default: Date.now }
});
exports.Review = (0, mongoose_1.model)('Review', reviewSchema);
