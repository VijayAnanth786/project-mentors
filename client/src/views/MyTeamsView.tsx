import React, { useState } from 'react';
import { Plus, Search, Users, ChevronRight, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProjectStatus } from '../types';

export const MyTeamsView: React.FC = () => {
  const { teams, createTeam, setActiveView, setCurrentProject } = useApp();
  const [selectedCohort, setSelectedCohort] = useState<'1st Year' | '2nd Year' | '3rd Year'>('1st Year');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state for team creation
  const [newTeamName, setNewTeamName] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newMemberCount, setNewMemberCount] = useState(4);
  const [newCohort, setNewCohort] = useState<'1st Year' | '2nd Year' | '3rd Year'>('1st Year');

  const filteredTeams = teams.filter((t) => {
    const matchesCohort = t.yearCohort === selectedCohort;
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.projectTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCohort && matchesSearch;
  });

  const getCohortCount = (cohort: '1st Year' | '2nd Year' | '3rd Year') => {
    return teams.filter((t) => t.yearCohort === cohort).length;
  };

  const handleSelectTeam = (team: (typeof teams)[0]) => {
    setCurrentProject({
      id: `proj_${team.id}`,
      title: team.projectTitle,
      techStack: ['React', 'Node.js', 'MongoDB'],
      description: `Project workspace for ${team.projectTitle} by ${team.name}.`,
      teamId: team.id,
      teamName: team.name,
      yearCohort: team.yearCohort,
      mentorName: 'Dr. R. Kumar',
      mentorId: 'usr_mentor_1',
      progressPercentage: team.progressPercentage,
      currentPhase: team.status === 'ON_TRACK' ? 'Development' : 'Planning',
      nextDeadline: 'In 5 days',
      daysLeft: 5,
      githubUrl: `https://github.com/${team.name.toLowerCase().replace(/\s+/g, '')}/${team.projectTitle.toLowerCase().replace(/\s+/g, '-')}`,
      status: team.status,
      milestones: [
        { id: 'm1', title: 'Problem Definition', status: 'Completed' },
        { id: 'm2', title: 'Requirement Analysis', status: 'Completed' },
        { id: 'm3', title: 'UI Design', status: team.progressPercentage >= 40 ? 'Completed' : 'In Progress' },
        { id: 'm4', title: 'Database Design', status: team.progressPercentage >= 60 ? 'Completed' : 'Pending' },
        { id: 'm5', title: 'Development', status: team.progressPercentage >= 70 ? 'In Progress' : 'Pending' },
        { id: 'm6', title: 'Testing', status: 'Pending' },
        { id: 'm7', title: 'Final Demo', status: 'Pending' },
        { id: 'm8', title: 'Final Report', status: 'Pending' },
      ],
      members: [
        { id: 'usr_1', name: 'Team Leader', role: 'Team Leader' }
      ]
    });
    setActiveView('home');
  };

  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName || !newProjectTitle) return;

    createTeam({
      name: newTeamName,
      projectTitle: newProjectTitle,
      memberCount: Number(newMemberCount),
      yearCohort: newCohort,
      status: 'ON_TRACK',
      progressPercentage: 10
    });

    setShowCreateModal(false);
    setNewTeamName('');
    setNewProjectTitle('');
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header with Title and Create Team CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Teams</h1>
          <p className="text-sm font-medium text-slate-500">
            View and manage your assigned teams across all academic years.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Team</span>
        </button>
      </div>

      {/* Cohort Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Tabs */}
        <div className="flex space-x-2">
          {(['1st Year', '2nd Year', '3rd Year'] as const).map((cohort) => (
            <button
              key={cohort}
              onClick={() => setSelectedCohort(cohort)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCohort === cohort
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cohort} ({getCohortCount(cohort)})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search teams..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Team Cards Grid or Empty State */}
      {filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              onClick={() => handleSelectTeam(team)}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all space-y-4 group"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {team.name}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                    {team.projectTitle}
                  </h3>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{team.memberCount} members</span>
              </div>

              {/* Status Pill */}
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
                <span className="text-xs font-bold text-slate-500">{team.progressPercentage}%</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-black text-slate-900">No Teams Found</h3>
            <p className="text-xs text-slate-400">
              No teams have been created for {selectedCohort} yet. Click below to create your team.
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
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-700 block mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Team 9"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="e.g. Smart Energy Grid"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
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
                  <label className="text-slate-700 block mb-1">Members Count</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={newMemberCount}
                    onChange={(e) => setNewMemberCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
