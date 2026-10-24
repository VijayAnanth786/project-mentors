import { GoogleGenerativeAI } from '@google/generative-ai';
import { DeterministicRiskAssessment, TeamMetricInput } from './riskService';

// Keep the Gemini API Key strictly server-side
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface GeminiSummaryOutput {
  executiveSummary: string;
  strengths: string[];
  concerns: string[];
  mentorActionRecommendation: string;
  source: 'gemini' | 'rule_fallback';
}

/**
 * Orchestrates Gemini prompt execution with automatic deterministic fallback.
 * Rule-based logic has already executed and is passed in as ground truth.
 */
export async function generateProjectSummaryExplanation(
  teamName: string,
  projectName: string,
  metrics: TeamMetricInput,
  risk: DeterministicRiskAssessment,
  recentSubmissions: Array<{ week: number; completed: string; problems: string }> = []
): Promise<GeminiSummaryOutput> {
  const fallbackSummary: GeminiSummaryOutput = {
    executiveSummary: `Team ${teamName} (${projectName}) is currently ${risk.status.replace('_', ' ')} with a calculated risk score of ${risk.calculatedScore}/100. Progress stands at ${metrics.progressPercentage}%.`,
    strengths: metrics.githubCommitsThisWeek > 5 
      ? ['Consistent GitHub commit activity recorded this week'] 
      : ['Project baseline established'],
    concerns: risk.flags.length > 0 ? risk.flags : ['No critical blockers detected'],
    mentorActionRecommendation: risk.riskLevel === 'HIGH' 
      ? 'Urgent: Schedule a direct 15-minute sync with the team leader to unblock milestones.' 
      : 'Maintain standard weekly asynchronous review cadence.',
    source: 'rule_fallback'
  };

  if (!process.env.GEMINI_API_KEY) {
    return fallbackSummary;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const prompt = `System: You are an academic project mentor advisor.
You are given deterministic rule-based calculation results for a student software project.
You do NOT calculate status or risk levels. The status and risk level provided are final ground truth.
Your task is ONLY to synthesize, summarize, and provide an empathetic, constructive explanation and actionable advice for the mentor.
Output strictly valid JSON with keys: "executiveSummary" (string), "strengths" (array of strings), "concerns" (array of strings), "mentorActionRecommendation" (string).

Input Data:
${JSON.stringify({ team: teamName, project: projectName, metrics, deterministicRisk: risk, recentSubmissions }, null, 2)}`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    if (!rawText) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(rawText) as Omit<GeminiSummaryOutput, 'source'>;
    return {
      executiveSummary: parsed.executiveSummary || fallbackSummary.executiveSummary,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : fallbackSummary.strengths,
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : fallbackSummary.concerns,
      mentorActionRecommendation: parsed.mentorActionRecommendation || fallbackSummary.mentorActionRecommendation,
      source: 'gemini'
    };
  } catch (error) {
    console.warn('[GeminiService] Gemini orchestration failed; engaging graceful fallback:', error);
    return fallbackSummary;
  }
}

export const generateProjectSummary = generateProjectSummaryExplanation;
