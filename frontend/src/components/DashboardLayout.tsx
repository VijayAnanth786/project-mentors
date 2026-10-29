import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="flex min-h-screen flex-col bg-slate-50"><Navbar /><div className="flex min-h-0 flex-1"><Sidebar /><main className="min-w-0 flex-1 overflow-y-auto">{children}</main></div></div>;