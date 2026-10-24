import React from 'react';
import { useApp } from './context/AppContext';
import { StudentDashboardView } from './views/StudentDashboardView';
import { MyTeamsView } from './views/MyTeamsView';
import { ProjectDetailsView } from './views/ProjectDetailsView';
import { SubmitProgressView } from './views/SubmitProgressView';
import { ProjectAnalyticsView } from './views/ProjectAnalyticsView';
import { LoginView } from './views/LoginView';
import { MentorCreationView } from './views/MentorCreationView';
import { DashboardLayout } from './components/DashboardLayout';
import { RoleDashboardView } from './views/RoleDashboardView';
import { ComingNextView } from './views/ComingNextView';
import { pathToView } from './components/navConfig';
import { initialMockDashboardState } from './data/mockData';
import { MentorDashboardView } from './views/MentorDashboardView';
import { MentorMeetingsView, MentorNotificationsView, MentorProfileView, MentorProjectsView, MentorReviewsView, MentorTeamsView } from './views/MentorPages';
import { AdminAnnouncementsView, AdminAssignMentorsView, AdminMentorsView, AdminProjectsView, AdminReportsView, AdminSettingsView, AdminStudentsView, AdminTeamsView } from './views/AdminPages';
import { AdminDashboardView } from './views/AdminDashboardView';

export const App: React.FC = () => {
  const { activeView, setActiveView, currentUser, setCurrentUser } = useApp();

  React.useEffect(() => {
    const syncPath = () => {
      const view = pathToView[window.location.pathname];
      if (view) {
        setActiveView(view);
        const role = window.location.pathname.startsWith('/admin/') ? 'admin' : window.location.pathname.startsWith('/mentor/') ? 'mentor' : 'student';
        if (currentUser.role !== role) {
          const previewUser = initialMockDashboardState.users.find((user) => user.role === role && user.status === 'active');
          if (previewUser) setCurrentUser({ id: previewUser.id, name: previewUser.name, email: previewUser.email, role, avatar: currentUser.avatar });
        }
      }
    };
    syncPath();
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, [currentUser.avatar, currentUser.role, setActiveView, setCurrentUser]);

  if (activeView === 'login') {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (activeView) {
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
      case 'mentor_management':
        return <MentorCreationView />;
      default:
        return <ComingNextView title={activeView.replace(/[\/_]/g, ' ').trim() || 'Dashboard'} />;
    }
  };

  return (
    <DashboardLayout>{renderActiveView()}</DashboardLayout>
  );
};
