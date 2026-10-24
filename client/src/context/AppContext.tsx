import React, { createContext, useContext, useState, useEffect } from 'react';
import { Mentor, User, Project, ProgressSubmission, TeamCardData } from '../types';
import { initialMockDashboardState, MockAnnouncement, MockDashboardState, MockMeeting, MockWeeklySubmission } from '../data/mockData';
import { mockService } from '../data/mockService';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];
  mentors: Mentor[];
  createMentor: (mentor: Omit<Mentor, 'id' | 'role' | 'createdAt'>) => void;
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  teams: TeamCardData[];
  submissions: ProgressSubmission[];
  submitWeeklyProgress: (payload: any) => Promise<void>;
  createTeam: (team: Omit<TeamCardData, 'id'>) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  dashboardState: MockDashboardState;
  assignMentor: (teamId: string, mentorId: string | null) => void;
  submitReview: (submissionId: string, status: MockWeeklySubmission['status'], feedback: string) => void;
  scheduleMeeting: (meeting: MockMeeting) => void;
  updateMockUser: (userId: string, patch: { name?: string; email?: string }) => void;
  addMockMentor: (mentor: { name: string; email: string; department: string }) => void;
  setMockUserStatus: (userId: string, status: 'active' | 'inactive') => void;
  publishAnnouncement: (announcement: Omit<MockAnnouncement, 'id' | 'publishedAt' | 'authorId'>) => void;
  updateMockMentor: (mentorId: string, patch: { department?: string; name?: string; email?: string }) => void;
  updateDemoSetting: (key: 'showNotifications', value: boolean) => void;
}

const initialUserVijay: User = {
  id: 'usr_student_1',
  name: 'Vijay Ananth R S',
  email: 'vijay@college.edu',
  role: 'student',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
  department: 'Computer Science',
  teamRole: 'Team Leader'
};

const initialUsers: User[] = [
  { ...initialUserVijay, password: 'student123' },
  {
    id: 'usr_admin_1',
    name: 'Asha Admin',
    email: 'admin@college.edu',
    password: 'admin123',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=160&q=80'
  },
  {
    id: 'usr_mentor_1',
    name: 'Dr. R. Kumar',
    email: 'mentor@college.edu',
    password: 'mentor123',
    role: 'mentor',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80'
  }
];

const initialProject: Project = {
  id: 'proj_ai_resume',
  title: 'AI Resume Analyzer',
  techStack: ['React', 'Node.js', 'MongoDB', 'Python'],
  description: 'An AI-powered resume analyzer that helps users improve their resumes by providing suggestions and matching skills with job descriptions.',
  teamId: 'team_5',
  teamName: 'Team 5',
  yearCohort: '2nd Year',
  mentorName: 'Dr. R. Kumar',
  mentorId: 'usr_mentor_1',
  progressPercentage: 75,
  currentPhase: 'Development',
  nextDeadline: 'In 4 days',
  daysLeft: 4,
  githubUrl: 'https://github.com/team5/resume-analyzer',
  status: 'NEEDS_ATTENTION',
  milestones: [
    { id: 'm1', title: 'Problem Definition', status: 'Completed' },
    { id: 'm2', title: 'Requirement Analysis', status: 'Completed' },
    { id: 'm3', title: 'UI Design', status: 'Completed' },
    { id: 'm4', title: 'Database Design', status: 'Completed' },
    { id: 'm5', title: 'Development', status: 'In Progress' },
    { id: 'm6', title: 'Testing', status: 'Pending' },
    { id: 'm7', title: 'Final Demo', status: 'Pending' },
    { id: 'm8', title: 'Final Report', status: 'Pending' },
  ],
  members: [
    { id: 'usr_1', name: 'Vijay Kumar', role: 'Team Leader', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80' },
    { id: 'usr_2', name: 'Arun Raj', role: 'Member', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80' },
    { id: 'usr_3', name: 'Saran K', role: 'Member', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80' },
    { id: 'usr_4', name: 'Rahul M', role: 'Member', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80' },
  ]
};

const initialTeams: TeamCardData[] = [
  // 1st Year
  { id: 't1', name: 'Team A', projectTitle: 'AI Chatbot', memberCount: 4, yearCohort: '1st Year', status: 'ON_TRACK', progressPercentage: 85 },
  { id: 't2', name: 'Team B', projectTitle: 'Smart Attendance', memberCount: 5, yearCohort: '1st Year', status: 'ON_TRACK', progressPercentage: 62 },
  { id: 't3', name: 'Team C', projectTitle: 'E-Learning Platform', memberCount: 4, yearCohort: '1st Year', status: 'NEEDS_ATTENTION', progressPercentage: 50 },
  { id: 't4', name: 'Team D', projectTitle: 'Library Management', memberCount: 3, yearCohort: '1st Year', status: 'ON_TRACK', progressPercentage: 70 },
  // 2nd Year
  { id: 't5', name: 'Team 5', projectTitle: 'AI Resume Analyzer', memberCount: 4, yearCohort: '2nd Year', status: 'NEEDS_ATTENTION', progressPercentage: 75 },
  { id: 't6', name: 'Team A (2Y)', projectTitle: 'College Portal', memberCount: 4, yearCohort: '2nd Year', status: 'ON_TRACK', progressPercentage: 40 },
  { id: 't7', name: 'Team B (2Y)', projectTitle: 'Food Delivery App', memberCount: 4, yearCohort: '2nd Year', status: 'DELAYED', progressPercentage: 25 },
  { id: 't8', name: 'Team C (2Y)', projectTitle: 'Health Monitoring', memberCount: 3, yearCohort: '2nd Year', status: 'NEEDS_ATTENTION', progressPercentage: 45 },
  { id: 't9', name: 'Team D (2Y)', projectTitle: 'Vehicle Tracking', memberCount: 4, yearCohort: '2nd Year', status: 'ON_TRACK', progressPercentage: 68 },
  // 3rd Year
  { id: 't10', name: 'Team A (3Y)', projectTitle: 'AI Vision Inspection', memberCount: 4, yearCohort: '3rd Year', status: 'ON_TRACK', progressPercentage: 90 },
  { id: 't11', name: 'Team B (3Y)', projectTitle: 'E-Commerce Platform', memberCount: 4, yearCohort: '3rd Year', status: 'ON_TRACK', progressPercentage: 80 },
  { id: 't12', name: 'Team C (3Y)', projectTitle: 'Waste Management', memberCount: 5, yearCohort: '3rd Year', status: 'NEEDS_ATTENTION', progressPercentage: 55 },
];

const initialSubmissions: ProgressSubmission[] = [
  {
    id: 'sub_w6',
    weekNumber: 6,
    submissionDate: 'Today at 10:30 AM',
    completedTasks: ['Login system', 'Resume upload', 'PDF text extraction'],
    currentWork: ['AI skill matching', 'Improving accuracy'],
    blockers: ['PDF parsing issue (getting empty data)'],
    nextWeekGoals: ['Complete AI matching', 'UI improvements'],
    files: [
      { name: 'Project Report.pdf', size: '2.4 MB', type: 'pdf', url: '#' },
      { name: 'Screenshot.png', size: '1.2 MB', type: 'image', url: '#' }
    ],
    githubUrl: 'https://github.com/team5/resume-analyzer',
    status: 'Waiting for review'
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('pm_mock_user');
    return saved ? JSON.parse(saved) : initialUserVijay;
  });
  const [users] = useState<User[]>(() => {
    const saved = localStorage.getItem('pm_mock_users');
    return saved ? JSON.parse(saved) : initialUsers;
  });
  const [mentors, setMentors] = useState<Mentor[]>(() => {
    const saved = localStorage.getItem('pm_mock_mentors');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [teams, setTeams] = useState<TeamCardData[]>(() => {
    const saved = localStorage.getItem('pm_mock_teams');
    return saved ? JSON.parse(saved) : [];
  });
  const [submissions, setSubmissions] = useState<ProgressSubmission[]>([]);
  const [activeView, setActiveView] = useState<string>('home');
  const [dashboardState, setDashboardState] = useState<MockDashboardState>(initialMockDashboardState);

  useEffect(() => {
    localStorage.setItem('pm_mock_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('pm_mock_teams', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem('pm_mock_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('pm_mock_mentors', JSON.stringify(mentors));
  }, [mentors]);

  const submitWeeklyProgress = async (payload: any) => {
    const newSub: ProgressSubmission = {
      id: `sub_w${payload.weekNumber || 7}`,
      weekNumber: Number(payload.weekNumber) || 7,
      submissionDate: 'Just now',
      completedTasks: payload.completedTasks.split('\n').filter(Boolean),
      currentWork: payload.currentWork.split('\n').filter(Boolean),
      blockers: payload.blockers ? payload.blockers.split('\n').filter(Boolean) : [],
      nextWeekGoals: payload.nextWeekGoals.split('\n').filter(Boolean),
      files: payload.files || [
        { name: 'Weekly_Progress_Report.pdf', size: '1.8 MB', type: 'pdf', url: '#' }
      ],
      githubUrl: payload.githubUrl || (currentProject?.githubUrl ?? ''),
      status: 'Waiting for review'
    };

    setSubmissions([newSub, ...submissions]);
  };

  const createTeam = (teamData: Omit<TeamCardData, 'id'>) => {
    const newTeam: TeamCardData = {
      ...teamData,
      id: `t_${Date.now()}`
    };
    setTeams((prev) => [...prev, newTeam]);

    if (!currentProject) {
      setCurrentProject({
        id: `proj_${newTeam.id}`,
        title: newTeam.projectTitle,
        techStack: ['React', 'Node.js', 'MongoDB'],
        description: `Project workspace for ${newTeam.projectTitle} by ${newTeam.name}.`,
        teamId: newTeam.id,
        teamName: newTeam.name,
        yearCohort: newTeam.yearCohort,
        mentorName: 'Dr. R. Kumar',
        mentorId: 'usr_mentor_1',
        progressPercentage: newTeam.progressPercentage,
        currentPhase: 'Planning',
        nextDeadline: 'In 7 days',
        daysLeft: 7,
        githubUrl: `https://github.com/${newTeam.name.toLowerCase().replace(/\s+/g, '')}/${newTeam.projectTitle.toLowerCase().replace(/\s+/g, '-')}`,
        status: newTeam.status,
        milestones: [
          { id: 'm1', title: 'Problem Definition', status: 'Completed' },
          { id: 'm2', title: 'Requirement Analysis', status: 'In Progress' },
          { id: 'm3', title: 'UI Design', status: 'Pending' },
          { id: 'm4', title: 'Database Design', status: 'Pending' },
          { id: 'm5', title: 'Development', status: 'Pending' },
          { id: 'm6', title: 'Testing', status: 'Pending' },
          { id: 'm7', title: 'Final Demo', status: 'Pending' },
          { id: 'm8', title: 'Final Report', status: 'Pending' }
        ],
        members: [{ id: currentUser.id, name: currentUser.name, role: 'Team Leader' }]
      });
    }
  };

  const createMentor = (mentorData: Omit<Mentor, 'id' | 'role' | 'createdAt'>) => {
    setMentors((previous) => [
      ...previous,
      {
        ...mentorData,
        id: `mentor_${Date.now()}`,
        role: 'mentor',
        createdAt: new Date().toISOString()
      }
    ]);
  };

  const assignMentor = (teamId: string, mentorId: string | null) => {
    setDashboardState((previous) => mockService.assignMentor(previous, teamId, mentorId));
  };

  const submitReview = (submissionId: string, status: MockWeeklySubmission['status'], feedback: string) => {
    setDashboardState((previous) => mockService.submitReview(previous, submissionId, status, feedback));
  };

  const scheduleMeeting = (meeting: MockMeeting) => {
    setDashboardState((previous) => mockService.scheduleMeeting(previous, meeting));
  };

  const updateMockUser = (userId: string, patch: { name?: string; email?: string }) => {
    setDashboardState((previous) => mockService.updateUser(previous, userId, patch));
    if (currentUser.id === userId) setCurrentUser((previous) => ({ ...previous, ...patch }));
  };

  const addMockMentor = (mentor: { name: string; email: string; department: string }) => {
    setDashboardState((previous) => mockService.addMentor(previous, mentor));
  };

  const setMockUserStatus = (userId: string, status: 'active' | 'inactive') => {
    setDashboardState((previous) => mockService.setUserStatus(previous, userId, status));
  };

  const publishAnnouncement = (announcement: Omit<MockAnnouncement, 'id' | 'publishedAt' | 'authorId'>) => {
    setDashboardState((previous) => mockService.publishAnnouncement(previous, {
      ...announcement,
      id: `announcement-${Date.now()}`,
      authorId: currentUser.id,
      publishedAt: new Date().toISOString().slice(0, 10)
    }));
  };

  const updateMockMentor = (mentorId: string, patch: { department?: string; name?: string; email?: string }) => {
    setDashboardState((previous) => mockService.updateMentor(previous, mentorId, patch));
  };

  const updateDemoSetting = (key: 'showNotifications', value: boolean) => {
    setDashboardState((previous) => mockService.updateSetting(previous, key, value));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        mentors,
        createMentor,
        currentProject,
        setCurrentProject,
        teams,
        submissions,
        submitWeeklyProgress,
        createTeam,
        activeView,
        setActiveView,
        dashboardState,
        assignMentor,
        submitReview,
        scheduleMeeting,
        updateMockUser,
        addMockMentor,
        setMockUserStatus,
        publishAnnouncement,
        updateMockMentor,
        updateDemoSetting
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
