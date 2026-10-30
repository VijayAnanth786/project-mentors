import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Project, ProgressSubmission, TeamCardData } from '../types';
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
  isAuthLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<{
    success: boolean;
    message?: string;
    mustChangePassword?: boolean;
    user?: User;
    token?: string;
    temporaryPasswordExpiresAt?: string | null;
  }>;
  applySession: (user: User, token: string) => void;
  googleLogin: (data: { credential?: string; accessToken?: string; email?: string; name?: string; avatar?: string; role?: string }) => Promise<{
    success: boolean;
    message?: string;
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
}

const emptyUser: User = {
  id: '',
  name: 'User',
  email: '',
  role: 'student'
};

const AppContext = createContext<AppContextType | undefined>(undefined);

/** Derive the correct view key from a role string. */
const viewForRole = (role: string): string => {
  if (role === 'admin') return 'admin_dashboard';
  if (role === 'mentor') return 'mentor_dashboard';
  return 'home';
};

/** Derive the correct URL path from a role string. */
const pathForRole = (role: string): string => {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'mentor') return '/mentor/dashboard';
  return '/student/dashboard';
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialise from localStorage so the UI has the right role immediately,
  // before the /api/auth/me response comes back.
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('pm_user');
      return saved ? JSON.parse(saved) : emptyUser;
    } catch {
      return emptyUser;
    }
  });

  // Start as 'loading' so App.tsx waits before routing.
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<string>('home');
  const [toast, setToast] = useState<ToastState | null>(null);

  // Student state starts completely clean (no demo mock data)
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [teams, setTeams] = useState<TeamCardData[]>([]);
  const [submissions, setSubmissions] = useState<ProgressSubmission[]>([]);
  const [users] = useState<User[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  const refreshStudentData = useCallback(async () => {
    const token = localStorage.getItem('pm_auth_token');
    if (!token) return;

    try {
      const data = await api.student.getDashboard();

      if (data?.studentProfile) {
        // CRITICAL: never let studentProfile overwrite the authoritative role
        // that was set by /api/auth/me or the login response.
        const { role: _ignored, ...safeProfile } = data.studentProfile as any;
        setCurrentUser((prev) => ({
          ...prev,
          ...safeProfile
        }));
        try {
          const existing = JSON.parse(localStorage.getItem('pm_user') || '{}');
          localStorage.setItem('pm_user', JSON.stringify({ ...existing, ...safeProfile }));
        } catch {}
      }

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

  // On mount: verify session with server and set the correct view immediately.
  // isAuthLoading stays true until this resolves so App.tsx doesn't route early.
  useEffect(() => {
    const token = localStorage.getItem('pm_auth_token');
    if (!token) {
      setIsAuthLoading(false);
      return;
    }

    api.auth.getMe()
      .then((res) => {
        if (res?.user) {
          const user = res.user;
          // Server is the source of truth for role — overwrite localStorage.
          setCurrentUser(user);
          localStorage.setItem('pm_user', JSON.stringify(user));

          if (user.mustChangePassword) {
            setActiveView('login');
            window.history.replaceState({}, '', '/login');
            return;
          }

          const role = String(user.role || '').toLowerCase();

          // Only redirect to role home if the current path doesn't already
          // belong to this role (avoids clobbering a deep link on refresh).
          const pathname = window.location.pathname;
          const correctPath = pathForRole(role);
          const isOnWrongRole =
            (role === 'admin' && !pathname.startsWith('/admin')) ||
            (role === 'mentor' && !pathname.startsWith('/mentor')) ||
            (role === 'student' && (pathname.startsWith('/admin') || pathname.startsWith('/mentor')));

          if (isOnWrongRole || pathname === '/' || pathname === '/login' || pathname === '') {
            window.history.replaceState({}, '', correctPath);
            setActiveView(viewForRole(role));
          }
          // else: keep the current path and activeView (user refreshed a valid deep link)

          if (role === 'student') {
            refreshStudentData();
            refreshTeams();
          }
        }
      })
      .catch(() => {
        localStorage.removeItem('pm_auth_token');
        localStorage.removeItem('pm_user');
        setActiveView('login');
        window.history.replaceState({}, '', '/login');
      })
      .finally(() => {
        setIsAuthLoading(false);
      });

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
      const userWithFlag = {
        ...data.user,
        mustChangePassword: Boolean(data.mustChangePassword)
      };
      localStorage.setItem('pm_auth_token', data.token);
      localStorage.setItem('pm_user', JSON.stringify(userWithFlag));
      setCurrentUser(userWithFlag);

      // First login with a temporary password must not reach any dashboard.
      if (data.mustChangePassword) {
        setActiveView('login');
        window.history.replaceState({}, '', '/login');
        return {
          success: true,
          mustChangePassword: true,
          user: userWithFlag,
          token: data.token,
          temporaryPasswordExpiresAt: data.temporaryPasswordExpiresAt
        };
      }

      const role = String(data.user.role || '').toLowerCase();
      const targetPath = data.redirectUrl || pathForRole(role);
      window.history.pushState({}, '', targetPath);
      setActiveView(viewForRole(role));

      if (role === 'student') {
        refreshStudentData();
        refreshTeams();
      }

      showToast(`Welcome back, ${data.user.name}!`, 'success');
      return { success: true, mustChangePassword: false, user: userWithFlag, token: data.token };
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Login failed. Please verify credentials.';
      return { success: false, message };
    }
  };

  const googleLogin = async (data: { credential?: string; accessToken?: string; email?: string; name?: string; avatar?: string; role?: string }) => {
    try {
      const res = await api.auth.googleLogin(data);
      if (!res.success) {
        return { success: false, message: res.message || 'Google sign-in failed.' };
      }
      localStorage.setItem('pm_auth_token', res.token);
      localStorage.setItem('pm_user', JSON.stringify(res.user));
      setCurrentUser(res.user);

      const role = String(res.user.role || '').toLowerCase();
      const targetPath = res.redirectUrl || pathForRole(role);
      window.history.pushState({}, '', targetPath);
      setActiveView(viewForRole(role));

      if (role === 'student') {
        refreshStudentData();
        refreshTeams();
      }

      showToast(`Signed in with Google as ${res.user.name}!`, 'success');
      return { success: true };
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Google sign-in failed.';
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

  const applySession = useCallback((user: User, token: string) => {
    localStorage.setItem('pm_auth_token', token);
    localStorage.setItem('pm_user', JSON.stringify(user));
    setCurrentUser(user);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        activeView,
        setActiveView,
        isAuthLoading,
        login,
        applySession,
        googleLogin,
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
        users
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
