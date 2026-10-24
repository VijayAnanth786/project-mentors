import { Bell, BookOpen, CalendarDays, FileCheck2, FolderKanban, LayoutDashboard, LogOut, Megaphone, Network, Settings, ShieldCheck, UserCircle, Users, UserRoundPlus, BarChart3 } from 'lucide-react';
import { DashboardRole } from '../data/mockData';

export interface DashboardNavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

export const navConfig: Record<DashboardRole, DashboardNavItem[]> = {
  student: [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'My Projects', path: '/student/projects', icon: FolderKanban },
    { label: 'My Team', path: '/student/team', icon: Users },
    { label: 'Submit Progress', path: '/student/progress', icon: FileCheck2 },
    { label: 'Timeline', path: '/student/timeline', icon: CalendarDays },
    { label: 'Reviews', path: '/student/reviews', icon: BookOpen },
    { label: 'Notifications', path: '/student/notifications', icon: Bell }
  ],
  mentor: [
    { label: 'Dashboard', path: '/mentor/dashboard', icon: LayoutDashboard },
    { label: 'My Teams', path: '/mentor/teams', icon: Users },
    { label: 'Projects', path: '/mentor/projects', icon: FolderKanban },
    { label: 'Progress Reviews', path: '/mentor/reviews', icon: FileCheck2 },
    { label: 'Meetings', path: '/mentor/meetings', icon: CalendarDays },
    { label: 'Notifications', path: '/mentor/notifications', icon: Bell },
    { label: 'Profile', path: '/mentor/profile', icon: UserCircle }
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Students', path: '/admin/students', icon: Users },
    { label: 'Mentors', path: '/admin/mentors', icon: UserRoundPlus },
    { label: 'Teams', path: '/admin/teams', icon: Network },
    { label: 'Projects', path: '/admin/projects', icon: FolderKanban },
    { label: 'Assign Mentors', path: '/admin/assign-mentors', icon: ShieldCheck },
    { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
    { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
    { label: 'Settings', path: '/admin/settings', icon: Settings }
  ]
};

export const logoutNavItem: DashboardNavItem = { label: 'Logout', path: '/login', icon: LogOut };

export const pathToView: Record<string, string> = {
  '/login': 'login', '/student/dashboard': 'home', '/student/projects': 'project_details', '/student/team': 'my_team', '/student/progress': 'submit_progress', '/student/timeline': 'timeline', '/student/reviews': 'reviews', '/student/notifications': 'notifications',
  '/mentor/dashboard': 'mentor_dashboard', '/mentor/teams': 'mentor_teams', '/mentor/projects': 'mentor_projects', '/mentor/reviews': 'mentor_reviews', '/mentor/meetings': 'mentor_meetings', '/mentor/notifications': 'mentor_notifications', '/mentor/profile': 'mentor_profile', '/admin/dashboard': 'admin_dashboard', '/admin/students': 'admin_students', '/admin/mentors': 'admin_mentors', '/admin/teams': 'admin_teams', '/admin/projects': 'admin_projects', '/admin/assign-mentors': 'admin_assign_mentors', '/admin/announcements': 'admin_announcements', '/admin/reports': 'admin_reports', '/admin/settings': 'admin_settings'
};