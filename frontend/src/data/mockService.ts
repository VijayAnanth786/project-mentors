import { MockActivityEvent, MockAnnouncement, MockDashboardState, MockMeeting, MockMentor, MockWeeklySubmission, MockUser } from './mockData';

export interface MockService {
  getTeams: (state: MockDashboardState) => MockDashboardState['teams'];
  assignMentor: (state: MockDashboardState, teamId: string, mentorId: string | null) => MockDashboardState;
  addMentor: (state: MockDashboardState, mentor: { name: string; email: string; department: string }) => MockDashboardState;
  setUserStatus: (state: MockDashboardState, userId: string, status: MockUser['status']) => MockDashboardState;
  submitReview: (state: MockDashboardState, submissionId: string, status: MockWeeklySubmission['status'], feedback: string) => MockDashboardState;
  scheduleMeeting: (state: MockDashboardState, meeting: MockMeeting) => MockDashboardState;
  publishAnnouncement: (state: MockDashboardState, announcement: MockAnnouncement) => MockDashboardState;
  updateUser: (state: MockDashboardState, userId: string, patch: Partial<Pick<MockUser, 'name' | 'email'>>) => MockDashboardState;
  updateMentor: (state: MockDashboardState, mentorId: string, patch: { department?: string; name?: string; email?: string }) => MockDashboardState;
  updateSetting: (state: MockDashboardState, key: 'showNotifications', value: boolean) => MockDashboardState;
}

export const mockService: MockService = {
  getTeams: (state) => state.teams,
  assignMentor: (state, teamId, mentorId) => {
    const team = state.teams.find((item) => item.id === teamId);
    const mentor = state.mentors.find((item) => item.id === mentorId);
    return {
      ...state,
      teams: state.teams.map((item) => item.id === teamId ? { ...item, mentorId } : item),
      mentors: state.mentors.map((item) => ({ ...item, teamIds: item.id === mentorId ? [...new Set([...item.teamIds, teamId])] : item.teamIds.filter((id) => id !== teamId) })),
      activityEvents: team && mentor ? [{ id: `event-assignment-${Date.now()}`, type: 'team', text: `${team.name} was assigned to ${state.users.find((user) => user.id === mentor.userId)?.name || 'a mentor'}.`, timestamp: new Date().toISOString() }, ...state.activityEvents] : state.activityEvents
    };
  },
  addMentor: (state, mentorData) => {
    const stamp = Date.now();
    const userId = `user-mentor-${stamp}`;
    const mentorId = `mentor-${stamp}`;
    return {
      ...state,
      mentors: [...state.mentors, { id: mentorId, userId, department: mentorData.department, expertise: [], teamIds: [] }],
      users: [...state.users, { id: userId, name: mentorData.name, email: mentorData.email, role: 'mentor', status: 'active' }],
      activityEvents: [{ id: `event-mentor-${stamp}`, type: 'user', text: `${mentorData.name} was added as a mentor.`, timestamp: new Date().toISOString() }, ...state.activityEvents]
    };
  },
  setUserStatus: (state, userId, status) => ({ ...state, users: state.users.map((user) => user.id === userId ? { ...user, status } : user) }),
  submitReview: (state, submissionId, status, feedback) => {
    const submission = state.weeklySubmissions.find((item) => item.id === submissionId);
    const team = state.teams.find((item) => item.id === submission?.teamId);
    return {
      ...state,
      weeklySubmissions: state.weeklySubmissions.map((item) => item.id === submissionId ? { ...item, status, feedback } : item),
      activityEvents: submission && team ? [{ id: `event-review-${Date.now()}`, type: 'submission', text: `${team.name} review marked ${status.toLowerCase().replace(/_/g, ' ')}.`, timestamp: new Date().toISOString() } as MockActivityEvent, ...state.activityEvents] : state.activityEvents
    };
  },
  scheduleMeeting: (state, meeting) => ({ ...state, meetings: [...state.meetings, meeting], activityEvents: [{ id: `event-meeting-${Date.now()}`, type: 'meeting', text: `${meeting.title} was scheduled.`, timestamp: new Date().toISOString() }, ...state.activityEvents] }),
  publishAnnouncement: (state, announcement) => ({ ...state, announcements: [announcement, ...state.announcements], activityEvents: [{ id: `event-announcement-${Date.now()}`, type: 'announcement', text: `Announcement published: ${announcement.title}.`, timestamp: new Date().toISOString() }, ...state.activityEvents] }),
  updateUser: (state, userId, patch) => ({ ...state, users: state.users.map((user) => user.id === userId ? { ...user, ...patch } : user) }),
  updateMentor: (state, mentorId, patch) => {
    const mentor = state.mentors.find((item) => item.id === mentorId);
    return mentor ? {
      ...state,
      mentors: state.mentors.map((item) => item.id === mentorId ? { ...item, department: patch.department || item.department } : item),
      users: state.users.map((user) => user.id === mentor.userId ? { ...user, ...(patch.name ? { name: patch.name } : {}), ...(patch.email ? { email: patch.email } : {}) } : user)
    } : state;
  },
  updateSetting: (state, key, value) => ({ ...state, settings: { ...state.settings, [key]: value } })
};