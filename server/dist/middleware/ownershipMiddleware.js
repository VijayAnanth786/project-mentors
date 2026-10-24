"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMentorTeamOwnership = exports.verifyTeamLeaderOwnership = void 0;
const Team_1 = require("../models/Team");
// Layer 3: Resource Ownership Enforcement
const verifyTeamLeaderOwnership = async (req, res, next) => {
    try {
        const { teamId } = req.body;
        const userId = req.user?.id;
        if (!teamId || !userId) {
            res.status(400).json({ success: false, message: 'Missing team identifier or user context' });
            return;
        }
        const team = await Team_1.Team.findById(teamId);
        if (!team) {
            res.status(404).json({ success: false, message: 'Target team not found' });
            return;
        }
        // Strict ownership verification: only designated Team Leader can submit official progress
        if (team.leaderId.toString() !== userId) {
            res.status(403).json({
                success: false,
                message: 'Forbidden: Only the assigned Team Leader may submit weekly progress reports'
            });
            return;
        }
        next();
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal ownership verification error' });
    }
};
exports.verifyTeamLeaderOwnership = verifyTeamLeaderOwnership;
const verifyMentorTeamOwnership = async (req, res, next) => {
    try {
        const teamId = req.params.teamId || req.body.teamId;
        const mentorId = req.user?.id;
        if (req.user?.role === 'admin') {
            return next(); // Admins bypass mentor-specific team ownership
        }
        const team = await Team_1.Team.findById(teamId);
        if (!team) {
            res.status(404).json({ success: false, message: 'Team not found' });
            return;
        }
        if (team.mentorId.toString() !== mentorId) {
            res.status(403).json({
                success: false,
                message: 'Forbidden: You are not the assigned mentor for this team'
            });
            return;
        }
        next();
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Mentor ownership verification failed' });
    }
};
exports.verifyMentorTeamOwnership = verifyMentorTeamOwnership;
