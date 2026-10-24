import React, { useState } from 'react';
import {
  Users,
  FolderKanban,
  FileCheck2,
  CalendarDays,
  Bell,
  UserCircle,
  Plus,
  Search,
  ExternalLink,
  Github,
  Clock,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useFetch } from '../hooks/useData';
import { api } from '../api/client';
import {
  DataTable,
  EmptyState,
  LoadingState,
  ErrorState,
  Modal,
  ProgressBar,
  StatusBadge,
  FormField
} from '../components/shared';
import { MentorTeamDetails } from './MentorTeamDetails';

// -------------------------------------------------------------
// 1. MENTOR TEAMS VIEW
// -------------------------------------------------------------
export const MentorTeamsView: React.FC = () => {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: teams, loading, error, refetch } = useFetch(() => api.mentor.getTeams(), []);

  const filtered = (teams || []).filter(
    (t: any) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.project_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.leader_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Assigned Teams</h1>
          <p className="text-xs text-slate-500 mt-1">
            Teams currently under your mentorship and technical supervision.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search team or student..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading your assigned teams..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((team: any) => (
            <div
              key={team.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{team.name}</h3>
                    <p className="text-xs text-slate-400 font-medium">{team.department} • {team.year_cohort}</p>
                  </div>
                  <StatusBadge status={team.project_status || 'ON_TRACK'} />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Project</p>
                  <p className="text-xs font-bold text-slate-800 line-clamp-1">{team.project_title || 'No Project Assigned'}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{team.project_description || 'No description provided'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Sprint Completion</span>
                    <span>{team.project_progress || 0}%</span>
                  </div>
                  <ProgressBar value={team.project_progress || 0} size="sm" />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={team.leader_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                    alt={team.leader_name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <div className="text-[11px]">
                    <span className="font-bold text-slate-800 block leading-tight">{team.leader_name}</span>
                    <span className="text-slate-400 font-medium">{team.member_count} members</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTeamId(team.id)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No teams assigned yet"
          description="Your assigned teams will appear here once the admin allocates them."
          icon={Users}
        />
      )}

      {selectedTeamId && (
        <MentorTeamDetails
          teamId={selectedTeamId}
          open={Boolean(selectedTeamId)}
          onClose={() => setSelectedTeamId(null)}
        />
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 2. MENTOR PROJECTS VIEW
// -------------------------------------------------------------
export const MentorProjectsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const { data: projects, loading, error, refetch } = useFetch(
    () => api.mentor.getProjects({ search: search || undefined, status }),
    [search, status]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mentored Projects</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track milestones, code repositories, and technical deliverables.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="ON_TRACK">On Track</option>
            <option value="NEEDS_ATTENTION">Needs Attention</option>
            <option value="DELAYED">Delayed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading projects..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : projects && projects.length > 0 ? (
        <DataTable>
          <thead>
            <tr className="text-xs font-bold text-slate-500 bg-slate-50/50">
              <th className="px-5 py-3.5">Project Title</th>
              <th className="px-5 py-3.5">Team & Leader</th>
              <th className="min-w-40 px-5 py-3.5">Progress</th>
              <th className="px-5 py-3.5">Tech Stack</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Repository</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((p: any) => (
              <tr key={p.id} className="text-sm hover:bg-slate-50/40 transition-colors">
                <td className="px-5 py-4">
                  <div className="font-bold text-slate-900">{p.title}</div>
                  <div className="text-xs text-slate-500 line-clamp-1 max-w-xs">{p.description}</div>
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="font-bold text-slate-800 block">{p.team_name}</span>
                  <span className="text-xs text-slate-400">Leader: {p.leader_name}</span>
                </td>
                <td className="min-w-40 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={p.progress} />
                    <span className="text-xs font-bold text-slate-600">{p.progress}%</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {p.techStack?.map((t: string) => (
                      <span key={t} className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <StatusBadge status={p.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  {p.repo_url ? (
                    <a
                      href={p.repo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>Repo</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState title="No projects match criteria" description="Try clearing search or filters." icon={FolderKanban} />
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 3. MENTOR REVIEWS VIEW
// -------------------------------------------------------------
export const MentorReviewsView: React.FC = () => {
  const { showToast } = useApp();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [feedback, setFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { data: reviews, loading, error, refetch } = useFetch(
    () => api.mentor.getReviews({ status: statusFilter }),
    [statusFilter]
  );

  const handleAction = async (action: 'APPROVE' | 'CHANGES_REQUESTED') => {
    if (!selectedSub) return;
    if (action === 'CHANGES_REQUESTED' && !feedback.trim()) {
      showToast('Please provide feedback explaining the changes required.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await api.mentor.submitReview(selectedSub.id, {
        action,
        feedback: feedback.trim()
      });
      showToast(
        action === 'APPROVE'
          ? 'Weekly submission marked as Reviewed & Approved!'
          : 'Changes requested from team.',
        'success'
      );
      setSelectedSub(null);
      setFeedback('');
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to submit review.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Progress Reviews</h1>
          <p className="text-xs text-slate-500 mt-1">
            Evaluate weekly student sprint reports, verify attachments, and request improvements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="review-status-filter" className="text-xs font-bold text-slate-500">
            Filter Status:
          </label>
          <select
            id="review-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Submissions</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Fetching submissions for review..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : reviews && reviews.length > 0 ? (
        <DataTable>
          <thead>
            <tr className="text-xs font-bold text-slate-500 bg-slate-50/50">
              <th className="px-5 py-3.5">Team & Project</th>
              <th className="px-5 py-3.5">Week</th>
              <th className="px-5 py-3.5">Submission Date</th>
              <th className="px-5 py-3.5">Work Summary</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reviews.map((r: any) => (
              <tr key={r.id} className="text-sm hover:bg-slate-50/40 transition-colors">
                <td className="whitespace-nowrap px-5 py-4">
                  <div className="font-bold text-slate-900">{r.team_name}</div>
                  <div className="text-xs text-slate-500">{r.project_title}</div>
                </td>
                <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-800">
                  Week {r.week}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                  {r.date}
                </td>
                <td className="px-5 py-4 text-xs text-slate-600 max-w-sm line-clamp-2">
                  {r.work_completed}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <StatusBadge status={r.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <button
                    onClick={() => {
                      setSelectedSub(r);
                      setFeedback(r.feedback || '');
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    {r.status === 'PENDING' ? 'Review' : 'View / Edit'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState
          title="No submissions found"
          description="There are currently no submissions matching this filter."
          icon={FileCheck2}
        />
      )}

      {/* Review Modal */}
      {selectedSub && (
        <Modal
          open={Boolean(selectedSub)}
          title={`Review: ${selectedSub.team_name} (Week ${selectedSub.week})`}
          onClose={() => setSelectedSub(null)}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Metadata */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <span className="text-slate-400 block text-[11px]">Project Deliverable</span>
                <span className="font-extrabold text-slate-900 text-sm">{selectedSub.project_title}</span>
              </div>
              <StatusBadge status={selectedSub.status} />
            </div>

            {/* Work Completed */}
            <div>
              <label className="font-bold text-slate-800 block mb-1">Work Completed:</label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 whitespace-pre-line">
                {selectedSub.work_completed}
              </div>
            </div>

            {/* Blockers */}
            {selectedSub.blockers && (
              <div>
                <label className="font-bold text-rose-700 block mb-1">Reported Blockers:</label>
                <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl text-rose-700">
                  {selectedSub.blockers}
                </div>
              </div>
            )}

            {/* Repository & Attachments */}
            <div className="flex flex-wrap gap-3 items-center pt-1">
              {selectedSub.repo_url && (
                <a
                  href={selectedSub.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition-colors"
                >
                  <Github className="w-4 h-4" />
                  <span>Verify Branch / PR</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}

              {selectedSub.attachments?.map((f: any, idx: number) => (
                <a
                  key={idx}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>{f.name}</span>
                </a>
              ))}
            </div>

            {/* Feedback Input */}
            <FormField label="Mentor Feedback & Suggestions:" required={true}>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Write specific feedback, code review comments, or required changes..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </FormField>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAction('CHANGES_REQUESTED')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Request Changes</span>
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAction('APPROVE')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Reviewed & Approved</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 4. MENTOR MEETINGS VIEW
// -------------------------------------------------------------
export const MentorMeetingsView: React.FC = () => {
  const { showToast } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [teamId, setTeamId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [linkOrLocation, setLinkOrLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const { data: meetings, loading, error, refetch } = useFetch(() => api.mentor.getMeetings(), []);
  const { data: teams } = useFetch(() => api.mentor.getTeams(), []);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId || !title || !date || !time || !linkOrLocation) {
      setFormError('Please complete all required fields.');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (date < todayStr) {
      setFormError('Meeting date cannot be in the past.');
      return;
    }

    setFormError('');
    setSubmitting(true);

    try {
      await api.mentor.scheduleMeeting({
        teamId,
        title,
        date,
        time,
        linkOrLocation,
        notes
      });
      showToast('Meeting scheduled and team members notified!', 'success');
      setIsModalOpen(false);
      setTitle('');
      setDate('');
      setTime('');
      setLinkOrLocation('');
      setNotes('');
      refetch();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to schedule meeting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mentorship Meetings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Schedule review sessions, technical check-ins, and demo evaluations.
          </p>
        </div>

        <button
          onClick={() => {
            if (teams && teams.length > 0 && !teamId) setTeamId(teams[0].id);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Meeting</span>
        </button>
      </div>

      {loading ? (
        <LoadingState message="Loading scheduled meetings..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : meetings && meetings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {meetings.map((m: any) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{m.title}</h3>
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block mt-1">
                    {m.team_name}
                  </span>
                </div>
                <StatusBadge status={m.status} />
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-800">{m.date} at {m.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {m.link_or_location.startsWith('http') ? (
                    <a
                      href={m.link_or_location}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 font-bold hover:underline truncate"
                    >
                      Join Meeting Link
                    </a>
                  ) : (
                    <span className="truncate">{m.link_or_location}</span>
                  )}
                </div>
              </div>

              {m.notes && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg">
                  {m.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No meetings scheduled"
          description="Use the button above to schedule your first review session."
          icon={CalendarDays}
        />
      )}

      {/* Schedule Meeting Modal */}
      <Modal
        open={isModalOpen}
        title="Schedule Mentorship Meeting"
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSchedule} className="space-y-4 text-xs font-semibold">
          <FormField label="Assigned Team" required={true}>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {teams?.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.project_title || 'No Project'})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Session Title" required={true}>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint 4 Architecture Review"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" required={true}>
              <input
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </FormField>

            <FormField label="Time" required={true}>
              <input
                type="text"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. 10:30 AM"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </FormField>
          </div>

          <FormField label="Meeting Link or Physical Location" required={true}>
            <input
              type="text"
              required
              value={linkOrLocation}
              onChange={(e) => setLinkOrLocation(e.target.value)}
              placeholder="e.g. https://meet.google.com/xyz or Room 302"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </FormField>

          <FormField label="Agenda / Notes (Optional)">
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Topics to discuss or preparation expected from students..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </FormField>

          {formError && (
            <p className="text-rose-600 text-xs font-semibold">{formError}</p>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarDays className="w-3.5 h-3.5" />}
              <span>Schedule Session</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// -------------------------------------------------------------
// 5. MENTOR NOTIFICATIONS VIEW
// -------------------------------------------------------------
export const MentorNotificationsView: React.FC = () => {
  const { showToast } = useApp();
  const { data, loading, error, refetch } = useFetch(() => api.mentor.getNotifications(), []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.mentor.markNotificationRead(id);
      showToast('Notification marked as read', 'success');
      refetch();
    } catch {
      // handled
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notifications & Announcements</h1>
        <p className="text-xs text-slate-500 mt-1">
          Stay up to date with student submissions, meeting updates, and college announcements.
        </p>
      </div>

      {loading ? (
        <LoadingState message="Loading notifications..." />
      ) : error || !data ? (
        <ErrorState message={error || 'Unable to load notifications.'} onRetry={refetch} />
      ) : (
        <div className="space-y-6">
          {/* Institutional Announcements */}
          {data.announcements && data.announcements.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Institutional Announcements
              </h2>
              <div className="space-y-3">
                {data.announcements.map((ann: any) => (
                  <div
                    key={ann.id}
                    className="p-5 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-white border border-blue-100 rounded-2xl shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-slate-900">{ann.title}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Audience: {ann.audience}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{ann.message}</p>
                    <span className="text-[10px] text-slate-400 font-medium block pt-1">
                      Posted on {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Activity Notifications */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              System Notifications
            </h2>
            {data.notifications && data.notifications.length > 0 ? (
              <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                {data.notifications.map((n: any) => (
                  <div key={n.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{n.title}</span>
                        {n.is_read === 0 && (
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{n.message}</p>
                      <span className="text-[10px] text-slate-400 block">{new Date(n.created_at).toLocaleString()}</span>
                    </div>

                    {n.is_read === 0 && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No new notifications" description="You're all caught up!" icon={Bell} />
            )}
          </section>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 6. MENTOR PROFILE VIEW
// -------------------------------------------------------------
export const MentorProfileView: React.FC = () => {
  const { currentUser, showToast } = useApp();
  const [name, setName] = useState(currentUser.name || '');
  const [department, setDepartment] = useState(currentUser.department || 'Computer Science');
  const [title, setTitle] = useState('Associate Professor');
  const [bio, setBio] = useState('Specializing in AI/ML, Distributed Systems, and Full-Stack Engineering.');
  const [phone, setPhone] = useState('+91 98401 23456');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.mentor.updateProfile({
        name,
        department,
        title,
        bio,
        phone
      });
      showToast('Profile information persisted successfully.', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mentor Profile</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your academic credentials and faculty contact information.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80'}
              alt={currentUser.name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/20"
            />
            <div>
              <p className="text-base font-black text-slate-900">{currentUser.name}</p>
              <p className="text-xs text-slate-400">{currentUser.email}</p>
              <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Role: Faculty Mentor
              </span>
            </div>
          </div>

          <FormField label="Full Name" required={true}>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Academic Department" required={true}>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </FormField>

            <FormField label="Faculty Title / Designation">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </FormField>
          </div>

          <FormField label="Contact Phone">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </FormField>

          <FormField label="Professional Bio">
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </FormField>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};