import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';

export interface ProgressSubmissionPayload {
  teamId: string;
  projectId: string;
  weekNumber: number;
  completedTasks: string;
  currentWork: string;
  blockers?: string;
  nextWeekGoals: string;
  githubUrl?: string;
  files?: Array<{ name: string; url: string; size: string; type: string }>;
}

export interface ProgressRecord extends ProgressSubmissionPayload {
  _id: string;
  submissionDate: string;
  status: 'SUBMITTED' | 'APPROVED' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUE';
  review?: {
    feedback: string;
    reviewedAt: string;
    mentorName: string;
  };
}

export function useProgressSubmission() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<ProgressRecord | null>(null);

  const submitWeeklyProgress = useCallback(async (payload: ProgressSubmissionPayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<{ success: boolean; data: ProgressRecord }>(
        '/progress/submit',
        payload
      );
      setLatestSubmission(response.data.data);
      return response.data.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit progress';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLatestProgress = useCallback(async (teamId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ success: boolean; data: ProgressRecord }>(
        `/progress/latest/${teamId}`
      );
      setLatestSubmission(response.data.data);
      return response.data.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to load progress';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    latestSubmission,
    submitWeeklyProgress,
    fetchLatestProgress
  };
}
