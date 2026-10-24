"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamRiskAndSummary = exports.createTeam = exports.getTeams = void 0;
const Team_1 = require("../models/Team");
const riskService_1 = require("../services/riskService");
const geminiService_1 = require("../services/geminiService");
const getTeams = async (req, res) => {
    try {
        const { cohort } = req.query;
        const filter = {};
        if (cohort)
            filter.yearCohort = cohort;
        // Layer 2 & 3: Mentors only get their teams unless Admin
        if (req.user?.role === 'mentor') {
            filter.mentorId = req.user.id;
        }
        const teams = await Team_1.Team.find(filter)
            .populate('leaderId', 'name email avatar')
            .populate('memberIds', 'name email avatar')
            .populate('mentorId', 'name email');
        res.json({ success: true, count: teams.length, data: teams });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTeams = getTeams;
const createTeam = async (req, res) => {
    try {
        const { name, yearCohort, leaderId, memberIds, mentorId, department } = req.body;
        // Admins can assign any mentor; Mentors default to themselves
        const assignedMentorId = req.user?.role === 'mentor' ? req.user.id : mentorId;
        const team = await Team_1.Team.create({
            name,
            yearCohort,
            leaderId: leaderId || req.user?.id,
            memberIds: memberIds || [],
            mentorId: assignedMentorId,
            department: department || req.user?.department || 'Computer Science'
        });
        res.status(201).json({ success: true, data: team });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createTeam = createTeam;
const getTeamRiskAndSummary = async (req, res) => {
    try {
        const { teamId } = req.params;
        // Deterministic Heuristics calculated first
        const mockMetrics = {
            progressPercentage: 75,
            daysUntilDeadline: 4,
            daysSinceLastUpdate: 2,
            githubCommitsThisWeek: 14,
            hasPendingReview: true
        };
        const riskAssessment = (0, riskService_1.calculateTeamRisk)(mockMetrics);
        // Gemini generates explanation & summary with fallback
        const explanation = await (0, geminiService_1.generateProjectSummary)('Team 5', 'AI Resume Analyzer', mockMetrics, riskAssessment);
        res.json({
            success: true,
            data: {
                teamId,
                metrics: mockMetrics,
                risk: riskAssessment,
                aiExplanation: explanation
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTeamRiskAndSummary = getTeamRiskAndSummary;
