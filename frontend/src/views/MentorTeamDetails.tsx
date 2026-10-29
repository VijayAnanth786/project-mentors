import React from 'react';
import { Github, Users, CheckCircle2, Clock, AlertCircle, FileText, ExternalLink, Calendar } from 'lucide-react';
import { useFetch } from '../hooks/useData';
import { api } from '../api/client';
import { Modal, LoadingState, ErrorState, StatusBadge, ProgressBar } from '../components/shared';

interface MentorTeamDetailsProps {
  teamId: string;
  open: boolean;
  onClose: () => void;
}

export const MentorTeamDetails: React.FC<MentorTeamDetailsProps> = ({ teamId, open, onClose }) => {
  const { data, loading, error, refetch } = useFetch(
    () => api.mentor.getTeamDetails(teamId),
    [teamId]
  );

  return (
    <Modal
      open={open}
      title={data?.team?.name || 'Team Details'}
      onClose={onClose}
      maxWidth="max-w-3xl"
    >
      {loading ? (
        <LoadingState message="Fetching team workspace and submission history..." />
      ) : error || !data ? (
        <ErrorState message={error || 'Unable to load team details.'} onRetry={refetch} />
      ) : (
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
          {/* Project Header */}
          {data.project ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{data.project.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{data.project.description}</p>
                </div>
                <StatusBadge status={data.project.status} />
              </div>

              {/* Progress */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Overall Project Progress</span>
                  <span>{data.project.progress}%</span>
                </div>
                <ProgressBar value={data.project.progress} />
              </div>

              {/* Tech Stack & Repo Link */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                <div className="flex flex-wrap gap-1.5">
                  {data.project.techStack?.map((t: string) => (
                    <span
                      key={t}
                      className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-600"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {data.project.repoUrl && (
                  <a
                    href={data.project.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>View GitHub Repository</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
              No project currently associated with this team.
            </div>
          )}

          {/* Team Members */}
          <section className="space-y-2.5">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Team Members ({data.members?.length || 0})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.members?.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl"
                >
                  <img
                    src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                    alt={member.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{member.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                        {member.team_role || 'Member'}
                      </span>
                      {member.roll_number && (
                        <span className="text-[10px] text-slate-400">{member.roll_number}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Milestones */}
          {data.project?.milestones && data.project.milestones.length > 0 && (
            <section className="space-y-2.5">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Project Milestones</span>
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
                {data.project.milestones.map((m: any) => (
                  <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800">{m.title}</span>
                      {m.deadline && (
                        <span className="text-[11px] text-slate-400 block">
                          Target: {m.deadline}
                        </span>
                      )}
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Weekly Submissions History */}
          <section className="space-y-2.5">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Weekly Submissions & Reports</span>
            </h4>
            {data.submissions && data.submissions.length > 0 ? (
              <div className="space-y-3">
                {data.submissions.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">Week {sub.week}</span>
                        <span className="text-xs text-slate-400">• {sub.date}</span>
                      </div>
                      <StatusBadge status={sub.status} />
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p>
                        <strong className="text-slate-800">Completed:</strong> {sub.work_completed}
                      </p>
                      {sub.current_work && (
                        <p>
                          <strong className="text-slate-800">In Progress:</strong> {sub.current_work}
                        </p>
                      )}
                      {sub.blockers && (
                        <p className="text-rose-600">
                          <strong>Blockers:</strong> {sub.blockers}
                        </p>
                      )}
                      {sub.feedback && (
                        <div className="mt-2 p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-slate-700">
                          <strong className="text-blue-900 text-[11px] uppercase tracking-wider block">
                            Mentor Feedback ({sub.reviewer_name || 'Assigned Mentor'}):
                          </strong>
                          <span className="mt-0.5 block">{sub.feedback}</span>
                        </div>
                      )}
                    </div>

                    {/* Attachments */}
                    {sub.attachments && sub.attachments.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {sub.attachments.map((file: any, idx: number) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>{file.name}</span>
                            <span className="text-slate-400">({file.size})</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl text-center">
                No weekly submissions filed by this team yet.
              </p>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
};