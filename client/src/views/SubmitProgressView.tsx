import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  ArrowLeft,
  Github,
  Calendar,
  FileText,
  Image as ImageIcon,
  File,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface UploadedFileItem {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'image' | 'ppt' | 'zip';
  url: string;
}

export const SubmitProgressView: React.FC = () => {
  const { submitWeeklyProgress, setActiveView, currentProject, submissions } = useApp();

  const nextWeek = submissions && submissions.length > 0
    ? String(Math.max(...submissions.map((s) => s.weekNumber)) + 1)
    : '1';

  const [weekNumber, setWeekNumber] = useState(nextWeek);
  const [completed, setCompleted] = useState('');
  const [currentWork, setCurrentWork] = useState('');
  const [blockers, setBlockers] = useState('');
  const [nextGoals, setNextGoals] = useState('');
  const [githubUrl, setGithubUrl] = useState(currentProject?.githubUrl || '');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    const mb = kb / 1024;
    return mb.toFixed(1) + ' MB';
  };

  const detectFileType = (filename: string, mime: string): 'pdf' | 'image' | 'ppt' | 'zip' => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) || mime.startsWith('image/')) {
      return 'image';
    }
    if (['ppt', 'pptx'].includes(ext) || mime.includes('presentation') || mime.includes('powerpoint')) {
      return 'ppt';
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mime.includes('zip') || mime.includes('compressed')) {
      return 'zip';
    }
    return 'pdf';
  };

  const processFiles = (fileList: FileList | File[]) => {
    setUploadError(null);
    const filesArray = Array.from(fileList);

    for (const file of filesArray) {
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`"${file.name}" exceeds the 10MB limit (${formatFileSize(file.size)}).`);
        return;
      }
    }

    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setUploadedFiles((prev) => [
          ...prev,
          {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            name: file.name,
            size: formatFileSize(file.size),
            type: detectFileType(file.name, file.type),
            url: result
          }
        ]);
      };
      reader.onerror = () => {
        setUploadError(`Failed to read "${file.name}".`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await submitWeeklyProgress({
      weekNumber,
      completedTasks: completed,
      currentWork,
      blockers,
      nextWeekGoals: nextGoals,
      githubUrl,
      files: uploadedFiles.map(({ name, size, type, url }) => ({ name, size, type, url }))
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
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={String(w)}>
                      Week {w}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 block mb-1.5 font-bold">Submission Date</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-500 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Today ({new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})</span>
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
                  placeholder="e.g. Built API endpoints, implemented database schemas, designed UI components..."
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
                  placeholder="e.g. Integrating client-side state with backend services, writing unit tests..."
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
                  placeholder="e.g. None or describe any technical challenges, latency bottlenecks, or questions for your mentor..."
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
                  placeholder="e.g. Complete frontend validation, deploy staging branch, prepare progress demo..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>
            </div>


            {/* Drag & Drop Upload Files */}
            <div className="space-y-3">
              <label className="text-slate-700 font-bold block">Upload Files (PDF, PPT, Images, etc.)</label>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.doc,.docx,.zip"
                onChange={handleFileInputChange}
                className="hidden"
                id="progress-file-input"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 select-none outline-none ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/70 ring-4 ring-blue-500/10 scale-[1.01]'
                    : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 focus:border-blue-500 focus:bg-blue-50/20'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center transition-all ${
                  isDragging ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/30' : 'bg-blue-50 text-blue-600'
                }`}>
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs text-slate-700 font-bold">
                  {isDragging ? 'Drop your files here to upload' : 'Click to upload or drag and drop'}
                </div>
                <p className="text-[11px] text-slate-400 font-normal">
                  Supports: PDF, PPT, JPG, PNG, DOC, ZIP (Max 10MB per file)
                </p>
              </div>

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="flex items-center justify-between bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs animate-fadeIn">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    className="text-rose-400 hover:text-rose-700 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Uploaded Files ({uploadedFiles.length})
                    </span>
                    <button
                      type="button"
                      onClick={clearAllFiles}
                      className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/90 rounded-xl hover:border-slate-300 transition-colors group"
                      >
                        <div className="flex items-center space-x-3 overflow-hidden pr-2">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                            {file.type === 'image' ? (
                              <ImageIcon className="w-4 h-4 text-blue-500" />
                            ) : file.type === 'ppt' ? (
                              <File className="w-4 h-4 text-amber-500" />
                            ) : (
                              <FileText className="w-4 h-4 text-rose-500" />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                              {file.name}
                            </p>
                            <span className="text-[10px] text-slate-400 font-semibold">{file.size}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.id);
                          }}
                          title="Remove file"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
