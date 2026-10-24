import React, { useState } from 'react';
import {
  Users,
  UserRoundPlus,
  Network,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  ArrowRight,
  UserCheck
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
  StatusBadge,
  SummaryCard,
  WelcomeBanner,
  FormField,
  ConfirmDialog
} from '../components/shared';
import { pathToView } from '../components/navConfig';
import { MentorTeamDetails } from './MentorTeamDetails';

export const AdminDashboardView: React.FC = () => {
  const { setActiveView, showToast } = useApp();

  // Modals & Selection
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [assignModalTeam, setAssignModalTeam] = useState<any | null>(null);
  const [isAddMentorOpen, setIsAddMentorOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Add Mentor Form
  const [newMentorName, setNewMentorName] = useState('');
  const [newMentorEmail, setNewMentorEmail] = useState('');
  const [newMentorDept, setNewMentorDept] = useState('Computer Science');
  const [addMentorError, setAddMentorError] = useState('');
  const [mentorSubmitting, setMentorSubmitting] = useState(false);
  const [createdMentorData, setCreatedMentorData] = useState<any | null>(null);

  // Assign Mentor Form
  const [targetTeamId, setTargetTeamId] = useState('');
  const [targetMentorId, setTargetMentorId] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [reassignConfirm, setReassignConfirm] = useState<{ open: boolean; team: any; newMentorId: string } | null>(null);

  // Live Dashboard Data
  const { data, loading, error, refetch } = useFetch(() => api.admin.getDashboard(), []);
  const { data: mentorsList, refetch: refetchMentors } = useFetch(() => api.admin.getMentors(), []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setActiveView(pathToView[path] || path);
  };

  const handleAddMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMentorName || !newMentorEmail || !newMentorDept) {
      setAddMentorError('All fields are required.');
      return;
    }

    setAddMentorError('');
    setMentorSubmitting(true);

    try {
      const res = await api.admin.addMentor({
        name: newMentorName.trim(),
        email: newMentorEmail.trim(),
        department: newMentorDept.trim()
      });
      showToast('Mentor account created successfully.', 'success');
      setCreatedMentorData(res.data);
      setNewMentorName('');
      setNewMentorEmail('');
      refetch();
      refetchMentors();
    } catch (err: any) {
      setAddMentorError(err?.response?.data?.message || 'Failed to add mentor.');
    } finally {
      setMentorSubmitting(false);
    }
  };

  const executeAssignMentor = async (teamId: string, mentorId: string) => {
    setAssignSubmitting(true);
    try {
      await api.admin.assignMentor(teamId, mentorId || null);
      showToast('Mentor assignment saved successfully!', 'success');
      setIsAssignModalOpen(false);
      setAssignModalTeam(null);
      setReassignConfirm(null);
      refetch();
      refetchMentors();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to assign mentor.', 'error');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const team = data?.teams?.find((t: any) => t.id === targetTeamId) || assignModalTeam;
    if (team?.mentor_id && team.mentor_id !== targetMentorId) {
      // Reassignment requires confirmation
      setReassignConfirm({ open: true, team, newMentorId: targetMentorId });
      return;
    }
    executeAssignMentor(targetTeamId, targetMentorId);
  };

  if (loading) {
    return <LoadingState message="Loading administrative metrics and live system status..." />;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl p-6 sm:p-8">
        <ErrorState message={error || 'Unable to load administrative dashboard.'} onRetry={refetch} />
      </div>
    );
  }

  const { summary, teams, needsAttention, recentActivity, mentorAssignments } = data;

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-5 sm:p-8">
      {/* Welcome Banner */}
      <WelcomeBanner
        title="Welcome, Admin! 👋"
        description="Monitor university student cohorts, faculty mentor allocations, and project deliverables."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setCreatedMentorData(null);
                setIsAddMentorOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <UserRoundPlus className="w-4 h-4 text-blue-600" />
              <span>Add Mentor</span>
            </button>
            <button
              onClick={() => {
                if (teams && teams.length > 0) {
                  const unassigned = teams.find((t: any) => !t.mentor_id) || teams[0];
                  setTargetTeamId(unassigned.id);
                }
                if (mentorsList && mentorsList.length > 0) {
                  const activeM = mentorsList.find((m: any) => m.status === 'active') || mentorsList[0];
                  setTargetMentorId(activeM.id);
                }
                setIsAssignModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Assign Mentor</span>
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Students"
          value={summary.totalStudents}
          detail="Registered in college portal"
          icon={Users}
        />
        <SummaryCard
          label="Total Mentors"
          value={summary.totalMentors}
          detail="Faculty advisors available"
          icon={UserRoundPlus}
        />
        <SummaryCard
          label="Active Teams"
          value={summary.activeTeams}
          detail="Student teams actively working"
          icon={Network}
        />
        <SummaryCard
          label="Teams Without Mentors"
          value={summary.teamsWithoutMentors}
          detail="Need faculty mentor allocation"
          icon={AlertTriangle}
        />
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        {/* Left Column: Team & Project Overview & Mentor Assignments */}
        <div className="space-y-6">
          {/* Team & Project Overview */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Team & Project Overview</h2>
                <p className="text-xs text-slate-500">Live directory of student teams, assigned mentors, and status.</p>
              </div>
              <button
                onClick={() => navigate('/admin/teams')}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                View all teams
              </button>
            </div>

            {teams && teams.length > 0 ? (
              <DataTable>
                <thead>
                  <tr className="text-xs font-bold text-slate-500 bg-slate-50/50">
                    <th className="px-5 py-3.5">Team</th>
                    <th className="px-5 py-3.5">Project</th>
                    <th className="px-5 py-3.5">Leader</th>
                    <th className="px-5 py-3.5">Mentor</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teams.map((t: any) => (
                    <tr key={t.id} className="text-sm hover:bg-slate-50/40 transition-colors">
                      <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">
                        {t.name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700 font-medium">
                        {t.project_title || <span className="text-slate-400">No project</span>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">
                        {t.leader_name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {t.mentor_name ? (
                          <span className="text-xs font-semibold text-slate-800">
                            {t.mentor_name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <StatusBadge status={t.team_status || 'active'} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {t.mentor_id ? (
                          <button
                            onClick={() => setSelectedTeamId(t.id)}
                            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            Manage
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setAssignModalTeam(t);
                              setTargetTeamId(t.id);
                              if (mentorsList && mentorsList.length > 0) {
                                const activeM = mentorsList.find((m: any) => m.status === 'active') || mentorsList[0];
                                setTargetMentorId(activeM.id);
                              }
                              setIsAssignModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Assign
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            ) : (
              <EmptyState title="No teams registered" description="Teams will appear here once registered." icon={Network} />
            )}
          </section>

          {/* Mentor Workload Assignments */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Mentor Workload Distribution</h3>
                <p className="text-xs text-slate-500">Number of active student teams allocated per faculty advisor.</p>
              </div>
              <button
                onClick={() => navigate('/admin/mentors')}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Manage mentors
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {mentorAssignments?.map((m: any) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900 block truncate max-w-[150px]">
                      {m.name}
                    </span>
                    <span className="text-[11px] text-slate-400 block">{m.department}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-blue-600 block">{m.team_count}</span>
                    <span className="text-[10px] text-slate-400 font-medium">teams</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Needs Attention & Recent Activity */}
        <div className="space-y-6">
          {/* Needs Attention */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Needs Attention</span>
            </h3>

            {needsAttention && needsAttention.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {needsAttention.map((item: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.name}</p>
                      <p className="text-[11px] text-amber-700 font-medium">{item.reason}</p>
                    </div>
                    {item.item_type === 'team' ? (
                      <button
                        onClick={() => {
                          setTargetTeamId(item.id);
                          if (mentorsList && mentorsList.length > 0) {
                            const activeM = mentorsList.find((m: any) => m.status === 'active') || mentorsList[0];
                            setTargetMentorId(activeM.id);
                          }
                          setIsAssignModalOpen(true);
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Assign
                      </button>
                    ) : item.item_type === 'mentor' ? (
                      <button
                        onClick={() => navigate('/admin/mentors')}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        View
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedTeamId(item.id)}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        View
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3 text-center">Nothing needs attention.</p>
            )}
          </section>

          {/* Recent Activity */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Recent Activity</span>
            </h3>

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

      {/* Add Mentor Modal */}
      <Modal
        open={isAddMentorOpen}
        title="Add Faculty Mentor"
        onClose={() => {
          setCreatedMentorData(null);
          setIsAddMentorOpen(false);
        }}
      >
        {createdMentorData ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Mentor Account Created in MongoDB Atlas!</span>
              </div>
              <div className="text-xs text-slate-700 space-y-1">
                <p><strong className="text-slate-900">Name:</strong> {createdMentorData.name}</p>
                <p><strong className="text-slate-900">Email:</strong> {createdMentorData.email}</p>
                <p><strong className="text-slate-900">Department:</strong> {createdMentorData.department}</p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-medium space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>One-Time Temporary Password</span>
                </div>
                <div className="p-2.5 bg-white border border-amber-300 rounded font-mono text-sm font-black text-slate-900 select-all tracking-wider text-center">
                  {createdMentorData.temporaryPassword}
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  ⚠️ No invitation email was sent. Please share this temporary password securely with the faculty mentor. The mentor will be prompted to set a new personal password on their first login.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setCreatedMentorData(null);
                  setIsAddMentorOpen(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Done & Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAddMentor} className="space-y-4 text-xs font-semibold">
            <FormField label="Full Name" required={true}>
              <input
                type="text"
                required
                value={newMentorName}
                onChange={(e) => setNewMentorName(e.target.value)}
                placeholder="e.g. Dr. K. Ramesh"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </FormField>

            <FormField label="Institutional Email" required={true}>
              <input
                type="email"
                required
                value={newMentorEmail}
                onChange={(e) => setNewMentorEmail(e.target.value)}
                placeholder="e.g. ramesh@college.edu"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </FormField>

            <FormField label="Department" required={true}>
              <input
                type="text"
                required
                value={newMentorDept}
                onChange={(e) => setNewMentorDept(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </FormField>

            {addMentorError && (
              <p className="text-rose-600 text-xs font-semibold">{addMentorError}</p>
            )}

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsAddMentorOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mentorSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs cursor-pointer"
              >
                {mentorSubmitting ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Assign Mentor Modal */}
      <Modal
        open={isAssignModalOpen}
        title="Assign Faculty Mentor to Team"
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssignModalTeam(null);
        }}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs font-semibold">
          <FormField label="Select Team" required={true}>
            <select
              value={targetTeamId}
              onChange={(e) => setTargetTeamId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {teams?.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.mentor_name ? `(Current: ${t.mentor_name})` : '(No Mentor)'}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Select Active Mentor" required={true}>
            <select
              value={targetMentorId}
              onChange={(e) => setTargetMentorId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {mentorsList
                ?.filter((m: any) => m.status === 'active')
                .map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.team_count || 0} teams assigned ({m.department})
                  </option>
                ))}
            </select>
          </FormField>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsAssignModalOpen(false);
                setAssignModalTeam(null);
              }}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assignSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs cursor-pointer"
            >
              {assignSubmitting ? 'Saving...' : 'Assign Mentor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reassign Confirmation Dialog */}
      {reassignConfirm && (
        <ConfirmDialog
          open={reassignConfirm.open}
          title="Confirm Mentor Reassignment"
          message={`Team "${reassignConfirm.team?.name}" already has an assigned mentor (${reassignConfirm.team?.mentor_name}). Are you sure you want to reassign this team?`}
          confirmLabel="Reassign Mentor"
          onConfirm={() => executeAssignMentor(reassignConfirm.team.id, reassignConfirm.newMentorId)}
          onCancel={() => setReassignConfirm(null)}
        />
      )}

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
