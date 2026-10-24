import React, { useState, useEffect } from 'react';
import { Search, Bell, GraduationCap, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';

export const Navbar: React.FC = () => {
  const { currentUser, setActiveView, logout } = useApp();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (currentUser?.role === 'mentor') {
      api.mentor.getNotifications()
        .then((data) => setUnreadCount(data.unreadCount || 0))
        .catch(() => {});
    }
  }, [currentUser]);

  const handleBrandClick = () => {
    if (currentUser.role === 'admin') {
      window.history.pushState({}, '', '/admin/dashboard');
      setActiveView('admin_dashboard');
    } else if (currentUser.role === 'mentor') {
      window.history.pushState({}, '', '/mentor/dashboard');
      setActiveView('mentor_dashboard');
    } else {
      window.history.pushState({}, '', '/student/dashboard');
      setActiveView('home');
    }
  };

  const handleBellClick = () => {
    if (currentUser.role === 'mentor') {
      window.history.pushState({}, '', '/mentor/notifications');
      setActiveView('mentor_notifications');
    } else if (currentUser.role === 'admin') {
      window.history.pushState({}, '', '/admin/announcements');
      setActiveView('admin_announcements');
    } else {
      window.history.pushState({}, '', '/student/notifications');
      setActiveView('notifications');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand Logo */}
      <div
        onClick={handleBrandClick}
        className="flex items-center space-x-3 w-64 cursor-pointer select-none"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900 block leading-tight">
            ProjectMentor
          </span>
          <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase block">
            BUILD • LEARN • GROW
          </span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects, teams, or student records..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button
          onClick={handleBellClick}
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title="Notifications"
          aria-label="View notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Profile Chip */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
          <img
            src={
              currentUser.avatar ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80'
            }
            alt={currentUser.name}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/20"
          />
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">
              {currentUser.name}
            </div>
            <div className="text-[11px] text-slate-400 capitalize font-medium">
              {currentUser.role}
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Sign out"
            aria-label="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
