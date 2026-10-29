export type DashboardRole = 'student' | 'mentor' | 'admin';
export type TeamStatus = 'ON_TRACK' | 'NEEDS_ATTENTION' | 'DELAYED' | 'COMPLETED';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'NEEDS_IMPROVEMENT';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: DashboardRole;
  status: 'active' | 'inactive';
  avatar?: string;
}

export interface MockMentor {
  id: string;
  userId: string;
  department: string;
  expertise: string[];
  teamIds: string[];
}

export interface MockStudent {
  id: string;
  userId: string;
  teamId: string;
  year: string;
}

export interface MockTeam {
  id: string;
  name: string;
  leaderId: string;
  memberIds: string[];
  mentorId: string | null;
  projectId: string;
  status: TeamStatus;
}

export interface MockProject {
  id: string;
  title: string;
  description: string;
  repoUrl: string;
  status: TeamStatus;
  deadline: string;
  progress: number;
}

export interface MockMilestone {
  id: string;
  projectId: string;
  title: string;
  status: 'completed' | 'in_progress' | 'pending';
  dueDate: string;
}

export interface MockWeeklySubmission {
  id: string;
  teamId: string;
  week: number;
  date: string;
  workCompleted: string;
  repoUrl: string;
  demoAttachment?: string;
  status: ReviewStatus;
  feedback?: string;
}

export interface MockMeeting {
  id: string;
  teamId: string;
  title: string;
  date: string;
  time: string;
  linkOrLocation: string;
  notes?: string;
  status: 'upcoming' | 'completed';
}

export interface MockAnnouncement {
  id: string;
  authorId: string;
  title: string;
  text: string;
  publishedAt: string;
  audience: 'All users' | 'Mentors' | 'Students';
}

export interface MockActivityEvent {
  id: string;
  type: 'submission' | 'meeting' | 'team' | 'announcement' | 'user';
  text: string;
  timestamp: string;
}

export interface MockDashboardState {
  users: MockUser[];
  mentors: MockMentor[];
  students: MockStudent[];
  teams: MockTeam[];
  projects: MockProject[];
  milestones: MockMilestone[];
  weeklySubmissions: MockWeeklySubmission[];
  meetings: MockMeeting[];
  announcements: MockAnnouncement[];
  activityEvents: MockActivityEvent[];
  settings: {
    showNotifications: boolean;
  };
}

const studentNames = [
  'Vijay Kumar', 'Arun Raj', 'Saran K', 'Rahul M',
  'Meera Das', 'Nikhil Shah', 'Aditi Rao', 'Kavin P',
  'Isha Menon', 'Dev Patel', 'Riya Bose', 'Aman Joseph',
  'Priya Nair', 'Harish V', 'Sara Mathew', 'Mohan S'
];

const studentUsers: MockUser[] = studentNames.map((name, index) => ({
  id: `user-student-${index + 1}`,
  name,
  email: `${name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
  role: 'student',
  status: index === 14 ? 'inactive' : 'active'
}));

export const initialMockDashboardState: MockDashboardState = {
  users: [
    { id: 'user-mentor-vetri', name: 'Vetri', email: 'vetri@gmail.com', role: 'mentor', status: 'active' },
    { id: 'user-mentor-anika', name: 'Anika Rao', email: 'anika@gmail.com', role: 'mentor', status: 'active' },
    { id: 'user-admin', name: 'Admin', email: 'admin@gmail.com', role: 'admin', status: 'active' },
    { id: 'user-inactive', name: 'Former Mentor', email: 'former@gmail.com', role: 'mentor', status: 'inactive' },
    ...studentUsers
  ],
  mentors: [
    { id: 'mentor-vetri', userId: 'user-mentor-vetri', department: 'Computer Science', expertise: ['React', 'Node.js', 'Product Design'], teamIds: ['team-codecrew', 'team-techtitans', 'team-bytebuilders', 'team-pixelpioneers'] },
    { id: 'mentor-anika', userId: 'user-mentor-anika', department: 'Data Science', expertise: ['Python', 'Data Science'], teamIds: [] },
    { id: 'mentor-former', userId: 'user-inactive', department: 'Engineering', expertise: ['Java'], teamIds: [] }
  ],
  students: studentUsers.map((user, index) => ({
    id: `student-${index + 1}`,
    userId: user.id,
    teamId: `team-${['codecrew', 'techtitans', 'bytebuilders', 'pixelpioneers'][Math.floor(index / 4)]}`,
    year: index < 8 ? '2nd Year' : '3rd Year'
  })),
  teams: [
    { id: 'team-codecrew', name: 'CodeCrew', leaderId: 'user-student-1', memberIds: ['user-student-1', 'user-student-2', 'user-student-3', 'user-student-4'], mentorId: 'mentor-vetri', projectId: 'project-attendance', status: 'NEEDS_ATTENTION' },
    { id: 'team-techtitans', name: 'TechTitans', leaderId: 'user-student-5', memberIds: ['user-student-5', 'user-student-6', 'user-student-7', 'user-student-8'], mentorId: 'mentor-vetri', projectId: 'project-campus', status: 'ON_TRACK' },
    { id: 'team-bytebuilders', name: 'ByteBuilders', leaderId: 'user-student-9', memberIds: ['user-student-9', 'user-student-10', 'user-student-11', 'user-student-12'], mentorId: 'mentor-vetri', projectId: 'project-library', status: 'ON_TRACK' },
    { id: 'team-pixelpioneers', name: 'Pixel Pioneers', leaderId: 'user-student-13', memberIds: ['user-student-13', 'user-student-14', 'user-student-15', 'user-student-16'], mentorId: 'mentor-vetri', projectId: 'project-wellness', status: 'DELAYED' },
    { id: 'team-cloudnine', name: 'CloudNine', leaderId: '', memberIds: [], mentorId: null, projectId: 'project-cloud', status: 'ON_TRACK' }
  ],
  projects: [
    { id: 'project-attendance', title: 'Attendance System', description: 'QR-based attendance tracking for classrooms.', repoUrl: 'https://example.com/codecrew', status: 'NEEDS_ATTENTION', deadline: '2026-11-02', progress: 45 },
    { id: 'project-campus', title: 'Campus Connect', description: 'A single place for campus events and clubs.', repoUrl: 'https://example.com/techtitans', status: 'ON_TRACK', deadline: '2026-11-12', progress: 30 },
    { id: 'project-library', title: 'Library Manager', description: 'Simpler borrowing and inventory workflows.', repoUrl: 'https://example.com/bytebuilders', status: 'ON_TRACK', deadline: '2026-10-30', progress: 60 },
    { id: 'project-wellness', title: 'Student Wellness', description: 'Private check-ins and campus support discovery.', repoUrl: 'https://example.com/pixelpioneers', status: 'DELAYED', deadline: '2026-10-25', progress: 20 },
    { id: 'project-cloud', title: 'Cloud Resource Planner', description: 'A planning tool for student lab resources.', repoUrl: 'https://example.com/cloudnine', status: 'ON_TRACK', deadline: '2026-12-01', progress: 10 }
  ],
  milestones: [
    { id: 'milestone-attendance-1', projectId: 'project-attendance', title: 'Prototype review', status: 'completed', dueDate: '2026-10-12' },
    { id: 'milestone-attendance-2', projectId: 'project-attendance', title: 'Pilot testing', status: 'in_progress', dueDate: '2026-10-28' },
    { id: 'milestone-campus-1', projectId: 'project-campus', title: 'User interviews', status: 'in_progress', dueDate: '2026-10-30' },
    { id: 'milestone-library-1', projectId: 'project-library', title: 'Search experience', status: 'completed', dueDate: '2026-10-18' }
  ],
  weeklySubmissions: [
    { id: 'submission-1', teamId: 'team-codecrew', week: 6, date: '2026-10-20', workCompleted: 'Connected QR scanner and attendance export.', repoUrl: 'https://example.com/codecrew', demoAttachment: 'attendance-demo.mp4', status: 'PENDING' },
    { id: 'submission-2', teamId: 'team-techtitans', week: 6, date: '2026-10-21', workCompleted: 'Completed event listing and search.', repoUrl: 'https://example.com/techtitans', status: 'PENDING' },
    { id: 'submission-3', teamId: 'team-bytebuilders', week: 6, date: '2026-10-22', workCompleted: 'Added borrowing history and role permissions.', repoUrl: 'https://example.com/bytebuilders', status: 'PENDING' },
    { id: 'submission-4', teamId: 'team-pixelpioneers', week: 5, date: '2026-10-10', workCompleted: 'Outlined wellness check-in flow.', repoUrl: 'https://example.com/pixelpioneers', status: 'PENDING' }
  ],
  meetings: [
    { id: 'meeting-1', teamId: 'team-codecrew', title: 'Weekly review: CodeCrew', date: '2026-10-27', time: '10:00 AM', linkOrLocation: 'Google Meet link in calendar', status: 'upcoming' },
    { id: 'meeting-2', teamId: 'team-bytebuilders', title: 'Design critique: ByteBuilders', date: '2026-10-29', time: '2:30 PM', linkOrLocation: 'Innovation Lab 2', status: 'upcoming' }
  ],
  announcements: [
    { id: 'announcement-1', authorId: 'user-admin', title: 'Mid-semester review week', text: 'Please keep project milestones and repository links current.', publishedAt: '2026-10-22', audience: 'All users' },
    { id: 'announcement-2', authorId: 'user-mentor-vetri', title: 'Review checklist updated', text: 'Use the new demo and accessibility checklist for weekly submissions.', publishedAt: '2026-10-20', audience: 'Mentors' },
    { id: 'announcement-3', authorId: 'user-admin', title: 'Lab maintenance', text: 'The project lab will be unavailable Friday from 4 PM.', publishedAt: '2026-10-18', audience: 'All users' }
  ],
  activityEvents: [
    { id: 'event-1', type: 'submission', text: 'ByteBuilders submitted week 6 progress.', timestamp: '2026-10-22T11:30:00' },
    { id: 'event-2', type: 'submission', text: 'TechTitans submitted week 6 progress.', timestamp: '2026-10-21T15:10:00' },
    { id: 'event-3', type: 'meeting', text: 'CodeCrew review scheduled for Oct 27.', timestamp: '2026-10-21T10:00:00' },
    { id: 'event-4', type: 'announcement', text: 'Admin published mid-semester review guidance.', timestamp: '2026-10-22T09:00:00' },
    { id: 'event-5', type: 'team', text: 'CloudNine was created without a mentor.', timestamp: '2026-10-19T14:00:00' },
    { id: 'event-6', type: 'user', text: 'Anika Rao joined the mentor directory.', timestamp: '2026-10-18T12:00:00' },
    { id: 'event-7', type: 'submission', text: 'Pixel Pioneers missed the week 5 review window.', timestamp: '2026-10-17T09:30:00' },
    { id: 'event-8', type: 'meeting', text: 'Library Manager design critique completed.', timestamp: '2026-10-16T16:00:00' },
    { id: 'event-9', type: 'team', text: 'CodeCrew moved to pilot testing.', timestamp: '2026-10-15T13:20:00' },
    { id: 'event-10', type: 'announcement', text: 'Lab maintenance notice was published.', timestamp: '2026-10-18T08:00:00' }
    ,{ id: 'event-11', type: 'user', text: 'A new student registered for ProjectMentor.', timestamp: '2026-10-14T10:00:00' }
    ,{ id: 'event-12', type: 'team', text: 'Vetri was assigned to CodeCrew.', timestamp: '2026-10-14T11:00:00' }
    ,{ id: 'event-13', type: 'submission', text: 'CodeCrew submitted weekly progress.', timestamp: '2026-10-14T12:00:00' }
    ,{ id: 'event-14', type: 'announcement', text: 'Announcement published: Review checklist updated.', timestamp: '2026-10-14T13:00:00' }
    ,{ id: 'event-15', type: 'team', text: 'A new project team was created.', timestamp: '2026-10-14T14:00:00' }
  ],
  settings: {
    showNotifications: true
  }
};