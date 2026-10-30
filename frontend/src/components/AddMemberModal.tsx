import React, { useState, useEffect } from 'react';
import { X, UserPlus, Loader2, Mail, Users, Trash2, CheckCircle2, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TeamMember } from '../types';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  members: TeamMember[];
  isLeader: boolean;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  teamId,
  teamName,
  members,
  isLeader
}) => {
  const { addTeamMember, removeTeamMember, getAvailableStudents, currentUser } = useApp();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoadingAvailable(true);
      getAvailableStudents()
        .then((list) => setAvailableStudents(list || []))
        .finally(() => setLoadingAvailable(false));
    }
  }, [isOpen, getAvailableStudents]);

  if (!isOpen) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await addTeamMember({
        studentEmail: email.trim(),
        studentName: name.trim() || undefined
      });
      setEmail('');
      setName('');
    } catch {
      // Toast handled by AppContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdd = async (student: any) => {
    setIsSubmitting(true);
    try {
      await addTeamMember({
        studentEmail: student.email,
        studentName: student.name
      });
    } catch {
      // Toast handled by AppContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member from the team?')) return;
    setRemovingId(memberId);
    try {
      await removeTeamMember(memberId);
    } catch {
      // Toast handled by AppContext
    } finally {
      setRemovingId(null);
    }
  };

  // Filter available students who are not already in this team
  const existingEmails = new Set(members.map((m) => (m.email || '').toLowerCase()));
  const unassignedStudents = availableStudents.filter(
    (s) =>
      !existingEmails.has(s.email?.toLowerCase()) &&
      (!searchTerm ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Manage Team Members</h2>
              <p className="text-xs text-slate-500 font-medium">
                {teamName} • {members.length} student{members.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Add Member Form (Team Leader only) */}
          {isLeader ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>Add Student to Team</span>
              </div>
              <form onSubmit={handleAddSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Student Email *
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@college.edu"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Student Name (optional)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Chen"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !email.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-500/20 inline-flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Teammate</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-800 font-medium">
              Only the <strong>Team Leader</strong> can add or remove members. You are currently viewing as a team member.
            </div>
          )}

          {/* Quick Select from Available Registered Students */}
          {isLeader && unassignedStudents.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Registered Students</span>
                <div className="relative w-44">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search students..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {unassignedStudents.slice(0, 5).map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-100 text-xs transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <img
                        src={student.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                        alt={student.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                      <div className="truncate">
                        <div className="font-bold text-slate-800 text-[11px] truncate">{student.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{student.email}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleQuickAdd(student)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Team Roster */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Current Roster ({members.length})
            </h3>

            <div className="space-y-2">
              {members.map((member) => {
                const isMemberLeader = member.role === 'Team Leader';
                const isMe = member.id === currentUser?.id || member.email?.toLowerCase() === currentUser?.email?.toLowerCase();

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                        alt={member.name}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-100 shadow-xs"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-xs">{member.name}</span>
                          {isMe && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                              You
                            </span>
                          )}
                        </div>
                        {member.email && (
                          <div className="text-[11px] text-slate-400 font-medium">{member.email}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isMemberLeader
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {isMemberLeader ? '★ Team Leader' : 'Member'}
                      </span>

                      {/* Remove button (Only Team Leader can remove non-leader members) */}
                      {isLeader && !isMemberLeader && (
                        <button
                          type="button"
                          disabled={removingId === member.id}
                          onClick={() => handleRemove(member.id)}
                          className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Remove member"
                        >
                          {removingId === member.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
