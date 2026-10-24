import React from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Circle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ProjectAnalyticsView: React.FC = () => {
  const { teams, currentProject } = useApp();

  const totalTeams = teams.length;
  const onTrackTeams = teams.filter((t) => t.status === 'ON_TRACK').length;
  const needsAttentionTeams = teams.filter((t) => t.status === 'NEEDS_ATTENTION').length;
  const delayedTeams = teams.filter((t) => t.status === 'DELAYED').length;
  const avgProgress = totalTeams > 0
    ? Math.round(teams.reduce((acc, t) => acc + t.progressPercentage, 0) / totalTeams)
    : 0;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Project Analytics</h1>
        <p className="text-sm font-medium text-slate-500">
          Overall performance, delivery velocity, and cohort health.
        </p>
      </div>

      {/* 5 Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500">Total Teams</span>
          <div className="text-2xl font-black text-slate-900">{totalTeams}</div>
          <div className="text-[11px] font-bold text-blue-600">Active cohorts</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500">On Track</span>
          <div className="text-2xl font-black text-slate-900">{onTrackTeams}</div>
          <div className="text-[11px] font-bold text-emerald-600">
            {totalTeams > 0 ? Math.round((onTrackTeams / totalTeams) * 100) : 0}%
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500">Needs Attention</span>
          <div className="text-2xl font-black text-slate-900">{needsAttentionTeams}</div>
          <div className="text-[11px] font-bold text-amber-600">
            {totalTeams > 0 ? Math.round((needsAttentionTeams / totalTeams) * 100) : 0}%
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500">Delayed</span>
          <div className="text-2xl font-black text-slate-900">{delayedTeams}</div>
          <div className="text-[11px] font-bold text-rose-600">
            {totalTeams > 0 ? Math.round((delayedTeams / totalTeams) * 100) : 0}%
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500">Avg Progress</span>
          <div className="text-2xl font-black text-slate-900">{avgProgress}%</div>
          <div className="text-[11px] font-bold text-emerald-600">Completion rate</div>
        </div>
      </div>

      {/* 2 Column Layout: Team Performance Table & Project Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Team Performance Table */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Team Performance</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="pb-3">Team</th>
                  <th className="pb-3">Project</th>
                  <th className="pb-3">Progress</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {teams.length > 0 ? (
                  teams.slice(0, 6).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 font-bold text-slate-800">{t.name}</td>
                      <td className="py-3 text-slate-600">{t.projectTitle}</td>
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${t.progressPercentage}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500">
                            {t.progressPercentage}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'ON_TRACK'
                              ? 'bg-emerald-50 text-emerald-700'
                              : t.status === 'NEEDS_ATTENTION'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {t.status === 'ON_TRACK'
                            ? 'On Track'
                            : t.status === 'NEEDS_ATTENTION'
                            ? 'Needs Attention'
                            : 'Delayed'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                      No team performance records available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Project Timeline */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900">Project Timeline</h2>
            {currentProject && (
              <span className="text-xs font-semibold text-blue-600">
                {currentProject.teamName} • {currentProject.title}
              </span>
            )}
          </div>

          <div className="space-y-3 pt-2">
            {currentProject && currentProject.milestones?.length > 0 ? (
              currentProject.milestones.map((m, index) => (
                <div key={m.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="text-[11px] text-slate-400 font-semibold w-20">
                      Sprint {index + 1}
                    </div>
                    <div className="flex items-center space-x-2">
                      {m.status === 'Completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : m.status === 'In Progress' ? (
                        <Clock className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300" />
                      )}
                      <span className="font-bold text-slate-800">{m.title}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : m.status === 'In Progress'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs font-bold text-slate-600">No project selected</p>
                <p className="text-[11px] text-slate-400">
                  Select a team or project to view sprint timeline and milestone milestones.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
