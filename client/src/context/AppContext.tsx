import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Mentor, User, Project, ProgressSubmission, TeamCardData } from '../types';
import { api } from '../api/client';
import { Toast } from '../components/shared';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  login: (credentials: { email: string; password: string }) => Promise<{
    success: boolean;
    message?: string;
    mustChangePassword?: boolean;
    user?: User;
    token?: string;
  }>;
  logout: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error') => void;

  // Student features preservation
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  teams: TeamCardData[];
  submissions: ProgressSubmission[];
  submitWeeklyProgress: (payload: any) => Promise<void>;
  createTeam: (team: Omit<TeamCardData, 'id'>) => void;
  users: User[];
  mentors: Mentor[];
  createMentor: (mentor: Omit<Mentor, 'id' | 'role' | 'createdAt'>) => void;
}

const defaultStudentVijay: User = {
  id: 'usr_s_vijay',
  name: 'Vijay Ananth R S',
  email: 'vijay@college.edu',
  role: 'student',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
  department: 'Computer Science',
  teamRole: 'Team Leader'
};

const initialProject: Project = {
  id: 'proj_attendance',
  title: 'Attendance System',
  techStack: ['React', 'TypeScript', 'Node.js', 'Python', 'OpenCV'],
  description: 'Automated Face Recognition Attendance System with geolocation verification and real-time mentor reporting.',
  teamId: 'team_codecrew',
  teamName: 'CodeCrew',
  yearCohort: '3rd Year',
  mentorName: 'Dr. Vetri Chelvan',
  mentorId: 'usr_mentor_vetri',
  progressPercentage: 45,
  currentPhase: 'Development',
  nextDeadline: 'In 6 days',
  daysLeft: 6,
  githubUrl: 'https://github.com/codecrew/attendance-system',
  status: 'ON_TRACK',
  milestones: [
    { id: 'm_1', title: 'System Architecture & Database Schema', status: 'Completed' },
    { id: 'm_2', title: 'Face Embeddings Pipeline & API', status: 'In Progress' },
    { id: 'm_3', title: 'Mobile Client & Geolocation Check', status: 'Pending' },
    { id: 'm_4', title: 'End-to-End Validation & Final Demo', status: 'Pending' }
  ],
  members: [
    { id: 'usr_s_vijay', name: 'Vijay Ananth R S', role: 'Team Leader', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80' },
    { id: 'usr_s_priya', name: 'Priya Dharshini', role: 'Member', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80' },
    { id: 'usr_s_karthik', name: 'Karthik Raja', role: 'Member', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80' },
    { id: 'usr_s_divya', name: 'Divya Bharathi', role: 'Member', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80' }
  ]
};

const initialSubmissions: ProgressSubmission[] = [
  {
    id: 'sub_cc_w4',
    weekNumber: 4,
    submissionDate: 'Oct 23, 2026',
    completedTasks: [
      'Implemented face vector embedding generation using MobileNet',
      'Created REST endpoint for video stream chunk ingestion'
    ],
    currentWork: [
      'Integrating anti-spoofing liveness detection',
      'Testing latency under 5 concurrent camera feeds'
    ],
    blockers: [
      'Occasional False Rejection Rate during low-light conditions in Classroom 204'
    ],
    nextWeekGoals: [
      'Complete camera sync and calibrate confidence threshold'
    ],
    files: [
      { name: 'Architecture_Diagram_v2.pdf', size: '2.1 MB', type: 'pdf', url: '/api/files/architecture-diagram-v2.pdf' },
      { name: 'FRR_Analysis.png', size: '840 KB', type: 'image', url: '/api/files/frr-analysis.png' }
    ],
    githubUrl: 'https://github.com/codecrew/attendance-system/tree/week-4',
    status: 'Waiting for review'
  }
];

const initialTeams: TeamCardData[] = [
  { id: 'team_codecrew', name: 'CodeCrew', projectTitle: 'Attendance System', memberCount: 4, yearCohort: '3rd Year', status: 'ON_TRACK', progressPercentage: 45 },
  { id: 'team_techtitans', name: 'TechTitans', projectTitle: 'Campus Connect', memberCount: 4, yearCohort: '3rd Year', status: 'NEEDS_ATTENTION', progressPercentage: 30 },
  { id: 'team_bytebuilders', name: 'ByteBuilders', projectTitle: 'Library Manager', memberCount: 4, yearCohort: '3rd Year', status: 'ON_TRACK', progressPercentage: 60 },
  { id: 'team_datadynamos', name: 'DataDynamos', projectTitle: 'Smart Health Monitoring', memberCount: 4, yearCohort: '3rd Year', status: 'ON_TRACK', progressPercentage: 70 },
  { id: 'team_cloudcrafters', name: 'CloudCrafters', projectTitle: 'Cloud Cost Optimizer', memberCount: 2, yearCohort: '3rd Year', status: 'NEEDS_ATTENTION', progressPercentage: 20 }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('pm_user');
    return saved ? JSON.parse(saved) : defaultStudentVijay;
  });

  const [activeView, setActiveView] = useState<string>('home');
  const [toast, setToast] = useState<ToastState | null>(null);

  // Student preservation state
  const [currentProject, setCurrentProject] = useState<Project | null>(initialProject);
  const [teams, setTeams] = useState<TeamCardData[]>(initialTeams);
  const [submissions, setSubmissions] = useState<ProgressSubmission[]>(initialSubmissions);
  const [users] = useState<User[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  // Sync session on mount with server /api/auth/me
  useEffect(() => {
    const token = localStorage.getItem('pm_auth_token');
    if (token) {
      api.auth.getMe()
        .then((res) => {
          if (res?.user) {
            setCurrentUser(res.user);
            localStorage.setItem('pm_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          // Token invalid; handled by axios response interceptor
        });
    }

    const handleUnauthorized = () => {
      setActiveView('login');
      window.history.pushState({}, '', '/login');
      showToast('Your session has expired. Please sign in again.', 'error');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [showToast]);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const data = await api.auth.login(credentials);
      localStorage.setItem('pm_auth_token', data.token);
      localStorage.setItem('pm_user', JSON.stringify(data.user));
      setCurrentUser(data.user);

      if (data.mustChangePassword) {
        return { success: true, mustChangePassword: true, user: data.user, token: data.token };
      }

      const targetPath = data.redirectUrl || (data.user.role === 'admin' ? '/admin/dashboard' : data.user.role === 'mentor' ? '/mentor/dashboard' : '/student/dashboard');
      window.history.pushState({}, '', targetPath);

      if (data.user.role === 'admin') setActiveView('admin_dashboard');
      else if (data.user.role === 'mentor') setActiveView('mentor_dashboard');
      else setActiveView('home');

      showToast(`Welcome back, ${data.user.name}!`, 'success');
      return { success: true };
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Login failed. Please verify credentials.';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      localStorage.removeItem('pm_auth_token');
      localStorage.removeItem('pm_user');
      setActiveView('login');
      window.history.pushState({}, '', '/login');
      showToast('You have been logged out safely.', 'success');
    }
  };

  const submitWeeklyProgress = async (payload: any) => {
    try {
      await api.student.submitProgress(payload);
      showToast('Progress report submitted to mentor successfully!', 'success');
    } catch (e) {
      // Fallback local update
    }

    const newSub: ProgressSubmission = {
      id: `sub_${Date.now()}`,
      weekNumber: Number(payload.weekNumber) || 7,
      submissionDate: 'Just now',
      completedTasks: typeof payload.completedTasks === 'string' ? payload.completedTasks.split('\n').filter(Boolean) : payload.completedTasks || [],
      currentWork: typeof payload.currentWork === 'string' ? payload.currentWork.split('\n').filter(Boolean) : payload.currentWork || [],
      blockers: typeof payload.blockers === 'string' ? payload.blockers.split('\n').filter(Boolean) : payload.blockers || [],
      nextWeekGoals: typeof payload.nextWeekGoals === 'string' ? payload.nextWeekGoals.split('\n').filter(Boolean) : payload.nextWeekGoals || [],
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
  };

  const createMentor = (mentorData: Omit<Mentor, 'id' | 'role' | 'createdAt'>) => {
    setMentors((prev) => [
      ...prev,
      {
        ...mentorData,
        id: `mentor_${Date.now()}`,
        role: 'mentor',
        createdAt: new Date().toISOString()
      }
    ]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        activeView,
        setActiveView,
        login,
        logout,
        showToast,
        currentProject,
        setCurrentProject,
        teams,
        submissions,
        submitWeeklyProgress,
        createTeam,
        users,
        mentors,
        createMentor
      }}
    >
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
