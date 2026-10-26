import React, { useState } from 'react';
import {
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';

export const LoginView: React.FC = () => {
  const { login, setActiveView, showToast, setCurrentUser } = useApp();

  // Mode: 'login' | 'register' | 'change_password'
  const [mode, setMode] = useState<'login' | 'register' | 'change_password'>('login');

  // Shared / Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  // Student Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regDept, setRegDept] = useState('Computer Science');
  const [regYear, setRegYear] = useState('3rd Year');
  const [regCollege, setRegCollege] = useState('College of Engineering');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Mandatory Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [pendingUser, setPendingUser] = useState<any | null>(null);

  // 1. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setSubmitError('Please enter your institutional email address.');
      return;
    }

    if (!password) {
      setSubmitError('Please enter your password.');
      return;
    }

    setSubmitError('');
    setSuccessNotice('');
    setLoading(true);

    try {
      const result = await login({ email: email.trim(), password });
      if (!result.success) {
        setSubmitError(result.message || 'Invalid email or password.');
      } else if (result.mustChangePassword) {
        // Mentor or account requires immediate password change
        setPendingUser(result.user);
        setCurrentPassword(password); // Pre-fill with the credentials just verified
        setMode('change_password');
        showToast('Password change required before accessing the dashboard.', 'error');
      }
    } catch (err: any) {
      if (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK' || !err?.response) {
        setSubmitError('Network Error: Unable to reach backend on http://localhost:5000. Ensure the backend has connected to MongoDB Atlas and is running.');
      } else {
        setSubmitError(err?.message || 'Login failed. Please verify your credentials and network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Student Public Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regName.trim() || regName.trim().length < 2) {
      setSubmitError('Please enter your full name (at least 2 characters).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regEmail.trim() || !emailRegex.test(regEmail.trim())) {
      setSubmitError('Please enter a valid institutional email address.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setSubmitError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitError('');
    setLoading(true);

    try {
      const res = await api.auth.register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        department: regDept,
        year: regYear,
        college: regCollege
      });

      if (res.success) {
        showToast('Account registered successfully! Please sign in.', 'success');
        setSuccessNotice('Registration confirmed in MongoDB Atlas. You can now sign in with your credentials.');
        setEmail(regEmail.trim());
        setPassword('');
        setMode('login');
        // Clear registration form
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirmPassword('');
      } else {
        setSubmitError(res.message || 'Registration failed.');
      }
    } catch (err: any) {
      if (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK' || !err?.response) {
        setSubmitError('Network Error: The backend server at http://localhost:5000 is not reachable. The server waits for MongoDB Atlas to connect before accepting requests. Please ensure your current IP (106.192.173.136) is whitelisted in your MongoDB Atlas Network Access.');
      } else {
        setSubmitError(err?.response?.data?.message || err?.message || 'Registration failed. An account with this email may already exist.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Mandatory Password Change (for Mentors on First Login)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      setSubmitError('Please enter your current temporary password.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setSubmitError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setSubmitError('New passwords do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setSubmitError('New password must be different from your temporary password.');
      return;
    }

    setSubmitError('');
    setLoading(true);

    try {
      const res = await api.auth.changePassword({
        currentPassword,
        newPassword
      });

      if (res.success) {
        showToast('Password updated successfully! Welcome to your dashboard.', 'success');

        // Update local session
        if (pendingUser) {
          const updatedUser = { ...pendingUser, mustChangePassword: false };
          setCurrentUser(updatedUser);
          localStorage.setItem('pm_user', JSON.stringify(updatedUser));
        }

        // Navigate to appropriate role dashboard
        const role = (pendingUser?.role || '').toLowerCase();
        const targetPath = role === 'admin' ? '/admin/dashboard' : role === 'mentor' ? '/mentor/dashboard' : '/student/dashboard';
        window.history.pushState({}, '', targetPath);

        if (role === 'admin') setActiveView('admin_dashboard');
        else if (role === 'mentor') setActiveView('mentor_dashboard');
        else setActiveView('home');
      } else {
        setSubmitError(res.message || 'Password update failed.');
      }
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Password update failed. Verify current credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-900 to-slate-950">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-6">

        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/30">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">ProjectMentor</h1>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            BUILD • LEARN • GROW
          </p>
        </div>

        {/* Mode Selector Tabs (only shown if not in mandatory change-password mode) */}
        {mode !== 'change_password' && (
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setSubmitError('');
                setSuccessNotice('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setSubmitError('');
                setSuccessNotice('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Student Register</span>
            </button>
          </div>
        )}

        {/* Success Notice */}
        {successNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Error Message */}
        {submitError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: SIGN IN FORM */}
        {/* ======================================================== */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold">
            {/* Email */}
            <div>
              <label className="text-slate-700 block mb-1">Institutional Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSubmitError('');
                }}
                placeholder="e.g. vetri@college.edu or vijay@college.edu"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Quick Demo Credentials Helper */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[11px] text-slate-500 font-medium text-center">
                Quick Demo Credentials (Password: <code className="text-blue-600 font-mono font-bold">siet@2727</code>):
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('vijay@college.edu');
                    setPassword('siet@2727');
                    setSubmitError('');
                  }}
                  className="px-2 py-1.5 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors text-center cursor-pointer"
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('vetri@college.edu');
                    setPassword('siet@2727');
                    setSubmitError('');
                  }}
                  className="px-2 py-1.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors text-center cursor-pointer"
                >
                  Mentor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@college.edu');
                    setPassword('siet@2727');
                    setSubmitError('');
                  }}
                  className="px-2 py-1.5 text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors text-center cursor-pointer"
                >
                  Admin
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: STUDENT PUBLIC REGISTRATION FORM */}
        {/* ======================================================== */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5 text-xs font-semibold">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-[11px] font-medium">
              Student Registration assigns <strong>STUDENT</strong> role and automatically registers your profile in MongoDB Atlas.
            </div>

            {/* Full Name */}
            <div>
              <label className="text-slate-700 block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => {
                  setRegName(e.target.value);
                  setSubmitError('');
                }}
                placeholder="e.g. Vijay Ananth R S"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-slate-700 block mb-1">Institutional Email</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => {
                  setRegEmail(e.target.value);
                  setSubmitError('');
                }}
                placeholder="e.g. vijay@college.edu"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Department & Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 block mb-1">Department</label>
                <select
                  value={regDept}
                  onChange={(e) => setRegDept(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics & Comm</option>
                  <option value="Mechanical Engineering">Mechanical</option>
                  <option value="Electrical Engineering">Electrical</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 block mb-1">Year Cohort</label>
                <select
                  value={regYear}
                  onChange={(e) => setRegYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-slate-700 block mb-1">Create Password (min 6 characters)</label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    setSubmitError('');
                  }}
                  placeholder="Choose a strong password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 pr-10 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-slate-700 block mb-1">Confirm Password</label>
              <input
                type={showRegPassword ? 'text' : 'password'}
                required
                value={regConfirmPassword}
                onChange={(e) => {
                  setRegConfirmPassword(e.target.value);
                  setSubmitError('');
                }}
                placeholder="Re-enter password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Submit Register Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering with MongoDB...</span>
                  </>
                ) : (
                  <>
                    <span>Create Student Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: MANDATORY PASSWORD CHANGE SCREEN */}
        {/* ======================================================== */}
        {mode === 'change_password' && (
          <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-semibold">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Password Change Required</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed font-normal">
                Your account was created with a temporary password. Please set a new personal password to unlock full dashboard access.
              </p>
            </div>

            {/* Current Temporary Password */}
            <div>
              <label className="text-slate-700 block mb-1">Current Temporary Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="text-slate-700 block mb-1">New Personal Password (min 6 characters)</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="text-slate-700 block mb-1">Confirm New Password</label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Submit Password Change */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password in MongoDB...</span>
                  </>
                ) : (
                  <>
                    <span>Set New Password & Enter Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer Security Badging */}
        <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-100">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>MongoDB Atlas • Role Guarded • Salted Bcrypt</span>
        </div>
      </div>
    </div>
  );
};
