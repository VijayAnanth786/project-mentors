import React, { useState } from 'react';
import {
  Users,
  UserRoundPlus,
  Network,
  FolderKanban,
  ShieldCheck,
  Megaphone,
  BarChart3,
  Settings,
  Search,
  Plus,
  Edit2,
  Power,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Github,
  Clock,
  Save,
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
  FormField,
  ConfirmDialog
} from '../components/shared';
import { MentorTeamDetails } from './MentorTeamDetails';

// -------------------------------------------------------------
// 1. ADMIN STUDENTS VIEW
// -------------------------------------------------------------
export const AdminStudentsView: React.FC = () => {
  const { showToast } = useApp();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [statusConfirm, setStatusConfirm] = useState<{ open: boolean; student: any; targetStatus: 'active' | 'inactive' } | null>(null);

  const { data: students, loading, error, refetch } = useFetch(
    () => api.admin.getStudents({ search: search || undefined, status }),
    [search, status]
  );

  const toggleStudentStatus = async (student: any) => {
    const nextStatus = student.status === 'active' ? 'inactive' : 'active';
    setStatusConfirm({ open: true, student, targetStatus: nextStatus });
  };

  const executeStatusChange = async () => {
    if (!statusConfirm) return;
    try {
      await api.admin.updateStudentStatus(statusConfirm.student.id, statusConfirm.targetStatus);
      showToast(`Student status updated to ${statusConfirm.targetStatus}.`, 'success');
      setStatusConfirm(null);
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update status.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Student Directory</h1>
          <p className="text-xs text-slate-500 mt-1">Manage student enrollments, project allocations, and account access.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, roll..."
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading students..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : students && students.length > 0 ? (
        <DataTable>
          <thead>
            <tr className="text-xs font-bold text-slate-500 bg-slate-50/50">
              <th className="px-5 py-3.5">Student</th>
              <th className="px-5 py-3.5">Roll & Dept</th>
              <th className="px-5 py-3.5">Assigned Team</th>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s: any) => (
              <tr key={s.id} className="text-sm hover:bg-slate-50/40 transition-colors">
                <td className="whitespace-nowrap px-5 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={s.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                      alt={s.name}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">{s.name}</span>
                      <span className="text-xs text-slate-400">{s.email}</span>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-xs">
                  <span className="font-bold text-slate-800 block">{s.roll_number || '—'}</span>
                  <span className="text-slate-400">{s.department || 'Computer Science'}</span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-700">
                  {s.team_name || <span className="text-slate-400">Unassigned</span>}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">
                  {s.team_role || 'Student'}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <StatusBadge status={s.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <button
                    onClick={() => toggleStudentStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      s.status === 'active'
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    {s.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState title="No students found" description="Try adjusting search or status filter." icon={Users} />
      )}

      {statusConfirm && (
        <ConfirmDialog
          open={statusConfirm.open}
          title={`${statusConfirm.targetStatus === 'active' ? 'Activate' : 'Deactivate'} Student Account`}
          message={`Are you sure you want to ${statusConfirm.targetStatus} ${statusConfirm.student.name}? ${
            statusConfirm.targetStatus === 'inactive' ? 'Deactivated students will be prevented from logging in.' : ''
          }`}
          tone={statusConfirm.targetStatus === 'inactive' ? 'danger' : 'primary'}
          confirmLabel={statusConfirm.targetStatus === 'active' ? 'Activate' : 'Deactivate'}
          onConfirm={executeStatusChange}
          onCancel={() => setStatusConfirm(null)}
        />
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 2. ADMIN MENTORS VIEW
// -------------------------------------------------------------
export const AdminMentorsView: React.FC = () => {
  const { showToast } = useApp();
  const [editMentor, setEditMentor] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [statusConfirm, setStatusConfirm] = useState<{ open: boolean; mentor: any; targetStatus: 'active' | 'inactive' } | null>(null);

  const { data: mentors, loading, error, refetch } = useFetch(() => api.admin.getMentors(), []);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMentor) return;

    try {
      await api.admin.updateMentor(editMentor.id, {
        name: editName.trim(),
        department: editDept.trim(),
        title: editTitle.trim()
      });
      showToast('Mentor information updated successfully.', 'success');
      setEditMentor(null);
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update mentor.', 'error');
    }
  };

  const executeStatusChange = async () => {
    if (!statusConfirm) return;
    try {
      await api.admin.updateMentorStatus(statusConfirm.mentor.id, statusConfirm.targetStatus);
      showToast(`Mentor status set to ${statusConfirm.targetStatus}.`, 'success');
      setStatusConfirm(null);
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update status.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Faculty Mentors</h1>
        <p className="text-xs text-slate-500 mt-1">Manage academic advisors, team assignments, and mentorship capacity.</p>
      </div>

      {loading ? (
        <LoadingState message="Loading mentors..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : mentors && mentors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {mentors.map((m: any) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                      alt={m.name}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-blue-500/10"
                    />
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">{m.name}</h3>
                      <p className="text-xs text-slate-400">{m.department}</p>
                    </div>
                  </div>
                  <StatusBadge status={m.status} />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Assigned Teams:</span>
                  <span className="font-black text-blue-600 text-sm">{m.team_count || 0} teams</span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2">
                  {m.bio || 'Faculty mentor overseeing undergraduate research and capstone engineering projects.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setEditMentor(m);
                    setEditName(m.name);
                    setEditDept(m.department);
                    setEditTitle(m.title || '');
                  }}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => {
                    const target = m.status === 'active' ? 'inactive' : 'active';
                    setStatusConfirm({ open: true, mentor: m, targetStatus: target });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    m.status === 'active'
                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  {m.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No mentors registered" description="Add faculty advisors using the dashboard banner." icon={UserRoundPlus} />
      )}

      {/* Edit Modal */}
      {editMentor && (
        <Modal open={Boolean(editMentor)} title="Edit Mentor Profile" onClose={() => setEditMentor(null)}>
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-semibold">
            <FormField label="Full Name" required={true}>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              />
            </FormField>

            <FormField label="Department" required={true}>
              <input
                type="text"
                required
                value={editDept}
                onChange={(e) => setEditDept(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              />
            </FormField>

            <FormField label="Designation / Title">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setEditMentor(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-xs hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Deactivate / Activate Confirm */}
      {statusConfirm && (
        <ConfirmDialog
          open={statusConfirm.open}
          title={`${statusConfirm.targetStatus === 'active' ? 'Activate' : 'Deactivate'} Mentor`}
          message={`Are you sure you want to ${statusConfirm.targetStatus} ${statusConfirm.mentor.name}? ${
            statusConfirm.targetStatus === 'inactive'
              ? 'Inactive mentors cannot be assigned new teams or access the mentor dashboard.'
              : ''
          }`}
          tone={statusConfirm.targetStatus === 'inactive' ? 'danger' : 'primary'}
          confirmLabel={statusConfirm.targetStatus === 'active' ? 'Activate' : 'Deactivate'}
          onConfirm={executeStatusChange}
          onCancel={() => setStatusConfirm(null)}
        />
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 3. ADMIN TEAMS VIEW
// -------------------------------------------------------------
export const AdminTeamsView: React.FC = () => {
  const { showToast } = useApp();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mentorFilter, setMentorFilter] = useState('all');

  const { data: teamsRes, loading, error, refetch } = useFetch(
    () => api.admin.getTeams({ search: search || undefined, mentorFilter }),
    [search, mentorFilter]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Teams Directory</h1>
          <p className="text-xs text-slate-500 mt-1">Review team composition, leader contacts, and project alignments.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team or project..."
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800"
            />
          </div>

          <select
            value={mentorFilter}
            onChange={(e) => setMentorFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="all">All Teams</option>
            <option value="assigned">With Mentor</option>
            <option value="unassigned">Unassigned (Needs Mentor)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading teams..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : teamsRes?.data && teamsRes.data.length > 0 ? (
        <DataTable>
          <thead>
            <tr className="text-xs font-bold text-slate-500 bg-slate-50/50">
              <th className="px-5 py-3.5">Team Name</th>
              <th className="px-5 py-3.5">Project</th>
              <th className="px-5 py-3.5">Leader</th>
              <th className="px-5 py-3.5">Assigned Mentor</th>
              <th className="px-5 py-3.5">Members</th>
              <th className="px-5 py-3.5 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teamsRes.data.map((t: any) => (
              <tr key={t.id} className="text-sm hover:bg-slate-50/40 transition-colors">
                <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">
                  {t.name}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-slate-700">
                  {t.project_title || <span className="text-slate-400">No project</span>}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">
                  {t.leader_name}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-xs">
                  {t.mentor_name ? (
                    <span className="font-bold text-slate-800">{t.mentor_name}</span>
                  ) : (
                    <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      Unassigned
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                  {t.member_count} members
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <button
                    onClick={() => setSelectedTeamId(t.id)}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState title="No teams match criteria" description="Try clearing filters." icon={Network} />
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
// 4. ADMIN PROJECTS VIEW
// -------------------------------------------------------------
export const AdminProjectsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const { data: projects, loading, error, refetch } = useFetch(
    () => api.admin.getProjects({ search: search || undefined, status }),
    [search, status]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">University Projects</h1>
          <p className="text-xs text-slate-500 mt-1">Cross-department capstone and research projects tracking.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800"
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
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
              <th className="px-5 py-3.5">Team & Mentor</th>
              <th className="min-w-40 px-5 py-3.5">Progress</th>
              <th className="px-5 py-3.5">Deadline</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Repository</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((p: any) => (
              <tr key={p.id} className="text-sm hover:bg-slate-50/40 transition-colors">
                <td className="px-5 py-4">
                  <span className="font-bold text-slate-900 block">{p.title}</span>
                  <span className="text-xs text-slate-400 line-clamp-1">{p.description}</span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-xs">
                  <span className="font-bold text-slate-800 block">{p.team_name}</span>
                  <span className="text-slate-400">Mentor: {p.mentor_name || 'Unassigned'}</span>
                </td>
                <td className="min-w-40 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={p.progress} />
                    <span className="text-xs font-bold text-slate-600">{p.progress}%</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                  {p.deadline || '—'}
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
        <EmptyState title="No projects found" description="Try clearing search or filters." icon={FolderKanban} />
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 5. ADMIN ASSIGN MENTORS VIEW
// -------------------------------------------------------------
export const AdminAssignMentorsView: React.FC = () => {
  const { showToast } = useApp();
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reassignConfirm, setReassignConfirm] = useState<{ open: boolean; team: any; newMentorId: string } | null>(null);

  const { data: teamsRes, loading: loadingTeams, refetch: refetchTeams } = useFetch(() => api.admin.getTeams({ limit: 100 }), []);
  const { data: mentors, loading: loadingMentors, refetch: refetchMentors } = useFetch(() => api.admin.getMentors(), []);

  const teams = Array.isArray(teamsRes) ? teamsRes : (teamsRes?.data || []);
  const activeMentors = (mentors || []).filter((m: any) => !m.status || String(m.status).toLowerCase() === 'active');
  const selectedTeam = teams.find((t: any) => t.id === selectedTeamId);

  const executeAssignment = async (tId: string, mId: string) => {
    setSubmitting(true);
    try {
      const selectedT = teams.find((t: any) => t.id === tId) || selectedTeam;
      await api.admin.assignMentor(tId, mId || null, selectedT?.name);
      showToast(mId ? 'Mentor assigned to team successfully!' : 'Mentor unassigned from team.', 'success');
      setReassignConfirm(null);
      setSelectedMentorId('');
      refetchTeams();
      refetchMentors();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Assignment failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !selectedMentorId) {
      showToast('Please select both a team and a mentor.', 'error');
      return;
    }

    const team = teams.find((t: any) => t.id === selectedTeamId);
    if (team?.mentor_id && team.mentor_id !== selectedMentorId) {
      setReassignConfirm({ open: true, team, newMentorId: selectedMentorId });
      return;
    }

    executeAssignment(selectedTeamId, selectedMentorId);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-7 p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Assign Mentors</h1>
        <p className="text-xs text-slate-500 mt-1">
          Allocate faculty advisors to student teams based on research expertise and current workload.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <form onSubmit={handleAssign} className="space-y-5 text-xs font-semibold">
          <FormField label="Select Student Team" required={true}>
            <select
              value={selectedTeamId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedTeamId(nextId);
                const t = teams.find((item: any) => item.id === nextId);
                if (t?.mentor_id) {
                  setSelectedMentorId(t.mentor_id);
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">-- Choose a team to allocate --</option>
              {teams.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} • {t.project_title || 'No Project'} {t.mentor_name ? `(Current Mentor: ${t.mentor_name})` : '(UNASSIGNED)'}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Select Active Faculty Mentor (Shows Current Workload)" required={true}>
            <select
              value={selectedMentorId}
              onChange={(e) => setSelectedMentorId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">-- Choose faculty mentor --</option>
              {activeMentors.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.team_count || 0} teams assigned ({m.department || 'Faculty'})
                </option>
              ))}
            </select>
          </FormField>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={submitting || !selectedTeamId || !selectedMentorId}
              className="flex-1 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Confirm & Allocate Mentor</span>
            </button>

            {selectedTeam?.mentor_name && (
              <button
                type="button"
                onClick={() => executeAssignment(selectedTeamId, '')}
                disabled={submitting}
                className="w-full sm:w-auto py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition-colors cursor-pointer"
              >
                Remove Mentor
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Reassign Confirmation */}
      {reassignConfirm && (
        <ConfirmDialog
          open={reassignConfirm.open}
          title="Confirm Mentor Reassignment"
          message={`Team "${reassignConfirm.team?.name}" already has an assigned mentor (${reassignConfirm.team?.mentor_name}). Reassigning will shift mentoring responsibilities to the newly selected advisor.`}
          confirmLabel="Reassign Mentor"
          onConfirm={() => executeAssignment(reassignConfirm.team.id, reassignConfirm.newMentorId)}
          onCancel={() => setReassignConfirm(null)}
        />
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 6. ADMIN ANNOUNCEMENTS VIEW
// -------------------------------------------------------------
export const AdminAnnouncementsView: React.FC = () => {
  const { showToast } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'all' | 'students' | 'mentors'>('all');
  const [submitting, setSubmitting] = useState(false);

  const { data: announcements, loading, error, refetch } = useFetch(
    () => api.admin.getAnnouncements(),
    []
  );

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      showToast('Title and message are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.admin.createAnnouncement({ title: title.trim(), message: message.trim(), audience });
      showToast('Announcement broadcasted and notifications sent!', 'success');
      setIsModalOpen(false);
      setTitle('');
      setMessage('');
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Publishing failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Institutional Announcements</h1>
          <p className="text-xs text-slate-500 mt-1">Broadcast official deadlines, review rubrics, and guidelines.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Announcement</span>
        </button>
      </div>

      {loading ? (
        <LoadingState message="Loading announcements..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : announcements && announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((a: any) => (
            <div
              key={a.id}
              className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900">{a.title}</h3>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100">
                  Target: {a.audience}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{a.message}</p>
              <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400 border-t border-slate-100">
                <span>By {a.author_name || 'Admin'}</span>
                <span>•</span>
                <span>{new Date(a.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No announcements published yet" description="Broadcast an announcement to your campus." icon={Megaphone} />
      )}

      {/* Create Announcement Modal */}
      <Modal open={isModalOpen} title="Publish Campus Announcement" onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handlePublish} className="space-y-4 text-xs font-semibold">
          <FormField label="Announcement Title" required={true}>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mid-Semester Project Presentation Schedule"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
            />
          </FormField>

          <FormField label="Target Audience" required={true}>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
            >
              <option value="all">All Users (Students & Mentors)</option>
              <option value="students">Students Only</option>
              <option value="mentors">Faculty Mentors Only</option>
            </select>
          </FormField>

          <FormField label="Message Content" required={true}>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detailed guidelines, deadlines, room numbers, or requirements..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
            />
          </FormField>

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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
              <span>Publish & Notify</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// -------------------------------------------------------------
// 7. ADMIN REPORTS VIEW
// -------------------------------------------------------------
export const AdminReportsView: React.FC = () => {
  const { data: report, loading, error, refetch } = useFetch(() => api.admin.getReports(), []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Institutional Reports & Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">Real-time queries on project health, faculty load, and overdue deliverables.</p>
      </div>

      {loading ? (
        <LoadingState message="Generating reports..." />
      ) : error || !report ? (
        <ErrorState message={error || 'Unable to generate reports.'} onRetry={refetch} />
      ) : (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Completion</span>
              <p className="mt-2 text-3xl font-black text-blue-600">{report.averageProgress}%</p>
              <p className="text-[11px] text-slate-400 mt-1">Across all registered capstone projects</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue Deliverables</span>
              <p className="mt-2 text-3xl font-black text-rose-600">{report.overdueSubmissions?.length || 0}</p>
              <p className="text-[11px] text-slate-400 mt-1">Submissions past deadline requiring review</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Faculty Mentors</span>
              <p className="mt-2 text-3xl font-black text-emerald-600">{report.mentorWorkload?.length || 0}</p>
              <p className="text-[11px] text-slate-400 mt-1">Supervising undergraduate student teams</p>
            </div>
          </div>

          {/* Projects by Status & Mentor Workload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">Projects by Status Breakdown</h3>
              <div className="space-y-3">
                {report.projectsByStatus?.map((item: any) => (
                  <div key={item.status} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <StatusBadge status={item.status} />
                    <span className="text-base font-extrabold text-slate-900">{item.count} projects</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mentor Workload */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">Faculty Mentorship Workload</h3>
              <div className="space-y-2.5">
                {report.mentorWorkload?.map((m: any) => (
                  <div key={m.mentor_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{m.mentor_name}</span>
                      <span className="text-[11px] text-slate-400">{m.department}</span>
                    </div>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                      {m.team_count} teams
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Overdue Submissions Table */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Overdue Submissions Audit Trail</span>
            </h3>

            {report.overdueSubmissions && report.overdueSubmissions.length > 0 ? (
              <DataTable>
                <thead>
                  <tr className="text-xs font-bold text-slate-500 bg-slate-50/50">
                    <th className="px-5 py-3">Team</th>
                    <th className="px-5 py-3">Project Title</th>
                    <th className="px-5 py-3">Missed Deadline</th>
                    <th className="px-5 py-3">Assigned Mentor</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.overdueSubmissions.map((sub: any) => (
                    <tr key={sub.id} className="text-xs">
                      <td className="px-5 py-3 font-bold text-slate-800">{sub.team_name}</td>
                      <td className="px-5 py-3 text-slate-600">{sub.project_title}</td>
                      <td className="px-5 py-3 font-semibold text-rose-600">{sub.deadline}</td>
                      <td className="px-5 py-3 text-slate-700">{sub.mentor_name || 'Unassigned'}</td>
                      <td className="px-5 py-3"><StatusBadge status="OVERDUE" /></td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No overdue deliverables currently recorded.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 8. ADMIN SETTINGS VIEW
// -------------------------------------------------------------
export const AdminSettingsView: React.FC = () => {
  const { showToast } = useApp();
  const [institutionName, setInstitutionName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [reviewFrequency, setReviewFrequency] = useState('7');
  const [emailNotifications, setEmailNotifications] = useState('false');
  const [saving, setSaving] = useState(false);

  const { data: settings, loading, error } = useFetch(async () => {
    const res = await api.admin.getSettings();
    setInstitutionName(res.institution_name || 'College of Engineering & Technology');
    setAcademicYear(res.academic_year || '2026-2027');
    setReviewFrequency(res.review_frequency_days || '7');
    setEmailNotifications(res.email_notifications_enabled || 'false');
    return res;
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.updateSettings({
        institution_name: institutionName.trim(),
        academic_year: academicYear.trim(),
        review_frequency_days: reviewFrequency,
        email_notifications_enabled: emailNotifications
      });
      showToast('System configuration saved to database successfully.', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure college parameters, review cadence, and notifications.</p>
      </div>

      {loading ? (
        <LoadingState message="Loading settings..." />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
            <FormField label="Institution / University Name" required={true}>
              <input
                type="text"
                required
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              />
            </FormField>

            <FormField label="Current Academic Year" required={true}>
              <input
                type="text"
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              />
            </FormField>

            <FormField label="Weekly Progress Review Cadence (Days)" required={true}>
              <select
                value={reviewFrequency}
                onChange={(e) => setReviewFrequency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              >
                <option value="5">Every 5 Days (Accelerated Sprint)</option>
                <option value="7">Every 7 Days (Standard Weekly Review)</option>
                <option value="14">Every 14 Days (Bi-weekly Sprint)</option>
              </select>
            </FormField>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications === 'true'}
                  onChange={(e) => setEmailNotifications(e.target.checked ? 'true' : 'false')}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700">Enable automated email digest notifications to mentors</span>
              </label>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
