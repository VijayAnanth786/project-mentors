import React, { useState } from 'react';
import {
  ArrowLeft,
  Laptop,
  CheckCircle2,
  Clock,
  Circle,
  Github,
  Calendar,
  Sparkles,
  Users,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ProjectDetailsView: React.FC = () => {
  const { currentProject, setActiveView, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'Overview' | 'Team' | 'Progress' | 'Timeline' | 'Files' | 'Reviews'>('Overview');
  const [showAiModal, setShowAiModal] = useState(false);

  if (!currentProject) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <button
          onClick={() => setActiveView('home')}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Laptop className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-slate-900">No Project Selected</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Select an active team project from My Teams or create a new team project to view its full details.
          </p>
          <button
            onClick={() => setActiveView('my_team')}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-sm"
          >
            Go to My Teams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => setActiveView(currentUser.role === 'student' ? 'home' : 'my_teams')}
        className="inline-flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Projects</span>
      </button>

      {/* Main Project Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Laptop className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {currentProject.title}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  On Track
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                Team 5 • 2nd Year • MERN + Python
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href={currentProject.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center space-x-2 transition-all"
            >
              <Github className="w-4 h-4" />
              <span>View GitHub</span>
            </a>

            <button
              onClick={() => setShowAiModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center space-x-2 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI Assistant</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 text-xs font-bold text-slate-500 gap-6">
          {(['Overview', 'Team', 'Progress', 'Timeline', 'Files', 'Reviews'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600 font-extrabold'
                  : 'hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Section: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Description & Milestones */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Project Description</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentProject.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 block mb-1">Start Date</span>
                <span className="text-slate-800">01 Aug (Relative)</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Target Deadline</span>
                <span className="text-slate-800">In 4 days (Relative)</span>
              </div>
            </div>

            {/* Milestones Checklist */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Project Milestones</h3>
              <div className="space-y-2">
                {currentProject.milestones.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      {m.status === 'Completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : m.status === 'In Progress' ? (
                        <Clock className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300" />
                      )}
                      <span className="font-bold text-slate-800">{m.title}</span>
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
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Team Members & Actions */}
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Team Members</span>
              </h3>

              <div className="space-y-3">
                {currentProject.members.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3 text-xs">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">{member.name}</div>
                      <div className="text-[10px] text-slate-400">{member.role}</div>
                    </div>
                    {member.role === 'Team Leader' && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                        Lead
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200">
                <button
                  onClick={() => setActiveView('submit_progress')}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Submit Weekly Progress
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Gemini AI Project Assistant</h3>
                <p className="text-xs text-slate-500">Project health summary & pedagogical advice</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-700 space-y-3">
              <div>
                <span className="font-bold text-slate-900 block mb-1">Executive Summary:</span>
                <p className="leading-relaxed">
                  Team 5 has completed 6 of 8 milestones. Version control cadence is strong (14 commits this week). However, PDF parsing was reported as a blocker in Week 6.
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-1">Mentor Action Recommendation:</span>
                <p className="leading-relaxed bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900 font-semibold">
                  Host a brief 15-minute screen-share specifically to guide them through PDF byte-stream extraction libraries (e.g., pdf-parse vs. pdfjs).
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
