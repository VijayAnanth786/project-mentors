import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, ArrowLeft, Github, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SubmitProgressView: React.FC = () => {
  const { submitWeeklyProgress, setActiveView } = useApp();

  const [weekNumber, setWeekNumber] = useState('7');
  const [completed, setCompleted] = useState('Completed authentication module and database schemas.\nIntegrated resume upload endpoint.');
  const [currentWork, setCurrentWork] = useState('Working on AI parsing and model fine-tuning.');
  const [blockers, setBlockers] = useState('PDF text stream parsing issue (getting empty string on certain formats).');
  const [nextGoals, setNextGoals] = useState('Complete full integration test and connect frontend form.');
  const [githubUrl, setGithubUrl] = useState('https://github.com/team5/resume-analyzer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await submitWeeklyProgress({
      weekNumber,
      completedTasks: completed,
      currentWork,
      blockers,
      nextWeekGoals: nextGoals,
      githubUrl
    });
    setIsSubmitting(false);
    setShowSuccess(true);
    setTimeout(() => {
      setActiveView('home');
    }, 1200);
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <button
        onClick={() => setActiveView('home')}
        className="inline-flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Submit Weekly Progress</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Share your weekly milestones and blockers with your assigned faculty mentor.
          </p>
        </div>

        {showSuccess ? (
          <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-emerald-900">Weekly Progress Submitted!</h3>
            <p className="text-xs text-emerald-700">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 text-xs font-semibold">
            {/* Week & Date Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-slate-700 block mb-1.5 font-bold">Week *</label>
                <select
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="6">Week 6</option>
                  <option value="7">Week 7</option>
                  <option value="8">Week 8</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 block mb-1.5 font-bold">Submission Date</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-500 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Today (Relative)</span>
                </div>
              </div>
            </div>

            {/* 4 Required Input Fields */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-slate-700 font-bold">What we completed? *</label>
                  <span className="text-[10px] text-slate-400 font-normal">{completed.length}/1000</span>
                </div>
                <textarea
                  rows={3}
                  required
                  value={completed}
                  onChange={(e) => setCompleted(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-slate-700 font-bold">What are we currently working on? *</label>
                  <span className="text-[10px] text-slate-400 font-normal">{currentWork.length}/1000</span>
                </div>
                <textarea
                  rows={3}
                  required
                  value={currentWork}
                  onChange={(e) => setCurrentWork(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-slate-700 font-bold">Any problems or blockers?</label>
                  <span className="text-[10px] text-slate-400 font-normal">{blockers.length}/1000</span>
                </div>
                <textarea
                  rows={2}
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="Describe technical bottlenecks or API failures..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-slate-700 font-bold">Next week's goal? *</label>
                  <span className="text-[10px] text-slate-400 font-normal">{nextGoals.length}/1000</span>
                </div>
                <textarea
                  rows={2}
                  required
                  value={nextGoals}
                  onChange={(e) => setNextGoals(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>
            </div>

            {/* Drag & Drop Upload Files */}
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">Upload Files (PDF, PPT, Images, etc.)</label>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer transition-all space-y-2">
                <UploadCloud className="w-8 h-8 text-blue-500 mx-auto" />
                <div className="text-xs text-slate-700 font-bold">
                  Click to upload or drag and drop
                </div>
                <p className="text-[11px] text-slate-400 font-normal">
                  Supports: PDF, PPT, JPG, PNG (Max 10MB)
                </p>
              </div>
            </div>

            {/* GitHub Repository Link */}
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">GitHub Repository Link (optional)</label>
              <div className="relative">
                <Github className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Submit CTA */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Submitting...' : 'Submit Progress'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
