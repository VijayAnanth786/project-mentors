import React, { useState } from 'react';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const MentorCreationView: React.FC = () => {
  const { createMentor, mentors } = useApp();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    createMentor(form);
    setForm({ name: '', email: '', password: '' });
    setMessage('Mentor created successfully.');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Admin tools</p><h1 className="text-3xl font-black text-slate-900 mt-2">Manage mentors</h1><p className="text-sm text-slate-500 mt-2">Create mentor accounts and review the current mentor directory.</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6">
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><UserPlus className="w-5 h-5" /></div><h2 className="font-extrabold text-slate-900">New mentor</h2></div>
          {(['name', 'email', 'password'] as const).map((field) => <label key={field} className="block text-xs font-bold text-slate-700"><span className="capitalize">{field}</span><input required type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" /></label>)}
          {message && <p className="flex items-center gap-2 text-xs font-bold text-emerald-600"><CheckCircle2 className="w-4 h-4" />{message}</p>}
          <button className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700" type="submit">Create mentor</button>
        </form>
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"><div className="flex items-center justify-between mb-5"><h2 className="font-extrabold text-slate-900">Mentor directory</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{mentors.length} created</span></div>{mentors.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No custom mentors yet.</p> : <div className="space-y-3">{mentors.map((mentor) => <div key={mentor.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-4"><div><p className="text-sm font-bold text-slate-900">{mentor.name}</p><p className="text-xs text-slate-500">{mentor.email}</p></div><span className="text-xs font-bold text-emerald-600">Active</span></div>)}</div>}</section>
      </div>
    </div>
  );
};