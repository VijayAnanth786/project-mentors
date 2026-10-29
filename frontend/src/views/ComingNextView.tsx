import React from 'react';
import { Bell, CalendarDays, BookOpen, Inbox } from 'lucide-react';
import { EmptyState } from '../components/shared';

interface EmptyPageConfig {
  pageTitle: string;
  pageSubtitle: string;
  sectionHeader: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: React.ElementType;
}

const configs: Record<string, EmptyPageConfig> = {
  notifications: {
    pageTitle: 'Notifications & Announcements',
    pageSubtitle: 'Stay up to date with project feedback, meeting alerts, and college announcements.',
    sectionHeader: 'System Notifications',
    emptyTitle: 'No new notifications',
    emptyDescription: "You're all caught up!",
    icon: Bell
  },
  timeline: {
    pageTitle: 'Project Timeline',
    pageSubtitle: 'Milestones, sprint deadlines, and delivery schedules.',
    sectionHeader: 'Project Milestones',
    emptyTitle: 'No timeline milestones',
    emptyDescription: 'You have no scheduled milestones at this time!',
    icon: CalendarDays
  },
  reviews: {
    pageTitle: 'Progress Reviews',
    pageSubtitle: 'Weekly progress evaluations and faculty mentor feedback.',
    sectionHeader: 'Review Records',
    emptyTitle: 'No review history',
    emptyDescription: 'You have no reviews recorded at this time!',
    icon: BookOpen
  }
};

export const ComingNextView: React.FC<{ title?: string }> = ({ title = 'notifications' }) => {
  const key = title.toLowerCase().trim();
  const config = configs[key] || {
    pageTitle: key.charAt(0).toUpperCase() + key.slice(1),
    pageSubtitle: 'Stay up to date with the latest project updates.',
    sectionHeader: `${key} Details`,
    emptyTitle: `No ${key} records`,
    emptyDescription: 'There is no information to display at this time.',
    icon: Inbox
  };

  const Icon = config.icon;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{config.pageTitle}</h1>
        <p className="text-xs text-slate-500 mt-1">{config.pageSubtitle}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {config.sectionHeader}
        </h2>
        <EmptyState
          title={config.emptyTitle}
          description={config.emptyDescription}
          icon={Icon}
        />
      </section>
    </div>
  );
};