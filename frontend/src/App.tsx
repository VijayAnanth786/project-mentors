import React from 'react';
import { useApp } from './context/AppContext';
import { StudentDashboardView } from './views/StudentDashboardView';
import { MyTeamsView } from './views/MyTeamsView';
import { ProjectDetailsView } from './views/ProjectDetailsView';
import { SubmitProgressView } from './views/SubmitProgressView';
import { ProjectAnalyticsView } from './views/ProjectAnalyticsView';
import { LoginView } from './views/LoginView';
import { DashboardLayout } from './components/DashboardLayout';
import { ComingNextView } from './views/ComingNextView';
import { pathToView } from './components/navConfig';
import { MentorDashboardView } from './views/MentorDashboardView';
import {
  MentorMeetingsView,
  MentorNotificationsView,
  MentorProfileView,
  MentorProjectsView,
  MentorReviewsView,
  MentorTeamsView
} from './views/MentorPages';
import {
  AdminAnnouncementsView,
  AdminAssignMentorsView,
  AdminMentorsView,
  AdminProjectsView,
  AdminReportsView,
  AdminSettingsView,
  AdminStudentsView,
  AdminTeamsView
} from './views/AdminPages';
import { AdminDashboardView } from './views/AdminDashboardView';

const roleHome = (role: string): string => {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'mentor') return '/mentor/dashboard';
  return '/student/dashboard';
};

const viewRole = (view: string): 'admin' | 'mentor' | 'student' | null => {
  if (view.startsWith('admin_')) return 'admin';
  if (view.startsWith('mentor_')) return 'mentor';
  if (['home', 'my_team', 'project_details', 'submit_progress', 'analytics', 'timeline', 'reviews', 'notifications'].includes(view)) {
    return 'student';
  }
  return null;
};

export const App: React.FC = () => {
  const { activeView, setActiveView, currentUser, isAuthLoading } = useApp();

  // Sync URL path → activeView on first render and on browser back/forward.
  // This effect intentionally runs before auth resolves so deep-linked URLs
  // are remembered; the guard below prevents rendering the wrong role's view.
  React.useEffect(() => {
    const syncPath = () => {
      const pathname = window.location.pathname;
      const view = pathToView[pathname];
      if (view) {
        setActiveView(view);
      } else if (pathname === '/' || pathname === '') {
        const token = localStorage.getItem('pm_auth_token');
        const userStr = localStorage.getItem('pm_user');
        if (!token || !userStr) {
          window.history.replaceState({}, '', '/login');
          setActiveView('login');
        } else {
          try {
            const user = JSON.parse(userStr);
            const redirect =
              user.role === 'admin'
                ? '/admin/dashboard'
                : user.role === 'mentor'
                ? '/mentor/dashboard'
                : '/student/dashboard';
            window.history.replaceState({}, '', redirect);
            setActiveView(pathToView[redirect] || 'home');
          } catch {
            setActiveView('login');
          }
        }
      }
    };

    syncPath();
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, [setActiveView]);

  // Route-level authorization — runs only after auth has resolved so we never
  // redirect an admin to the student dashboard due to a stale initial state.
  React.useEffect(() => {
    if (isAuthLoading) return; // wait for server session check to complete

    const token = localStorage.getItem('pm_auth_token');
    const pathname = window.location.pathname;
    const role = String(currentUser?.role || '').toLowerCase();

    if (!token) {
      if (pathname !== '/login') {
        window.history.replaceState({}, '', '/login');
        setActiveView('login');
      }
      return;
    }

    // Do not run role-based redirection until the user identity is loaded
    if (!currentUser?.id) {
      return;
    }

    if (currentUser?.mustChangePassword) {
      if (pathname !== '/login') {
        window.history.replaceState({}, '', '/login');
      }
      setActiveView('login');
      return;
    }

    if (pathname === '/login' || pathname === '/' || pathname === '') {
      const target = roleHome(role);
      window.history.replaceState({}, '', target);
      setActiveView(pathToView[target] || 'home');
      return;
    }

    const requiredRole = viewRole(activeView);
    if (requiredRole && requiredRole !== role) {
      const target = roleHome(role);
      window.history.replaceState({}, '', target);
      setActiveView(pathToView[target] || 'home');
    }
  }, [activeView, currentUser, isAuthLoading, setActiveView]);

  // Show a minimal loading screen while verifying session with server.
  // This prevents flashing the wrong role's dashboard for a split second.
  if (isAuthLoading && !currentUser?.id) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f8fafc',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTop: '3px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (activeView === 'login') {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (activeView) {
      // Admin Views
      case 'admin_dashboard':
        return <AdminDashboardView />;
      case 'admin_students':
        return <AdminStudentsView />;
      case 'admin_mentors':
        return <AdminMentorsView />;
      case 'admin_teams':
        return <AdminTeamsView />;
      case 'admin_projects':
        return <AdminProjectsView />;
      case 'admin_assign_mentors':
        return <AdminAssignMentorsView />;
      case 'admin_announcements':
        return <AdminAnnouncementsView />;
      case 'admin_reports':
        return <AdminReportsView />;
      case 'admin_settings':
        return <AdminSettingsView />;

      // Mentor Views
      case 'mentor_dashboard':
        return <MentorDashboardView />;
      case 'mentor_teams':
        return <MentorTeamsView />;
      case 'mentor_projects':
        return <MentorProjectsView />;
      case 'mentor_reviews':
        return <MentorReviewsView />;
      case 'mentor_meetings':
        return <MentorMeetingsView />;
      case 'mentor_notifications':
        return <MentorNotificationsView />;
      case 'mentor_profile':
        return <MentorProfileView />;

      // Student Views
      case 'home':
        return <StudentDashboardView />;
      case 'my_team':
        return <MyTeamsView />;
      case 'project_details':
        return <ProjectDetailsView />;
      case 'submit_progress':
        return <SubmitProgressView />;
      case 'analytics':
        return <ProjectAnalyticsView />;
      case 'timeline':
      case 'reviews':
      case 'notifications':
        return <ComingNextView title={activeView} />;

      default:
        return <ComingNextView title={activeView.replace(/[\/_]/g, ' ').trim() || 'Dashboard'} />;
    }
  };

  return <DashboardLayout>{renderActiveView()}</DashboardLayout>;
};
