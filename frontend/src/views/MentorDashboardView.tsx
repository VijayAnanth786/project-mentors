import React, { useState } from 'react';
import { CalendarDays, ClipboardCheck, FolderKanban, Users, Clock, AlertTriangle, ArrowRight, KeyRound, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useFetch } from '../hooks/useData';
import { api } from '../api/client';
import { DataTable, EmptyState, LoadingState, ErrorState, Modal, ProgressBar, StatusBadge, SummaryCard, WelcomeBanner } from '../components/shared';
import { MentorTeamDetails } from './MentorTeamDetails';
import { pathToView } from '../components/navConfig';

export const MentorDashboardView: React.FC = () => {
  const { currentUser, setCurrentUser, setActiveView, showToast } = useApp();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // In-Dashboard Temporary Password Update State
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState<boolean>(
    Boolean((currentUser as any)?.mustChangePassword)
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswordError('');
    setPasswordUpdating(true);
    try {
      const res = await api.auth.changePassword({
        currentPassword: '',
        newPassword: newPassword.trim()
      });
      if (res.success) {
        setPasswordSuccess(true);
        showToast('Password updated successfully! Your account is now secured.', 'success');
        const updated = { ...currentUser, mustChangePassword: false };
        setCurrentUser(updated);
        localStorage.setItem('pm_user', JSON.stringify(updated));
        setTimeout(() => setShowPasswordChangeModal(false), 2000);
      } else {
        setPasswordError(res.message || 'Failed to update password.');
      }
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message || err?.message || 'Failed to update password.');
    } finally {
      setPasswordUpdating(false);
    }
  };

  const { data, loading, error, refetch } = useFetch(() => api.mentor.getDashboard(), []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setActiveView(pathToView[path] || path);
  };

  if (loading) {
    return <LoadingState message="Loading your assigned teams and progress reviews..." />;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl p-6 sm:p-8">
        <ErrorState message={error || 'Unable to load dashboard data.'} onRetry={refetch} />
      </div>
    );
  }

  const { summary, assignedTeams, upcomingMeetings, overdueSubmissions, recentActivity } = data;
  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Mentor';

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-5 sm:p-8">
      {/* Welcome Banner */}
      <WelcomeBanner
        title={`Hello, ${firstName}! 👋`}
        description={
          summary.pendingReviewsCount > 0
            ? `You have ${summary.pendingReviewsCount} progress submission${summary.pendingReviewsCount === 1 ? '' : 's'} waiting for review.`
            : 'All student submissions are up to date. Keep up the great mentorship!'
        }
        action={
          <button
            onClick={() => navigate('/mentor/reviews')}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Review Submissions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      />

      {/* Temporary Password Change Alert Banner */}
      {showPasswordChangeModal && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-sm space-y-3.5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5 text-amber-950 font-black text-sm">
              <KeyRound className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Set Your Permanent Password</span>
            </div>
            <button
              onClick={() => setShowPasswordChangeModal(false)}
              className="p-1 rounded-lg hover:bg-amber-100 text-amber-700 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            You signed in using a temporary password. Choose a new personal password below to activate and secure your faculty account.
          </p>

          {passwordSuccess ? (
            <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Password updated successfully! Closing notice...</span>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="password"
                    required
                    placeholder="New Permanent Password (min. 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-amber-300 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    required
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-amber-300 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {passwordError && (
                <p className="text-xs font-semibold text-rose-600">{passwordError}</p>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={passwordUpdating}
                  className="px-5 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{passwordUpdating ? 'Updating Password...' : 'Save New Password'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordChangeModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  Later
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Assigned Teams"
          value={summary.assignedTeamsCount}
          detail="Teams allocated by administrator"
          icon={Users}
        />
        <SummaryCard
          label="Students Guided"
          value={summary.studentsGuidedCount}
          detail="Active students across teams"
          icon={FolderKanban}
        />
        <SummaryCard
          label="Pending Reviews"
          value={summary.pendingReviewsCount}
          detail="Weekly reports awaiting feedback"
          icon={ClipboardCheck}
        />
        <SummaryCard
          label="Upcoming Meetings"
          value={summary.upcomingMeetingsCount}
          detail="Scheduled review sessions"
          icon={CalendarDays}
        />
      </div>

      {/* Two-Column Responsive Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
        {/* Left Column: Assigned Teams & Pending */}
        <div className="space-y-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Assigned Teams</h2>
                <p className="text-xs text-slate-500">Your teams and their latest sprint progress.</p>
              </div>
              <button
                onClick={() => navigate('/mentor/teams')}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                View all teams
              </button>
            </div>

            {assignedTeams && assignedTeams.length > 0 ? (
              <DataTable>
                <thead>
                  <tr className="text-xs font-bold text-slate-500 bg-slate-50/50">
                    <th className="px-5 py-3.5">Team</th>
                    <th className="px-5 py-3.5">Project</th>
                    <th className="min-w-44 px-5 py-3.5">Progress</th>
                    <th className="px-5 py-3.5">Latest Submission</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignedTeams.map((team: any) => (
                    <tr key={team.id} className="text-sm hover:bg-slate-50/40 transition-colors">
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="font-bold text-slate-900">{team.name}</div>
                        <div className="text-xs text-slate-400">Leader: {team.leaderName}</div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700 font-medium">
                        {team.project?.title || 'No project'}
                      </td>
                      <td className="min-w-44 px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <ProgressBar value={team.project?.progress || 0} />
                          <span className="text-xs font-bold text-slate-600">
                            {team.project?.progress || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {team.latestSubmission ? (
                          <StatusBadge status={team.latestSubmission.status} />
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">No submissions</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedTeamId(team.id)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          View Team
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            ) : (
              <EmptyState
                title="No teams assigned yet"
                description="Your assigned teams will appear here once the admin allocates them."
                icon={Users}
              />
            )}
          </section>
        </div>

        {/* Right Column: Upcoming Meetings, Overdue Submissions, Recent Activity */}
        <div className="space-y-6">
          {/* Upcoming Meetings */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <span>Upcoming Meetings</span>
              </h3>
              <button
                onClick={() => navigate('/mentor/meetings')}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Schedule
              </button>
            </div>

            {upcomingMeetings && upcomingMeetings.length > 0 ? (
              <div className="space-y-3">
                {upcomingMeetings.map((meeting: any) => (
                  <div
                    key={meeting.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{meeting.title}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {meeting.team_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{meeting.date} • {meeting.time}</span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-600 truncate">
                      {meeting.link_or_location.startsWith('http') ? (
                        <a
                          href={meeting.link_or_location}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          Join Meeting Link
                        </a>
                      ) : (
                        <span>📍 {meeting.link_or_location}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">No upcoming meetings scheduled.</p>
            )}
          </section>

          {/* Overdue Submissions */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Overdue Submissions</span>
            </h3>

            {overdueSubmissions && overdueSubmissions.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {overdueSubmissions.map((sub: any) => (
                  <div key={sub.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{sub.team_name}</p>
                      <p className="text-[11px] text-rose-600 font-medium">
                        Week {sub.week} • Missed {sub.date}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedTeamId(sub.team_id)}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      View Team
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">No overdue submissions.</p>
            )}
          </section>

          {/* Recent Student Activity */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-900 mb-3">Recent Student Activity</h3>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentActivity.map((event: any) => (
                  <div key={event.id} className="py-2.5">
                    <p className="text-xs font-semibold text-slate-700 leading-snug">
                      {event.description}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {new Date(event.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">No recent activity recorded.</p>
            )}
          </section>
        </div>
      </div>

      {/* Team Details Modal */}
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