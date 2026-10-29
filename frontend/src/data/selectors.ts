import { MockDashboardState } from './mockData';

export const pendingReviewCount = (state: MockDashboardState) => state.weeklySubmissions.filter((submission) => submission.status === 'PENDING').length;
export const pendingReviewCountForTeams = (state: MockDashboardState, teamIds: string[]) => state.weeklySubmissions.filter((submission) => teamIds.includes(submission.teamId) && submission.status === 'PENDING').length;
export const overdueSubmissionCount = (state: MockDashboardState) => state.weeklySubmissions.filter((submission) => submission.status === 'PENDING' && new Date(submission.date) < new Date('2026-10-23')).length;
export const overdueSubmissionCountForTeams = (state: MockDashboardState, teamIds: string[]) => state.weeklySubmissions.filter((submission) => teamIds.includes(submission.teamId) && submission.status === 'PENDING' && new Date(submission.date) < new Date('2026-10-23')).length;
export const teamsWithoutMentors = (state: MockDashboardState) => state.teams.filter((team) => !team.mentorId);
export const mentorWorkload = (state: MockDashboardState) => state.mentors.map((mentor) => ({ mentor, user: state.users.find((user) => user.id === mentor.userId), teamCount: mentor.teamIds.length }));
export const upcomingMeetingCount = (state: MockDashboardState) => state.meetings.filter((meeting) => meeting.status === 'upcoming').length;
export const upcomingMeetingCountForTeams = (state: MockDashboardState, teamIds: string[]) => state.meetings.filter((meeting) => teamIds.includes(meeting.teamId) && meeting.status === 'upcoming').length;
export const activeUserCount = (state: MockDashboardState) => state.users.filter((user) => user.status === 'active').length;
export const averageProgress = (state: MockDashboardState) => state.projects.length ? Math.round(state.projects.reduce((total, project) => total + project.progress, 0) / state.projects.length) : 0;
export const totalStudents = (state: MockDashboardState) => state.students.length;
export const activeTeamCount = (state: MockDashboardState) => state.teams.filter((team) => team.status !== 'COMPLETED').length;
export const mentorsWithoutTeams = (state: MockDashboardState) => state.mentors.filter((mentor) => mentor.teamIds.length === 0);
export const overdueTeams = (state: MockDashboardState) => state.teams.filter((team) => state.weeklySubmissions.some((submission) => submission.teamId === team.id && submission.status === 'PENDING' && new Date(submission.date) < new Date('2026-10-23')));