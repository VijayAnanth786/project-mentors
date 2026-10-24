import React, { useMemo, useState } from 'react';
import { ClipboardList, FolderKanban, UserPlus, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { activeTeamCount, mentorsWithoutTeams, overdueTeams, teamsWithoutMentors, totalStudents } from '../data/selectors';
import { MockTeam } from '../data/mockData';
import { DataTable, EmptyState, Modal, StatusBadge, SummaryCard, Toast, ConfirmDialog, FormField } from '../components/shared';
import { MentorTeamDetails } from './MentorTeamDetails';
import { pathToView } from '../components/navConfig';

const navigate = (path: string, setActiveView: (view: string) => void) => {
  window.history.pushState({}, '', path);
  setActiveView(pathToView[path] || path);
};

export const AdminDashboardView: React.FC = () => {
  const { dashboardState, setActiveView } = useApp();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [mentorFilter, setMentorFilter] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState<MockTeam | null>(null);
  const [assignTeam, setAssignTeam] = useState<MockTeam | null>(null);
  const [toast, setToast] = useState('');
  const attention = useMemo(() => ({
    unassigned: teamsWithoutMentors(dashboardState),
    noTeams: mentorsWithoutTeams(dashboardState),
    overdue: overdueTeams(dashboardState)
  }), [dashboardState]);

  const filteredTeams = dashboardState.teams.filter((team) => {
    const project = dashboardState.projects.find((item) => item.id === team.projectId);
    const mentor = dashboardState.mentors.find((item) => item.id === team.mentorId);
    const mentorName = dashboardState.users.find((item) => item.id === mentor?.userId)?.name || '';
    return `${team.name} ${project?.title || ''} ${mentorName}`.toLowerCase().includes(search.toLowerCase())
      && (status === 'all' || team.status === status)
      && (mentorFilter === 'all' || (mentorFilter === 'unassigned' ? !team.mentorId : team.mentorId === mentorFilter));
  });
  const teamLeader = (team: MockTeam) => dashboardState.users.find((user) => user.id === team.leaderId)?.name || 'Unassigned';
  const teamMentor = (team: MockTeam) => {
    const mentor = dashboardState.mentors.find((item) => item.id === team.mentorId);
    return dashboardState.users.find((user) => user.id === mentor?.userId)?.name || 'No mentor';
  };

  return <div className="mx-auto max-w-7xl space-y-7 p-5 sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white p-6 shadow-sm">
      <div><h1 className="text-2xl font-black tracking-tight text-slate-900">Welcome, Admin! <span aria-hidden="true">👋</span></h1><p className="mt-2 text-sm font-medium text-slate-500">Manage students, mentors, teams, and projects.</p></div>
      <div className="flex gap-2"><button onClick={() => navigate('/admin/mentors', setActiveView)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700">Add mentor</button><button onClick={() => setAssignTeam(attention.unassigned[0] || null)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white">Assign mentor</button></div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Total students" value={totalStudents(dashboardState)} icon={Users} /><SummaryCard label="Total mentors" value={dashboardState.mentors.length} icon={UserPlus} /><SummaryCard label="Active teams" value={activeTeamCount(dashboardState)} icon={FolderKanban} /><SummaryCard label="Teams without mentors" value={attention.unassigned.length} icon={ClipboardList} /></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
      <section><div className="mb-4"><h2 className="text-lg font-black text-slate-900">Team &amp; project overview</h2><p className="mt-1 text-sm text-slate-500">Search, filter, and manage every project team.</p></div><div className="mb-4 flex flex-wrap gap-3"><label className="flex-1"><span className="sr-only">Search teams and projects</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search team, project, or mentor" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500" /></label><select aria-label="Filter teams by status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">All statuses</option><option value="ON_TRACK">Active / on track</option><option value="NEEDS_ATTENTION">Needs attention</option><option value="DELAYED">Delayed</option></select><select aria-label="Filter teams by mentor" value={mentorFilter} onChange={(event) => setMentorFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">All mentor assignments</option><option value="unassigned">No mentor</option>{dashboardState.mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{dashboardState.users.find((user) => user.id === mentor.userId)?.name}</option>)}</select></div><DataTable><thead><tr className="text-xs font-bold text-slate-500"><th className="px-5 py-4">Team</th><th className="px-5 py-4">Project</th><th className="px-5 py-4">Leader</th><th className="px-5 py-4">Mentor</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredTeams.map((team) => { const project = dashboardState.projects.find((item) => item.id === team.projectId); return <tr key={team.id} className="text-sm"><td className="whitespace-nowrap px-5 py-4 font-bold text-slate-800">{team.name}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{project?.title}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{teamLeader(team)}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{teamMentor(team)}</td><td className="whitespace-nowrap px-5 py-4"><StatusBadge status={team.mentorId ? 'ACTIVE' : team.status} /></td><td className="whitespace-nowrap px-5 py-4"><button onClick={() => team.mentorId ? setSelectedTeam(team) : setAssignTeam(team)} className="text-xs font-bold text-blue-600 hover:underline">{team.mentorId ? 'Manage' : 'Assign'}</button></td></tr>; })}</tbody></DataTable>{!filteredTeams.length && <div className="mt-4"><EmptyState title="No matching teams" description="Try changing the search or filters." /></div>}</section>
      <div className="space-y-6"><AttentionCard title="Needs attention" empty={!attention.unassigned.length && !attention.noTeams.length && !attention.overdue.length}>{attention.unassigned.map((team) => <AttentionRow key={team.id} title={`${team.name} has no mentor`} action="Assign" onClick={() => setAssignTeam(team)} />)}{attention.noTeams.map((mentor) => <AttentionRow key={mentor.id} title={`${dashboardState.users.find((user) => user.id === mentor.userId)?.name} has no teams`} action="View" onClick={() => navigate('/admin/mentors', setActiveView)} />)}{attention.overdue.map((team) => <AttentionRow key={team.id} title={`${team.name} has overdue work`} action="View" onClick={() => setSelectedTeam(team)} />)}</AttentionCard><AttentionCard title="Recent activity" empty={!dashboardState.activityEvents.length}>{dashboardState.activityEvents.slice(0, 6).map((event) => <div key={event.id} className="border-b border-slate-100 py-3 last:border-0"><p className="text-xs font-semibold text-slate-700">{event.text}</p><p className="mt-1 text-[11px] text-slate-400">{new Date(event.timestamp).toLocaleString()}</p></div>)}</AttentionCard></div>
    </div>
    <section><div className="mb-4"><h2 className="text-lg font-black text-slate-900">Mentor assignments</h2><p className="mt-1 text-sm text-slate-500">Current workload across active mentors.</p></div><DataTable><thead><tr className="text-xs font-bold text-slate-500"><th className="px-5 py-4">Mentor</th><th className="px-5 py-4">Department</th><th className="px-5 py-4">Assigned teams</th><th className="px-5 py-4">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{dashboardState.mentors.map((mentor) => { const user = dashboardState.users.find((item) => item.id === mentor.userId); return <tr key={mentor.id} className="text-sm"><td className="px-5 py-4 font-bold text-slate-800">{user?.name}</td><td className="px-5 py-4 text-slate-600">{mentor.department}</td><td className="px-5 py-4 text-slate-600">{mentor.teamIds.length} teams assigned</td><td className="px-5 py-4"><StatusBadge status={user?.status || 'inactive'} /></td></tr>; })}</tbody></DataTable></section>
    <Modal open={Boolean(selectedTeam)} title={selectedTeam?.name || 'Team details'} onClose={() => setSelectedTeam(null)}>{selectedTeam && <MentorTeamDetails team={selectedTeam} />}</Modal><AdminAssignMentorModal team={assignTeam} onClose={() => setAssignTeam(null)} onSuccess={setToast} /><Toast message={toast} onDismiss={() => setToast('')} />
  </div>;
};

const AttentionCard: React.FC<{ title: string; empty: boolean; children: React.ReactNode }> = ({ title, empty, children }) => <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-slate-900">{title}</h2>{empty ? <p className="mt-4 text-sm text-slate-500">Nothing needs attention.</p> : <div className="mt-2">{children}</div>}</section>;
const AttentionRow: React.FC<{ title: string; action: string; onClick: () => void }> = ({ title, action, onClick }) => <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"><span className="text-xs font-semibold text-slate-700">{title}</span><button onClick={onClick} className="shrink-0 text-xs font-bold text-blue-600 hover:underline">{action}</button></div>;

export const AdminAssignMentorModal: React.FC<{ team: MockTeam | null; onClose: () => void; onSuccess: (message: string) => void }> = ({ team, onClose, onSuccess }) => { const { dashboardState, assignMentor } = useApp(); const [mentorId, setMentorId] = useState(team?.mentorId || ''); const [confirm, setConfirm] = useState(false); const activeMentors = dashboardState.mentors.filter((mentor) => dashboardState.users.find((user) => user.id === mentor.userId)?.status === 'active'); React.useEffect(() => setMentorId(team?.mentorId || ''), [team]); const save = () => { if (!team || !mentorId) return; assignMentor(team.id, mentorId); setConfirm(false); onClose(); onSuccess(`${team.name} assigned successfully in demo mode.`); }; const submit = (event: React.FormEvent) => { event.preventDefault(); if (team?.mentorId && team.mentorId !== mentorId) setConfirm(true); else save(); }; return <><Modal open={Boolean(team)} title="Assign mentor" onClose={onClose}>{team && <form onSubmit={submit} className="space-y-4"><FormField label="Select team"><input readOnly value={team.name} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-sm" /></FormField><FormField label="Select mentor"><select required value={mentorId} onChange={(event) => setMentorId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm"><option value="">Choose an active mentor</option>{activeMentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{dashboardState.users.find((user) => user.id === mentor.userId)?.name} — {mentor.teamIds.length} teams assigned</option>)}</select></FormField><button type="submit" className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white">Assign mentor</button></form>}</Modal><ConfirmDialog open={confirm} title="Confirm reassignment" message="This team already has a mentor. Reassign it to the selected mentor?" onCancel={() => setConfirm(false)} onConfirm={save} /></>; };
