import React, { useState } from 'react';
import { GraduationCap, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LoginView: React.FC = () => {
  const { setActiveView, setCurrentUser, users, mentors } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setSubmitError('Please enter your name or email.');
      return;
    }

    if (!password || password.length < 3) {
      setSubmitError('Please enter your password (min 3 characters).');
      return;
    }

    setSubmitError('');

    const account = [...users, ...mentors].find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase() && candidate.password === password);
    if (!account) {
      setSubmitError('Invalid demo account or password.');
      return;
    }
    setCurrentUser(account);
    setActiveView(account.role === 'admin' ? 'admin_dashboard' : 'home');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-900 to-slate-950">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-6">

        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/30">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">ProjectMentor</h1>
          <p className="text-xs font-semibold text-slate-400">Role-based project monitoring platform</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold">

          {/* Email or Name Input */}
          <div>
            <label className="text-slate-700 block mb-1">
              Email / Student ID
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSubmitError('');
              }}
              placeholder="e.g. admin@college.edu"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSubmitError('');
                }}
                placeholder="Enter password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Global error */}
          {submitError && (
            <p className="text-[11px] text-red-500 font-semibold">{submitError}</p>
          )}

          {/* Submit */}
          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
          Demo accounts: vijay@college.edu / student123, admin@college.edu / admin123, mentor@college.edu / mentor123.
        </div>

        <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-100">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Secure Student Access</span>
        </div>
      </div>
    </div>
  );
};
