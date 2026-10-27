import React from 'react';
import { Bell, CalendarDays, FileCheck2, Inbox } from 'lucide-react';

interface EmptyViewConfig {
  eyebrow: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
}

const emptyConfigs: Record<string, EmptyViewConfig> = {
  notifications: {
    eyebrow: 'SYSTEM NOTIFICATIONS',
    icon: Bell,
    title: 'No new notifications',
    subtitle: "You're all caught up!"
  },
  timeline: {
    eyebrow: 'PROJECT TIMELINE',
    icon: CalendarDays,
    title: 'No timeline milestones',
    subtitle: 'You have no scheduled milestones at this time!'
  },
  reviews: {
    eyebrow: 'PROGRESS REVIEWS',
    icon: FileCheck2,
    title: 'No review records',
    subtitle: 'You have no reviews recorded at this time!'
  }
};

export const ComingNextView: React.FC<{ title?: string }> = ({ title = 'notifications' }) => {
  const key = title.toLowerCase().trim();
  const config = emptyConfigs[key] || {
    eyebrow: key.toUpperCase(),
    icon: Inbox,
    title: `No ${key}`,
    subtitle: 'There is no content to display at this time.'
  };

  const Icon = config.icon;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-3">
      <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
        {config.eyebrow}
      </div>
      <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 sm:p-20 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-2xs">
          <Icon className="w-5 h-5 text-slate-400" />
        </div>
        <h3 className="text-base font-bold text-slate-800 tracking-tight">{config.title}</h3>
        <p className="mt-1.5 text-xs text-slate-400 font-medium">{config.subtitle}</p>
      </div>
    </div>
  );
};