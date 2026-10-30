import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, ChevronRight, X, Loader2, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AddMemberModal } from '../components/AddMemberModal';

export const MyTeamsView: React.FC = () => {
  const { teams, createTeam, joinTeam, refreshTeams, setActiveView, currentProject, currentUser } = useApp();
  const [selectedCohort, setSelectedCohort] = useState<'1st Year' | '2nd Year' | '3rd Year' | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for team creation
  const [newTeamName, setNewTeamName] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTechStack, setNewTechStack] = useState('React, TypeScript, Node.js');
  const [newCohort, setNewCohort] = useState<'1st Year' | '2nd Year' | '3rd Year'>('3rd Year');

  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  const filteredTeams = teams.filter((t) => {
    const matchesCohort = selectedCohort === 'All' || t.yearCohort === selectedCohort;
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.leaderName && t.leaderName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCohort && matchesSearch;
  });

  const getCohortCount = (cohort: '1st Year' | '2nd Year' | '3rd Year') => {
    return teams.filter((t) => t.yearCohort === cohort).length;
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newProjectTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await createTeam({
        name: newTeamName.trim(),
        projectTitle: newProjectTitle.trim(),
        description: newDescription.trim() || undefined,
        yearCohort: newCohort,
        techStack: newTechStack ? newTechStack.split(',').map((s) => s.trim()).filter(Boolean) : undefined
      });
      setShowCreateModal(false);
      setNewTeamName('');
      setNewProjectTitle('');
      setNewDescription('');
      setActiveView('home');
    } catch {
      // Toast displayed by context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinTeam = async (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await joinTeam(teamId);
      setActiveView('home');
    } catch {}
  };

  const isLeader = Boolean(currentProject?.isLeader || currentProject?.teamRole === 'Team Leader');

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header with Title and Create Team CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Student Teams</h1>
          <p className="text-sm font-medium text-slate-500">
            View team rosters, track project allocations, or form a new project group.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {currentProject && isLeader && (
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Teammate</span>
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team</span>
          </button>
        </div>
      </div>

      {/* Cohort Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex space-x-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setSelectedCohort('All')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCohort === 'All'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            All Cohorts ({teams.length})
          </button>
          {(['1st Year', '2nd Year', '3rd Year'] as const).map((cohort) => {
            const count = getCohortCount(cohort);
            const isSelected = selectedCohort === cohort;
            return (
              <button
                key={cohort}
                onClick={() => setSelectedCohort(cohort)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {cohort} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search team or project..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => {
            const isCurrentTeam = currentProject?.teamId === team.id;
            return (
              <div
                key={team.id}
                onClick={() => setActiveView('home')}
                className={`bg-white rounded-2xl p-5 border shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
                  isCurrentTeam ? 'ring-2 ring-blue-500/30 border-blue-500' : 'border-slate-200/80'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                          {team.name}
                        </span>
                        {isCurrentTeam && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                            My Team
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs font-semibold text-slate-500 mt-0.5">
                        {team.projectTitle}
                      </h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{team.memberCount} member{team.memberCount === 1 ? '' : 's'}</span>
                    </div>
                    {team.leaderName && (
                      <span className="text-[11px] text-slate-400">
                        Lead: {team.leaderName}
                      </span>
                    )}
                  </div>

                  {team.mentorName ? (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Faculty Mentor</span>
                      <span className="font-bold text-slate-800">{team.mentorName}</span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 text-xs text-amber-700 font-medium">
                      Mentor not assigned yet
                    </div>
                  )}
                </div>

                {/* Status Pill & Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center space-x-1 ${
                      team.status === 'ON_TRACK'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : team.status === 'NEEDS_ATTENTION'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                    }`}
                  >
                    <span>
                      {team.status === 'ON_TRACK'
                        ? '● On Track'
                        : team.status === 'NEEDS_ATTENTION'
                        ? '▲ Needs Attention'
                        : '■ Delayed'}
                    </span>
                  </span>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-500">{team.progressPercentage}%</span>
                    {isCurrentTeam && isLeader && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAddMemberModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-[11px] font-bold transition-colors inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>+ Member</span>
                      </button>
                    )}
                    {!isCurrentTeam && !currentProject && (
                      <button
                        onClick={(e) => handleJoinTeam(team.id, e)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-black text-slate-900">No Teams Created Yet</h3>
            <p className="text-xs text-slate-400">
              Form the first team in this cohort to kick off your project development.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team</span>
          </button>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Create New Team</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-700 block mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. CodeCrew or Team 5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="e.g. Automated Attendance System"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief overview of project goals and scope..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1">Academic Year</label>
                  <select
                    value={newCohort}
                    onChange={(e: any) => setNewCohort(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Tech Stack</label>
                  <input
                    type="text"
                    value={newTechStack}
                    onChange={(e) => setNewTechStack(e.target.value)}
                    placeholder="React, Node.js"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold shadow-md shadow-blue-500/20 flex items-center space-x-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Team</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {currentProject && (
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          teamId={currentProject.teamId}
          teamName={currentProject.teamName}
          members={currentProject.members || []}
          isLeader={isLeader}
        />
      )}
    </div>
  );
};
