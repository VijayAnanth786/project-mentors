import React from 'react';
import { Search, Bell, GraduationCap, MonitorPlay } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DashboardRole, initialMockDashboardState } from '../data/mockData';

export const Navbar: React.FC = () => {
  const { currentUser, setActiveView, setCurrentUser } = useApp();

  const switchRole = (role: DashboardRole) => {
    const user = initialMockDashboardState.users.find((candidate) => candidate.role === role && candidate.status === 'active');
    if (!user) return;
    setCurrentUser({ id: user.id, name: user.name, email: user.email, role, avatar: currentUser.avatar });
    setActiveView(role === 'admin' ? 'admin_dashboard' : role === 'mentor' ? 'mentor_dashboard' : 'home');
    window.history.pushState({}, '', role === 'admin' ? '/admin/dashboard' : role === 'mentor' ? '/mentor/dashboard' : '/student/dashboard');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand Logo */}
      <div
        onClick={() => setActiveView('home')}
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
            Build • Learn • Grow
          </span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects, teams, or anything..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="hidden items-center gap-2 lg:flex">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700"><MonitorPlay className="h-3 w-3" />Demo Mode</span>
          <label className="sr-only" htmlFor="role-preview">Preview role</label>
          <select id="role-preview" value={currentUser.role} onChange={(event) => switchRole(event.target.value as DashboardRole)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600"><option value="student">Student preview</option><option value="mentor">Mentor preview</option><option value="admin">Admin preview</option></select>
        </div>

        <button
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        {/* Profile Chip */}
        <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/20"
          />
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">
              {currentUser.name}
            </div>
            <div className="text-[11px] text-slate-400 capitalize">
              {currentUser.role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
