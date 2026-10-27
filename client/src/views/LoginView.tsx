import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  User as UserIcon,
  Sparkles,
  KeyRound
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

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);

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

  // Google OAuth Client ID
  const GOOGLE_CLIENT_ID =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '910163127647-sb8vtk7ups5nma63orcndkrj5a2chbj4.apps.googleusercontent.com';

  // Google OAuth 2.0 response handler from full-page redirect or hash
  useEffect(() => {
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const idToken = hashParams.get('id_token');
      const error = hashParams.get('error');

      if (error) {
        setSubmitError(`Google Sign-In error: ${error}`);
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }

      if (accessToken || idToken) {
        setGoogleLoading(true);
        setSubmitError('');
        window.history.replaceState(null, '', window.location.pathname);
        googleLogin({ accessToken: accessToken || undefined, credential: idToken || undefined }).then((res) => {
          setGoogleLoading(false);
          if (!res.success) {
            setSubmitError(res.message || 'Google authentication failed.');
          }
        });
      }
    }
  }, [googleLogin]);

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
  }, [googleLogin, GOOGLE_CLIENT_ID]);

  // Redirect to official Google OAuth 2.0 endpoint
  const redirectToGoogleOAuth = () => {
    const redirectUri = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: 'email profile openid',
      prompt: 'select_account'
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  // Pure Google OAuth 2.0 Sign In Trigger
  const handleGoogleSignInClick = () => {
    setSubmitError('');
    setGoogleLoading(true);

    // 1. Try Google Identity Services OAuth 2.0 Token Client (Popup flow)
    if (window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              setGoogleLoading(false);
              if (tokenResponse.error !== 'access_denied') {
                setSubmitError(tokenResponse.error_description || 'Google sign-in was cancelled or encountered an error.');
              }
              return;
            }
            if (tokenResponse?.access_token) {
              const res = await googleLogin({ accessToken: tokenResponse.access_token });
              setGoogleLoading(false);
              if (!res.success) {
                setSubmitError(res.message || 'Google authentication failed.');
              }
            } else {
              setGoogleLoading(false);
            }
          },
          error_callback: (err: any) => {
            setGoogleLoading(false);
            console.warn('[Google OAuth Error Callback]', err);
            redirectToGoogleOAuth();
          }
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (oauthErr) {
        console.warn('[Google initTokenClient failed, redirecting]', oauthErr);
      }
    }

    // 2. Fallback to standard Google OAuth 2.0 redirect
    redirectToGoogleOAuth();
  };

  // 1. Handle Standard Email/Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setSubmitError('Please enter your email address (e.g. yourname@gmail.com).');
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
      setSubmitError('Please enter a valid email address (e.g. yourname@gmail.com).');
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
    <div className="min-h-screen bg-[#F0F2FD] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans">
      <div className="bg-white rounded-[32px] overflow-hidden shadow-2xl max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 min-h-[640px] border border-slate-100">

        {/* ======================================================== */}
        {/* LEFT PANEL: VIBRANT BRAND GRADIENT & GEOMETRIC SHOWCASE  */}
        {/* ======================================================== */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#38B6FF] via-[#4361EE] to-[#5A189A] p-8 sm:p-12 lg:p-14 flex flex-col justify-between text-white">
          {/* Subtle Geometric Polygons Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/30 rounded-full blur-2xl transform rotate-45" />
            <div className="absolute top-1/3 -right-20 w-80 h-80 bg-cyan-300/30 rounded-3xl blur-xl transform rotate-12" />
            <div className="absolute -bottom-20 left-10 w-96 h-96 bg-purple-900/40 rounded-full blur-2xl" />
            {/* Geometric Angled Panels */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 600" fill="none">
              <path d="M-50 150 L250 -50 L450 100 L150 300 Z" fill="white" fillOpacity="0.06" />
              <path d="M50 350 L400 150 L450 450 L100 650 Z" fill="white" fillOpacity="0.08" />
              <path d="M-100 450 L200 250 L350 550 L50 750 Z" fill="white" fillOpacity="0.05" />
            </svg>
          </div>

          {/* Brand Pill Badge */}
          <div className="relative z-10 flex items-center">
            <div className="inline-flex items-center gap-2.5 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#4361EE] to-[#38B6FF] flex items-center justify-center text-white shadow-xs">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="text-sm font-black text-slate-900 tracking-tight">ProjectMentor</span>
            </div>
          </div>

          {/* Hero Slogan & Message */}
          <div className="relative z-10 my-auto py-12 space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight leading-[1.15] text-white">
              Learn, Grow, and Succeed
            </h1>
            <p className="text-sm sm:text-base text-blue-100/90 font-medium leading-relaxed max-w-sm">
              Build your projects, track weekly milestone goals, and take the next step in your engineering journey.
            </p>
          </div>

          {/* Bottom Accent */}
          <div className="relative z-10 flex items-center gap-2 text-xs font-semibold text-blue-200/80">
            <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
            <span>Collegiate Project Governance Platform</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PANEL: CLEAN WHITE AUTHENTICATION DESK             */}
        {/* ======================================================== */}
        <div className="p-8 sm:p-12 lg:p-14 flex flex-col justify-between bg-white">
          {/* Top Bar: Mode Switcher */}
          <div className="flex items-center justify-end text-xs pb-4 border-b border-slate-100 min-h-[42px]">
            {mode !== 'change_password' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setSubmitError('');
                    setSuccessNotice('');
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-800 font-bold transition-all hover:bg-slate-50 cursor-pointer"
                >
                  {mode === 'login' ? 'Register' : 'Sign In'}
                </button>
              </div>
            )}
          </div>

          {/* Main Form Center Area */}
          <div className="py-6 my-auto max-w-sm w-full mx-auto space-y-5">
            {/* Form Title & Subtitle */}
            <div className="text-center space-y-1.5">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {mode === 'login'
                  ? 'Sign In to Your Account'
                  : mode === 'register'
                  ? 'Create Your Account'
                  : 'Update Temporary Password'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {mode === 'login'
                  ? 'Access your dashboard and continue your learning journey.'
                  : mode === 'register'
                  ? 'Join as a student to form project teams and submit weekly progress.'
                  : 'Enter a secure permanent password to activate your dashboard.'}
              </p>
            </div>

            {/* Error & Success Notices */}
            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}
            {successNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* Google Authentication Button */}
            {mode !== 'change_password' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleGoogleSignInClick}
                  disabled={loading || googleLoading}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-2xl shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
                >
                  {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                  ) : (
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                  )}
                  <span>Login with Google</span>
                </button>

                {/* Divider */}
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[11px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">
                    or
                  </span>
                  <div className="border-t border-slate-200 w-full" />
                </div>
              </div>
            )}

            {/* 1. SIGN IN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setSubmitError('');
                    }}
                    placeholder="Email"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-xs"
                  />
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setSubmitError('');
                      }}
                      placeholder="Password"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
                    className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer text-xs"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <span>Login</span>
                    )}
                  </button>
                </div>

                {/* Forgot Password Link */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-slate-500 hover:text-indigo-600 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>
            )}

            {/* 2. REGISTRATION FORM */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3 text-xs font-semibold">
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />

                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />

                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Tech">Information Tech</option>
                    <option value="Electronics & Comm">Electronics</option>
                    <option value="Mechanical Eng">Mechanical</option>
                  </select>

                  <select
                    value={regYear}
                    onChange={(e) => setRegYear(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create Password (min. 6 chars)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <input
                  type="password"
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || googleLoading}
                    className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer text-xs"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <span>Complete Registration</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* 3. MANDATORY PASSWORD CHANGE FORM */}
            {mode === 'change_password' && (
              <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs font-semibold">
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current Temporary Password"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />

                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Secure Password (min. 6 chars)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer text-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Set Password & Open Dashboard</span>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer Copyright */}
          <div className="text-center text-[11px] text-slate-400 pt-4 border-t border-slate-100">
            © {new Date().getFullYear()} ProjectMentor Platform • College Project Monitoring
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: FORGOT PASSWORD GUIDANCE MODAL                     */}
      {/* ======================================================== */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-black text-slate-900">Password Recovery</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              For security compliance in college project governance, passwords are encrypted via salted hashes. If you have misplaced your password:
            </p>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs space-y-2 text-slate-700">
              <div>
                <strong className="block text-slate-900 font-bold mb-0.5">Students:</strong>
                Contact your Department Project Coordinator or College Administrator (<span className="text-indigo-600 font-semibold">admin@gmail.com</span>) to reset your temporary access key.
              </div>
              <div>
                <strong className="block text-slate-900 font-bold mb-0.5">Faculty Mentors:</strong>
                Admins can re-issue credentials from the Admin Mentor Directory.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
