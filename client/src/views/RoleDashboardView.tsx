import React from 'react';
import { useApp } from '../context/AppContext';
import { AdminDashboardView } from './AdminDashboardView';
import { MentorDashboardView } from './MentorDashboardView';
import { StudentDashboardView } from './StudentDashboardView';

export const RoleDashboardView: React.FC = () => {
  const { currentUser } = useApp();

  if (currentUser.role === 'admin') {
    return <AdminDashboardView />;
  }
  if (currentUser.role === 'mentor') {
    return <MentorDashboardView />;
  }
  return <StudentDashboardView />;
};