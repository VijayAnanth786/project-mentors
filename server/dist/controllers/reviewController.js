"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitMentorReview = void 0;
const Review_1 = require("../models/Review");
const Progress_1 = require("../models/Progress");
const Project_1 = require("../models/Project");
const submitMentorReview = async (req, res) => {
    try {
        const { progressId, teamId, status, feedback } = req.body;
        if (!progressId || !teamId || !status || !feedback) {
            res.status(400).json({ success: false, message: 'All review fields are required' });
            return;
        }
        const review = await Review_1.Review.create({
            progressId,
            teamId,
            mentorId: req.user?.id,
            status,
            feedback,
            reviewedAt: new Date()
        });
        // Update Progress and Project records
        await Progress_1.Progress.findByIdAndUpdate(progressId, {
            status: status === 'Approved' ? 'APPROVED' : status === 'Needs Improvement' ? 'NEEDS_IMPROVEMENT' : 'MAJOR_ISSUE'
        });
        await Project_1.Project.findOneAndUpdate({ teamId }, {
            hasPendingReview: false,
            status: status === 'Approved' ? 'ON_TRACK' : status === 'Needs Improvement' ? 'NEEDS_ATTENTION' : 'DELAYED'
        });
        res.status(201).json({
            success: true,
            message: 'Mentor review filed successfully',
            data: review
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.submitMentorReview = submitMentorReview;
