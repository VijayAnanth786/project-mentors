"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTeamRisk = calculateTeamRisk;
/**
 * Deterministic Heuristic Engine
 * Rule-based logic executes first before any AI explanation.
 */
function calculateTeamRisk(metrics) {
    const flags = [];
    let score = 0;
    if (metrics.progressPercentage >= 100) {
        return {
            status: 'COMPLETED',
            riskLevel: 'LOW',
            flags: ['All milestones completed'],
            calculatedScore: 0
        };
    }
    // Factor 1: Cadence Stagnation
    if (metrics.daysSinceLastUpdate > 10) {
        score += 35;
        flags.push(`Inactivity: No updates recorded for ${metrics.daysSinceLastUpdate} days`);
    }
    else if (metrics.daysSinceLastUpdate > 7) {
        score += 15;
        flags.push(`Cadence warning: ${metrics.daysSinceLastUpdate} days since last update`);
    }
    // Factor 2: Impending Deadline vs. Low Completion
    if (metrics.daysUntilDeadline <= 10 && metrics.progressPercentage < 50) {
        score += 40;
        flags.push(`Deadline breach risk: ${metrics.daysUntilDeadline} days left with only ${metrics.progressPercentage}% complete`);
    }
    else if (metrics.daysUntilDeadline <= 14 && metrics.progressPercentage < 70) {
        score += 20;
        flags.push(`Tight delivery window: ${metrics.daysUntilDeadline} days remaining`);
    }
    // Factor 3: Developer Activity (GitHub commits)
    if (metrics.githubCommitsThisWeek === 0) {
        score += 15;
        flags.push('Low VCS activity: 0 commits detected this week');
    }
    // Factor 4: Review Bottleneck
    if (metrics.hasPendingReview && metrics.daysSinceLastUpdate > 3) {
        score += 10;
        flags.push('Review backlog: Pending mentor evaluation');
    }
    let status = 'ON_TRACK';
    let riskLevel = 'LOW';
    if (score >= 50) {
        status = 'DELAYED';
        riskLevel = 'HIGH';
    }
    else if (score >= 25) {
        status = 'NEEDS_ATTENTION';
        riskLevel = 'MEDIUM';
    }
    return {
        status,
        riskLevel,
        flags,
        calculatedScore: Math.min(score, 100)
    };
}
