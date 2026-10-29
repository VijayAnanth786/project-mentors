import React, { useState } from 'react';
import { Menu, Mountain, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { navConfig, logoutNavItem, pathToView } from './navConfig';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, currentUser, logout } = useApp();
  const [open, setOpen] = useState(false);
  const items = navConfig[currentUser.role] || navConfig.student;

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setActiveView(pathToView[path] || path);
    setOpen(false);
  };

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed left-4 top-[4.75rem] z-40 rounded-lg bg-[#0a1226] p-2 text-white shadow-lg md:hidden cursor-pointer"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop overlay */}
      {open && (
        <button
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden cursor-default"
          onClick={() => setOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`${
          open ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-16 left-0 z-50 flex w-64 flex-col justify-between bg-[#0a1226] p-4 text-slate-300 transition-transform md:static md:min-h-[calc(100vh-4rem)] md:translate-x-0 shrink-0`}
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between px-2 md:hidden">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Menu
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-1" aria-label={`${currentUser.role} navigation`}>
            {items.map(({ label, path, icon: Icon }) => {
              const viewKey = pathToView[path] || path;
              const isActive = activeView === viewKey;

              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex w-full items-center space-x-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 font-semibold text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4 border-t border-slate-800/80 pt-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <logoutNavItem.icon className="h-4 w-4 shrink-0" />
            <span>Sign Out</span>
          </button>

          <div className="px-2 pt-2 text-center select-none">
            <p className="text-[11px] italic text-slate-400">
              "Small steps create big progress."
            </p>
            <div className="mt-2 flex justify-center text-blue-500/30">
              <Mountain className="h-7 w-7" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
