import React, { useEffect, useState } from 'react';
import {
  Laptop,
  Github,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Download,
  Users,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Inbox,
  FolderPlus,
  ArrowRight,
  GraduationCap,
  Building2,
  BookOpen,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DonutProgress } from '../components/DonutProgress';
import { AddMemberModal } from '../components/AddMemberModal';

export const StudentDashboardView: React.FC = () => {
  const { currentUser, currentProject, submissions, setActiveView, refreshStudentData } = useApp();
  const latestSub = submissions[0];
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const isLeader = Boolean(currentProject?.isLeader || currentProject?.teamRole === 'Team Leader');

  useEffect(() => {
    refreshStudentData();
  }, [refreshStudentData]);


  // Compute milestone stats if project is assigned
  const milestones = currentProject?.milestones ?? [];
  const completedCount = milestones.filter((m) => m.status === 'Completed').length;
  const inProgressCount = milestones.filter((m) => m.status === 'In Progress').length;
  const pendingCount = milestones.filter((m) => m.status === 'Pending').length;
  const totalCount = milestones.length;

  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Student';

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white rounded-3xl p-6 border border-blue-100 flex items-center justify-between shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">👋</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Hello, {firstName}!
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-500">
            {currentProject
              ? 'Keep going! Your project is making good progress.'
              : 'Welcome to ProjectMentor. Get started by joining or creating your project team.'}
          </p>
        </div>
        {currentProject && totalCount > 0 ? (
          <div className="hidden sm:flex items-center space-x-2 bg-white px-4 py-2 rounded-2xl border border-slate-200/80 shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-700">
              {currentProject.currentPhase} • Milestone {completedCount}/{totalCount}
            </span>
          </div>
        ) : (
          <button
            onClick={() => setActiveView('my_team')}
            className="hidden sm:inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Find a Team</span>
          </button>
        )}
      </div>

      {/* Student Academic Details & Profile Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3.5">
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80'}
              alt={currentUser.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-500/20 shadow-xs"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-slate-900">{currentUser.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Student
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{currentUser.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {currentProject && isLeader && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Teammate</span>
              </button>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Account Active</span>
            </span>
          </div>
        </div>

        {/* Student Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] font-semibold">Department</span>
            </div>
            <span className="font-bold text-slate-800 block text-xs">{currentUser.department || 'Computer Science'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-semibold">Year / Cohort</span>
            </div>
            <span className="font-bold text-slate-800 block text-xs">{currentUser.year || '3rd Year'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-[11px] font-semibold">College</span>
            </div>
            <span className="font-bold text-slate-800 truncate block text-xs">{currentUser.college || 'College of Engineering & Technology'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-semibold">Team Status</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 truncate block text-xs">
                {currentProject ? currentProject.teamName : 'No Team Assigned'}
              </span>
              {currentProject && (
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  {isLeader ? '+ Add' : 'Roster'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left 2 Cols, Right 1 Col */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {currentProject ? (
            /* Active Project Overview Card */
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      {currentProject.title}
                    </h2>
                    {currentProject.techStack?.length > 0 && (
                      <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                        {currentProject.techStack.join(' + ')}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setActiveView('project_details')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 hover:underline cursor-pointer"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                {currentProject.description}
              </p>

              {/* Badges strip */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <div
                  onClick={() => setShowAddMemberModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors cursor-pointer"
                  title="View team members"
                >
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>{currentProject.teamName} ({currentProject.members?.length || 1})</span>
                </div>
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{currentProject.yearCohort}</span>
                </div>
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
                  <span className="text-slate-400 font-normal">Mentor:</span>
                  <span>{currentProject.mentorName}</span>
                </div>
              </div>

              {/* Progress & Next Milestones */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">Overall Progress</span>
                    <span className="text-emerald-600 font-extrabold">{currentProject.progressPercentage}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${currentProject.progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block mb-1">Current Phase</span>
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200/50">
                      {currentProject.currentPhase}
                    </span>
                  </div>
                  {currentProject.nextDeadline && (
                    <div>
                      <span className="text-slate-400 block mb-1">Next Deadline</span>
                      <span className="inline-flex items-center space-x-1 font-bold text-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{currentProject.nextDeadline}</span>
                      </span>
                    </div>
                  )}
                  {currentProject.techStack?.length > 0 && (
                    <div>
                      <span className="text-slate-400 block mb-1">Technology</span>
                      <span className="font-semibold text-slate-700">
                        {currentProject.techStack.join(', ')}
                      </span>
                    </div>
                  )}
                  {currentProject.githubUrl && (
                    <div>
                      <span className="text-slate-400 block mb-1">GitHub</span>
                      <a
                        href={currentProject.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 font-semibold text-blue-600 hover:underline"
                      >
                        <Github className="w-3.5 h-3.5" />
                        <span>{currentProject.githubUrl.replace('https://github.com/', '')}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Clean "No Project Assigned" Empty State */
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto shadow-inner">
                <FolderPlus className="w-8 h-8" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  No Project Assigned Yet
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  You are not currently enrolled in any active project. Create a new team project or join an existing team from your cohort to track weekly progress and milestones.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveView('my_team')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm inline-flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Browse & Join Teams</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Steps to get started */}
              <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1.5">
                  <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Form a Team</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Group with cohort peers and select a project title and tech stack.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1.5">
                  <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Track Milestones</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Work across defined phases: Requirements, UI, Backend, and Demo.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1.5">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Weekly Reports</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Submit weekly progress, GitHub commits, and get mentor reviews.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sub Navigation Bar */}
          <div className="flex border-b border-slate-200 text-xs font-bold text-slate-500">
            <button className="pb-3 border-b-2 border-blue-600 text-blue-600 px-4">
              Project Work
            </button>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/student/team');
                setActiveView('my_team');
              }}
              className="pb-3 px-4 hover:text-slate-800 cursor-pointer"
            >
              Team
            </button>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/student/progress');
                setActiveView('submit_progress');
              }}
              className="pb-3 px-4 hover:text-slate-800 cursor-pointer"
            >
              Progress
            </button>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/student/timeline');
                setActiveView('timeline');
              }}
              className="pb-3 px-4 hover:text-slate-800 cursor-pointer"
            >
              Timeline
            </button>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/student/reviews');
                setActiveView('reviews');
              }}
              className="pb-3 px-4 hover:text-slate-800 cursor-pointer"
            >
              Reviews
            </button>
          </div>

          {/* Latest Progress Update Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Latest Progress Update</h3>
              {currentProject && (
                <button
                  onClick={() => setActiveView('submit_progress')}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer"
                >
                  + New Weekly Report
                </button>
              )}
            </div>

            {latestSub ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-600">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Week {latestSub.weekNumber}</span>
                  <span className="text-slate-400 font-normal">
                    (Submitted on {latestSub.submissionDate})
                  </span>
                </div>

                {/* 4 Colored Category Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. What we completed */}
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>What we completed</span>
                    </div>
                    <ul className="text-xs text-slate-700 space-y-1.5 pl-5 list-disc marker:text-emerald-500">
                      {latestSub.completedTasks.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 2. What we are working on */}
                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-amber-800">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>What we are working on</span>
                    </div>
                    <ul className="text-xs text-slate-700 space-y-1.5 pl-5 list-disc marker:text-amber-500">
                      {latestSub.currentWork.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 3. Problems faced */}
                  <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Problems faced</span>
                    </div>
                    <ul className="text-xs text-slate-700 space-y-1.5 pl-5 list-disc marker:text-rose-500">
                      {latestSub.blockers.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 4. Next week's goal */}
                  <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-purple-800">
                      <Target className="w-4 h-4 text-purple-600" />
                      <span>Next week's goal</span>
                    </div>
                    <ul className="text-xs text-slate-700 space-y-1.5 pl-5 list-disc marker:text-purple-500">
                      {latestSub.nextWeekGoals.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Files & Links */}
                {(() => {
                  const subFiles = (latestSub.files && latestSub.files.length > 0)
                    ? latestSub.files
                    : ((latestSub as any).attachments && (latestSub as any).attachments.length > 0)
                    ? (latestSub as any).attachments
                    : [];
                  const repoLink = latestSub.githubUrl || (latestSub as any).repo_url;

                  if (subFiles.length === 0 && !repoLink) return null;

                  return (
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Files & Links</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {subFiles.map((file: any, idx: number) => (
                          <div key={idx} className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs">
                            {file.type === 'image' ? (
                              <ImageIcon className="w-4 h-4 text-blue-500" />
                            ) : (
                              <FileText className="w-4 h-4 text-rose-500" />
                            )}
                            <div>
                              <div className="font-bold text-slate-800">{file.name}</div>
                              <div className="text-[10px] text-slate-400">{file.size}</div>
                            </div>
                            <a
                              href={file.url || '#'}
                              download={file.name}
                              target="_blank"
                              rel="noreferrer"
                              title={`Download ${file.name}`}
                              className="text-slate-400 hover:text-blue-600 transition-colors pl-2"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}

                        {repoLink && (
                          <a
                            href={repoLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-blue-600 hover:bg-blue-50/50"
                          >
                            <Github className="w-4 h-4" />
                            <span className="font-bold">GitHub Repository</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Dynamic Review & Mentor Feedback Status */}
                {latestSub.status === 'Approved' ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center space-x-2 font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Approved by {latestSub.reviewerName || currentProject?.mentorName || 'Faculty Mentor'}</span>
                    </div>
                    {latestSub.feedback && (
                      <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100 text-emerald-900 leading-relaxed">
                        <strong className="block text-[10px] uppercase font-bold text-emerald-600 mb-0.5">Faculty Feedback:</strong>
                        {latestSub.feedback}
                      </div>
                    )}
                  </div>
                ) : latestSub.status === 'Changes requested' ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center space-x-2 font-bold text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Changes Requested by {latestSub.reviewerName || currentProject?.mentorName || 'Faculty Mentor'}</span>
                    </div>
                    {latestSub.feedback && (
                      <div className="bg-white/80 p-2.5 rounded-lg border border-amber-100 text-amber-900 leading-relaxed">
                        <strong className="block text-[10px] uppercase font-bold text-amber-600 mb-0.5">Required Revisions:</strong>
                        {latestSub.feedback}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center space-x-2 text-xs font-semibold text-blue-800">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Submitted Week {latestSub.weekNumber} progress report. Awaiting faculty review...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                <Inbox className="w-9 h-9 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No progress updates yet</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  {currentProject
                    ? 'Submit your first weekly report to get mentor feedback.'
                    : 'Once you join a team, your weekly submissions and mentor feedback will appear here.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Donut, Deadlines, Notifications) */}
        <div className="space-y-6">
          {/* Progress Donut Gauge / Empty State */}
          {currentProject && totalCount > 0 ? (
            <DonutProgress
              percentage={currentProject.progressPercentage}
              completed={completedCount}
              inProgress={inProgressCount}
              pending={pendingCount}
              total={totalCount}
            />
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                <h3 className="text-base font-bold text-slate-900">My Progress</h3>
              </div>
              <div className="text-center py-4 space-y-3">
                <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-200 flex flex-col items-center justify-center mx-auto text-slate-400">
                  <span className="text-lg font-black text-slate-400">0%</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">No data</span>
                </div>
                <p className="text-xs font-bold text-slate-600">No active milestones</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Progress metrics and completion donut will be calculated once your project is active.
                </p>
              </div>
            </div>
          )}

          {/* Next Deadline Card */}
          {currentProject?.nextDeadline ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Next Deadline</h3>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">{currentProject.currentPhase}</div>
                  <div className="text-[11px] text-slate-400">{currentProject.title}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-200">
                  {currentProject.nextDeadline}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900">Next Deadline</h3>
              </div>
              <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center space-y-1">
                <p className="text-xs font-bold text-slate-600">No deadlines pending</p>
                <p className="text-[11px] text-slate-400">
                  Upcoming milestone deadlines will show here once your project begins.
                </p>
              </div>
            </div>
          )}

          {/* Recent Activity — shown only when submissions exist */}
          {submissions.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm">🔔</span>
                <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
              </div>

              <div className="space-y-3">
                {submissions.slice(0, 3).map((sub) => (
                  <div key={sub.id} className="flex items-start space-x-3 text-xs">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800">Week {sub.weekNumber} Report</div>
                      <div className="text-slate-500 text-[11px]">
                        Submitted — {sub.status}
                      </div>
                      <div className="text-[10px] text-slate-400">{sub.submissionDate}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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
