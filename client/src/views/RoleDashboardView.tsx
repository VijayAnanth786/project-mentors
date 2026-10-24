import React from 'react';
import { CalendarDays, ClipboardCheck, FolderKanban, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { activeUserCount, averageProgress, overdueSubmissionCount, pendingReviewCount, teamsWithoutMentors, upcomingMeetingCount } from '../data/selectors';
import { DataTable, EmptyState, ProgressBar, StatusBadge, SummaryCard } from '../components/shared';

export const RoleDashboardView: React.FC = () => {
  const { currentUser, dashboardState, setActiveView } = useApp();
  const isAdmin = currentUser.role === 'admin';
  const teams = currentUser.role === 'mentor' ? dashboardState.teams.filter((team) => team.mentorId === 'mentor-vetri') : dashboardState.teams;
  const metrics = isAdmin
    ? [{ label: 'Active users', value: activeUserCount(dashboardState), icon: Users }, { label: 'Teams', value: dashboardState.teams.length, icon: FolderKanban }, { label: 'Teams without mentors', value: teamsWithoutMentors(dashboardState).length, icon: Users }, { label: 'Average progress', value: `${averageProgress(dashboardState)}%`, icon: ClipboardCheck }]
    : [{ label: 'My teams', value: teams.length, icon: Users }, { label: 'Pending reviews', value: pendingReviewCount(dashboardState), icon: ClipboardCheck }, { label: 'Upcoming meetings', value: upcomingMeetingCount(dashboardState), icon: CalendarDays }, { label: 'Overdue submissions', value: overdueSubmissionCount(dashboardState), icon: FolderKanban }];

  return <div className="mx-auto max-w-7xl space-y-7 p-5 sm:p-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">{isAdmin ? 'Admin foundation' : 'Mentor foundation'}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Good morning, {currentUser.name}</h1><p className="mt-2 text-sm text-slate-500">A shared preview surface for the next dashboard modules.</p></div><span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700">UI preview only</span></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <SummaryCard key={metric.label} {...metric} />)}</div>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.8fr]">
      <section><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-900">{isAdmin ? 'All teams' : 'My teams'}</h2><p className="mt-1 text-sm text-slate-500">Progress and mentor assignment at a glance.</p></div><button onClick={() => setActiveView(isAdmin ? '/admin/teams' : '/mentor/teams')} className="text-xs font-bold text-blue-600 hover:underline">View all</button></div><DataTable><thead><tr className="text-xs font-bold text-slate-500"><th className="px-5 py-4">Team</th><th className="px-5 py-4">Project</th><th className="px-5 py-4">Progress</th><th className="px-5 py-4">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{teams.map((team) => { const project = dashboardState.projects.find((item) => item.id === team.projectId); return <tr key={team.id} className="text-sm"><td className="whitespace-nowrap px-5 py-4 font-bold text-slate-800">{team.name}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{project?.title}</td><td className="min-w-36 px-5 py-4"><div className="flex items-center gap-2"><ProgressBar value={project?.progress || 0} /><span className="text-xs font-bold text-slate-500">{project?.progress}%</span></div></td><td className="whitespace-nowrap px-5 py-4"><StatusBadge status={team.status} /></td></tr>; })}</tbody></DataTable></section>
      <section><div className="mb-4"><h2 className="text-lg font-black text-slate-900">Recent activity</h2><p className="mt-1 text-sm text-slate-500">Latest updates from the workspace.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{dashboardState.activityEvents.slice(0, 5).map((event) => <div key={event.id} className="border-b border-slate-100 py-3 last:border-0 last:pb-0 first:pt-0"><p className="text-xs font-semibold leading-relaxed text-slate-700">{event.text}</p><p className="mt-1 text-[11px] text-slate-400">{new Date(event.timestamp).toLocaleDateString()}</p></div>)}</div></section>
    </div>
    {teams.length === 0 && <EmptyState title="No teams assigned" description="Teams assigned to this role will appear here." />}
  </div>;
};