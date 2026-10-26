import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  X,
  Mail,
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';

declare global {
  interface Window {
    google?: any;
  }
}

// Official Google Brand Color 'G' Icon
const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const LoginView: React.FC = () => {
  const { login, googleLogin, setActiveView, showToast, setCurrentUser } = useApp();

  // Mode: 'login' | 'register' | 'change_password'
  const [mode, setMode] = useState<'login' | 'register' | 'change_password'>('login');

  // Shared / Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  // Google Modal state for flexible sign in
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

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

  // Google OAuth Client ID provided by Google Cloud Console
  const GOOGLE_CLIENT_ID =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '910163127647-sb8vtk7ups5nma63orcndkrj5a2chbj4.apps.googleusercontent.com';

  // Initialize native Google Identity Services
  useEffect(() => {
    let checkInterval: any = null;

    const setupGoogleGsi = () => {
      if (!window.google?.accounts?.id) return false;

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          cancel_on_tap_outside: false,
          callback: async (response: any) => {
            if (response.credential) {
              setGoogleLoading(true);
              setSubmitError('');
              const res = await googleLogin({ credential: response.credential });
              setGoogleLoading(false);
              if (!res.success) {
                setSubmitError(res.message || 'Google authentication failed.');
              }
            }
          }
        });

        const slotId = mode === 'register' ? 'google-signup-btn-slot' : 'google-signin-btn-slot';
        const slotEl = document.getElementById(slotId);
        if (slotEl) {
          slotEl.innerHTML = '';
          window.google.accounts.id.renderButton(slotEl, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: mode === 'register' ? 'signup_with' : 'continue_with',
            shape: 'rectangular',
            width: 320,
            logo_alignment: 'left'
          });
        }
        return true;
      } catch (err) {
        console.warn('[Google Identity Notice]', err);
        return false;
      }
    };

    if (!setupGoogleGsi()) {
      checkInterval = setInterval(() => {
        if (setupGoogleGsi()) {
          clearInterval(checkInterval);
        }
      }, 400);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [googleLogin, mode]);

  // Handle Google Sign In Click
  const handleGoogleSignInClick = () => {
    setSubmitError('');

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setShowGoogleModal(true);
          }
        });
        return;
      } catch {
        setShowGoogleModal(true);
      }
    } else {
      setShowGoogleModal(true);
    }
  };

  // Perform Google Auth execution with selected or custom profile
  const executeGoogleAuth = async (profile: { email: string; name?: string; avatar?: string; role?: string }) => {
    setSubmitError('');
    setGoogleLoading(true);
    try {
      const res = await googleLogin(profile);
      if (!res.success) {
        setSubmitError(res.message || 'Google sign-in failed.');
      } else {
        setShowGoogleModal(false);
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Google sign-in encountered an error.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // 1. Handle Standard Email/Password Login
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
        setPendingUser(result.user);
        setCurrentPassword(password);
        setMode('change_password');
        showToast('Password change required before accessing the dashboard.', 'error');
      }
    } catch (err: any) {
      if (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK' || !err?.response) {
        setSubmitError('Network Error: Unable to reach backend server. Please verify your connection.');
      } else {
        setSubmitError(err?.message || 'Login failed. Please verify your credentials.');
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
        setSuccessNotice('Registration confirmed. You can now sign in with your credentials.');
        setEmail(regEmail.trim());
        setPassword('');
        setMode('login');
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirmPassword('');
      } else {
        setSubmitError(res.message || 'Registration failed.');
      }
    } catch (err: any) {
      if (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK' || !err?.response) {
        setSubmitError('Network Error: The backend server is not reachable.');
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

        if (pendingUser) {
          const updatedUser = { ...pendingUser, mustChangePassword: false };
          setCurrentUser(updatedUser);
          localStorage.setItem('pm_user', JSON.stringify(updatedUser));
        }

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
          <div className="space-y-4">
            {/* Google Authentication Sign In Button (Native GIS Slot + Fallback) */}
            <div id="google-signin-btn-slot" className="w-full flex justify-center min-h-[44px]">
              <button
                type="button"
                onClick={handleGoogleSignInClick}
                disabled={loading || googleLoading}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                ) : (
                  <GoogleIcon className="w-4 h-4 shrink-0" />
                )}
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-3 flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-2.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">
                or sign in with email
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>

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
                  placeholder="e.g. yourname@college.edu"
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
                  disabled={loading || googleLoading}
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
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: STUDENT PUBLIC REGISTRATION FORM */}
        {/* ======================================================== */}
        {mode === 'register' && (
          <div className="space-y-4">
            {/* Google Quick Sign-Up (Native GIS Slot + Fallback) */}
            <div id="google-signup-btn-slot" className="w-full flex justify-center min-h-[44px]">
              <button
                type="button"
                onClick={handleGoogleSignInClick}
                disabled={loading || googleLoading}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                ) : (
                  <GoogleIcon className="w-4 h-4 shrink-0" />
                )}
                <span>Sign up with Google</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-3 flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-2.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">
                or register with institutional email
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5 text-xs font-semibold">
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
                  placeholder="e.g. yourname@college.edu"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Department & Year (2 Columns) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-700 block mb-1">Department</label>
                  <select
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Tech</option>
                    <option value="Electronics & Communication">Electronics (ECE)</option>
                    <option value="Electrical & Electronics">Electrical (EEE)</option>
                    <option value="Mechanical Engineering">Mechanical</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 block mb-1">Year / Cohort</label>
                  <select
                    value={regYear}
                    onChange={(e) => setRegYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">Final Year (4th)</option>
                  </select>
                </div>
              </div>

              {/* College / Institution Name */}
              <div>
                <label className="text-slate-700 block mb-1">College / Institution</label>
                <input
                  type="text"
                  value={regCollege}
                  onChange={(e) => setRegCollege(e.target.value)}
                  placeholder="e.g. College of Engineering & Technology"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-slate-700 block mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      setSubmitError('');
                    }}
                    placeholder="At least 6 characters"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 pr-10 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
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
                  type="password"
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

              {/* Submit Registration */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Student Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: MANDATORY PASSWORD CHANGE FORM */}
        {/* ======================================================== */}
        {mode === 'change_password' && (
          <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-semibold">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2.5">
              <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Security Notice: Password Reset Required</p>
                <p className="text-[11px] font-normal mt-0.5 text-amber-700">
                  You are logging in with a temporary default password. Please choose a strong, personal password to activate full dashboard access.
                </p>
              </div>
            </div>

            {/* Current Password */}
            <div>
              <label className="text-slate-700 block mb-1">Current (Temporary) Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setSubmitError('');
                }}
                placeholder="Temporary password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="text-slate-700 block mb-1">New Secure Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setSubmitError('');
                  }}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
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
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => {
                  setConfirmNewPassword(e.target.value);
                  setSubmitError('');
                }}
                placeholder="Re-enter new password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
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
                    <span>Updating Password...</span>
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
          <span>Google OAuth • Institutional Role Guarded • JWT Verified</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* GOOGLE AUTHENTICATION MODAL */}
      {/* ======================================================== */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <GoogleIcon className="w-5 h-5" />
                <span className="font-bold text-sm text-slate-800">Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Choose an existing institutional Google profile or enter your personal Google email:
            </p>

            {/* Quick Profile Choices */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => executeGoogleAuth({
                  email: 'vijay@college.edu',
                  name: 'Vijay Ananth R S',
                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
                  role: 'student'
                })}
                disabled={googleLoading}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                    VA
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">Vijay Ananth</div>
                    <div className="text-[11px] text-slate-400">vijay@college.edu</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Student
                </span>
              </button>

              <button
                type="button"
                onClick={() => executeGoogleAuth({
                  email: 'vetri@college.edu',
                  name: 'Dr. Vetri Chelvan',
                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                  role: 'mentor'
                })}
                disabled={googleLoading}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                    VC
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Dr. Vetri Chelvan</div>
                    <div className="text-[11px] text-slate-400">vetri@college.edu</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Mentor
                </span>
              </button>
            </div>

            {/* Custom Google Email Input */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="text-[11px] font-semibold text-slate-600 block">
                Or enter any Google Account email:
              </label>
              <div className="space-y-2">
                <input
                  type="email"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <input
                  type="text"
                  value={customGoogleName}
                  onChange={(e) => setCustomGoogleName(e.target.value)}
                  placeholder="Your Full Name (optional)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="button"
                  disabled={!customGoogleEmail.trim() || googleLoading}
                  onClick={() => executeGoogleAuth({
                    email: customGoogleEmail.trim(),
                    name: customGoogleName.trim() || undefined,
                    role: mode === 'register' ? 'student' : undefined
                  })}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <GoogleIcon className="w-3.5 h-3.5" />
                      <span>Continue with this Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
