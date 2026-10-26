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

  // Student features
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  teams: TeamCardData[];
  submissions: ProgressSubmission[];
  submitWeeklyProgress: (payload: any) => Promise<boolean>;
  createTeam: (teamData: { name: string; projectTitle: string; description?: string; yearCohort?: string; techStack?: string[]; githubUrl?: string }) => Promise<any>;
  joinTeam: (teamId: string) => Promise<any>;
  refreshStudentData: () => Promise<void>;
  refreshTeams: () => Promise<void>;
  users: User[];
  mentors: Mentor[];
  createMentor: (mentor: Omit<Mentor, 'id' | 'role' | 'createdAt'>) => void;
}

const emptyUser: User = {
  id: '',
  name: 'User',
  email: '',
  role: 'student'
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('pm_user');
    return saved ? JSON.parse(saved) : emptyUser;
  });

  const [activeView, setActiveView] = useState<string>('home');
  const [toast, setToast] = useState<ToastState | null>(null);

  // Student state starts completely clean (no demo mock data)
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [teams, setTeams] = useState<TeamCardData[]>([]);
  const [submissions, setSubmissions] = useState<ProgressSubmission[]>([]);
  const [users] = useState<User[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  const refreshStudentData = useCallback(async () => {
    const token = localStorage.getItem('pm_auth_token');
    if (!token) return;

    try {
      const data = await api.student.getDashboard();
      if (data?.hasTeam && data?.project) {
        setCurrentProject({
          ...data.project,
          teamId: data.team.id,
          teamName: data.team.name,
          yearCohort: data.team.yearCohort,
          mentorName: data.team.mentorName || 'Unassigned',
          mentorId: data.team.mentor_id || '',
          members: data.team.members || [],
          milestones: data.project.milestones || []
        });
      } else {
        setCurrentProject(null);
      }

      if (data?.submissions) {
        setSubmissions(
          data.submissions.map((s: any) => ({
            id: s.id,
            weekNumber: s.week,
            submissionDate: s.date,
            completedTasks: s.work_completed ? s.work_completed.split('\n').filter(Boolean) : [],
            currentWork: s.current_work ? s.current_work.split('\n').filter(Boolean) : [],
            blockers: s.blockers ? s.blockers.split('\n').filter(Boolean) : [],
            nextWeekGoals: s.next_week_goals ? s.next_week_goals.split('\n').filter(Boolean) : [],
            files: s.attachments || [],
            githubUrl: s.repo_url || '',
            status: s.status === 'APPROVED' ? 'Approved' : s.status === 'CHANGES_REQUESTED' ? 'Changes requested' : 'Waiting for review',
            feedback: s.feedback || undefined,
            reviewerName: s.reviewer_name || undefined
          }))
        );
      } else {
        setSubmissions([]);
      }
    } catch {
      // not logged in as student or server offline
    }
  }, []);

  const refreshTeams = useCallback(async () => {
    const token = localStorage.getItem('pm_auth_token');
    if (!token) return;

    try {
      const data = await api.student.getTeams();
      if (Array.isArray(data)) {
        setTeams(
          data.map((t: any) => ({
            id: t.id,
            name: t.name,
            projectTitle: t.projectTitle || 'Untitled Project',
            memberCount: t.memberCount || 1,
            yearCohort: t.yearCohort || '3rd Year',
            status: t.projectStatus || 'ON_TRACK',
            progressPercentage: t.progressPercentage || 0,
            leaderName: t.leaderName,
            mentorName: t.mentorName
          }))
        );
      }
    } catch {}
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
            if (res.user.role === 'student') {
              refreshStudentData();
              refreshTeams();
            }
          }
        })
        .catch(() => {
          localStorage.removeItem('pm_auth_token');
          localStorage.removeItem('pm_user');
        });
    }

    const handleUnauthorized = () => {
      setActiveView('login');
      window.history.pushState({}, '', '/login');
      showToast('Your session has expired. Please sign in again.', 'error');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [showToast, refreshStudentData, refreshTeams]);

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
      else {
        setActiveView('home');
        refreshStudentData();
        refreshTeams();
      }

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
      setCurrentUser(emptyUser);
      setCurrentProject(null);
      setSubmissions([]);
      setTeams([]);
      setActiveView('login');
      window.history.pushState({}, '', '/login');
      showToast('You have been logged out safely.', 'success');
    }
  };

  const submitWeeklyProgress = async (payload: any): Promise<boolean> => {
    const finalFiles = payload.files || payload.attachments || [];
    const finalRepoUrl = payload.githubUrl || payload.repoUrl || (currentProject?.githubUrl ?? '');

    try {
      await api.student.submitProgress({
        ...payload,
        repoUrl: finalRepoUrl,
        githubUrl: finalRepoUrl,
        attachments: finalFiles,
        files: finalFiles
      });
      showToast('Progress report submitted to mentor successfully!', 'success');
      await refreshStudentData();
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to submit progress report.';
      showToast(msg, 'error');
      throw err;
    }
  };

  const createTeam = async (teamData: { name: string; projectTitle: string; description?: string; yearCohort?: string; techStack?: string[]; githubUrl?: string }) => {
    try {
      const res = await api.student.createTeam(teamData);
      showToast('Team & project created successfully!', 'success');
      await refreshStudentData();
      await refreshTeams();
      return res;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create team.';
      showToast(msg, 'error');
      throw err;
    }
  };

  const joinTeam = async (teamId: string) => {
    try {
      const res = await api.student.joinTeam(teamId);
      showToast(res.message || 'Joined team successfully!', 'success');
      await refreshStudentData();
      await refreshTeams();
      return res;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to join team.';
      showToast(msg, 'error');
      throw err;
    }
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
        joinTeam,
        refreshStudentData,
        refreshTeams,
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
