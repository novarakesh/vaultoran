import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../api/client';
import {
  Shield,
  Lock,
  Mail,
  User,
  AlertCircle,
  ShieldAlert,
  Zap,
  LogOut,
  Users,
  ShieldCheck,
  ArrowRight,
  Sun,
  Moon
} from 'lucide-react';

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode');
  const [isLogin, setIsLogin] = useState(initialMode !== 'signup');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [loading, setLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [activeQuickRole, setActiveQuickRole] = useState(null);
  const [serverStatus, setServerStatus] = useState(() => {
    return typeof window !== 'undefined' && window.__VAULTORAN_SERVER_WARM__ ? 'ready' : 'checking';
  });
  const [error, setError] = useState('');

  const { user: currentUser, login, register, logout, revocationNotice, setRevocationNotice } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Instant server health probe to wake Render backend and notify user
  useEffect(() => {
    let isMounted = true;
    let pollTimer;

    const pingEnclave = async () => {
      try {
        await apiClient.get('/api/health');
        if (isMounted) {
          setServerStatus('ready');
          if (typeof window !== 'undefined') window.__VAULTORAN_SERVER_WARM__ = true;
        }
      } catch (err) {
        if (isMounted) {
          setServerStatus('waking');
          pollTimer = setTimeout(pingEnclave, 3000);
        }
      }
    };

    pingEnclave();

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, []);

  // Track elapsed loading seconds to surface reassuring status during cold boots
  useEffect(() => {
    let timer;
    if (loading) {
      setLoadingSeconds(0);
      timer = setInterval(() => {
        setLoadingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setLoadingSeconds(0);
      setActiveQuickRole(null);
    }
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setIsLogin(false);
    } else if (searchParams.get('mode') === 'login') {
      setIsLogin(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setActiveQuickRole('custom');

    try {
      if (isLogin) {
        const loggedUser = await login(email, password);
        if (loggedUser.role === 'admin') navigate('/audit');
        else if (loggedUser.role === 'owner') navigate('/owner');
        else navigate('/viewer');
      } else {
        const newUser = await register(name, email, password, role);
        if (newUser.role === 'owner') navigate('/owner');
        else navigate('/viewer');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Instant 1-Click Role Login
  const handleQuickLogin = async (demoEmail, demoPassword, roleTag) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsLogin(true);
    setError('');
    setLoading(true);
    setActiveQuickRole(roleTag);
    if (setRevocationNotice) setRevocationNotice(null);

    try {
      const loggedUser = await login(demoEmail, demoPassword);
      if (loggedUser.role === 'admin') navigate('/audit');
      else if (loggedUser.role === 'owner') navigate('/owner');
      else navigate('/viewer');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#f6f8fc] dark:bg-[#0a0a0a] flex items-center justify-center p-4 sm:p-6 lg:p-12 font-sans selection:bg-indigo-100 selection:text-indigo-800 transition-colors duration-200">
      {/* Top-Right Theme Toggle */}
      <div className="absolute top-5 right-6 z-30">
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2.5 rounded-2xl text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md border border-slate-200/80 dark:border-neutral-700 shadow-sm transition cursor-pointer"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>

      {/* Top-Left Ambient Pastel Glow */}
      <div className="absolute -top-32 -left-32 w-[420px] h-[420px] bg-gradient-to-br from-indigo-200/60 via-purple-100/40 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Bottom-Left Smooth Organic Waves (Matching the screenshot exactly) */}
      <div className="absolute bottom-0 left-0 w-[520px] h-[340px] pointer-events-none overflow-hidden z-0">
        <svg viewBox="0 0 520 340" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-85 dark:opacity-20">
          <path
            d="M-40 340 C120 340 180 220 130 110 C90 20 20 -10 -40 -10 Z"
            fill="url(#wave1)"
          />
          <path
            d="M-40 340 C170 340 230 190 190 70 C160 -10 90 -30 -40 -30 Z"
            fill="url(#wave2)"
            opacity="0.6"
          />
          <path
            d="M-40 340 C240 340 310 240 260 140 C200 40 120 10 -40 10 Z"
            fill="url(#wave3)"
            opacity="0.4"
          />
          <defs>
            <linearGradient id="wave1" x1="0" y1="0" x2="280" y2="340" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a5b4fc" />
              <stop offset="1" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="wave2" x1="0" y1="0" x2="280" y2="340" gradientUnits="userSpaceOnUse">
              <stop stopColor="#c7d2fe" />
              <stop offset="1" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id="wave3" x1="0" y1="0" x2="360" y2="340" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e0e7ff" />
              <stop offset="1" stopColor="#a5b4fc" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[1240px] mx-auto relative z-10 my-auto py-4">
        {/* Revocation Alert Banner (if redirected after killswitch) */}
        {revocationNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start space-x-3 shadow-xs max-w-xl mx-auto">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Session Revocation Alert</p>
              <p className="text-xs font-medium text-slate-700 dark:text-neutral-300 mt-0.5">{revocationNotice}</p>
            </div>
          </div>
        )}

        {/* Existing Session Pill (if user is already logged in) */}
        {currentUser && (
          <div className="mb-6 p-3.5 rounded-2xl bg-white/90 dark:bg-[#141414]/90 backdrop-blur-md border border-slate-200 dark:border-neutral-800 shadow-xs flex items-center justify-between max-w-xl mx-auto">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                {currentUser.role[0]}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Signed in as <strong className="text-slate-900 dark:text-white font-bold">{currentUser.name}</strong>
                </p>
                <p className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 uppercase font-bold">
                  Role: {currentUser.role}
                </p>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-700 dark:text-neutral-300 hover:text-rose-700 dark:hover:text-rose-400 text-[11px] font-mono transition flex items-center space-x-1 border border-slate-200 dark:border-neutral-700 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span className="font-semibold">Sign Out</span>
            </button>
          </div>
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Left Hero & Features Column */}
          <div className="lg:col-span-7 flex flex-col justify-center relative pr-0 lg:pr-4">
            {/* Top Logo */}
            <div className="flex items-center space-x-3.5 mb-8 sm:mb-10">
              <div className="w-14 h-14 rounded-2xl bg-[#4338ca] flex items-center justify-center shadow-md shadow-indigo-600/25">
                <Shield className="w-7 h-7 text-white stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-[34px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                  Vaultoran
                </h1>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-2xs"></span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-[0.22em] leading-none">
                    ZERO-TRUST
                  </span>
                </div>
              </div>
            </div>

            {/* Main Headline */}
            <div className="mb-4 space-y-0.5">
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-slate-900 dark:text-white tracking-tight leading-[1.12]">
                Your Documents.
              </h2>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-[#4f46e5] dark:text-indigo-400 tracking-tight leading-[1.12]">
                Our Priority.
              </h2>
            </div>

            {/* Sub-paragraph */}
            <p className="text-[14px] sm:text-[15px] leading-relaxed text-slate-500 dark:text-neutral-400 font-normal max-w-[430px] mb-8 sm:mb-10">
              Vaultoran is a secure, zero-trust confidential document exchange platform, built for privacy, control and complete data security.
            </p>

            {/* 3 Feature Cards (Row) */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-[460px]">
              {/* Feature 1: Role-Based Access */}
              <div className="flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-[#ede9fe] dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/50 flex items-center justify-center text-[#6366f1] dark:text-purple-400 mb-2.5 shadow-2xs">
                  <Shield className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug">
                  Role-Based<br />Access
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-neutral-400 font-medium leading-tight mt-1">
                  Right people.<br />Right access.
                </p>
              </div>

              {/* Feature 2: Secure & Reliable */}
              <div className="flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/50 flex items-center justify-center text-[#0284c7] dark:text-sky-400 mb-2.5 shadow-2xs">
                  <Users className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug">
                  Secure &<br />Reliable
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-neutral-400 font-medium leading-tight mt-1">
                  Built for<br />peace of mind.
                </p>
              </div>

              {/* Feature 3: Confidential Documents */}
              <div className="flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-[#dcfce7] dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-[#16a34a] dark:text-emerald-400 mb-2.5 shadow-2xs">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug">
                  Confidential<br />Documents
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-neutral-400 font-medium leading-tight mt-1">
                  Your data,<br />your control.
                </p>
              </div>
            </div>

            {/* Central 3D Glowing Vault Graphic (Real static item with transparent background) */}
            <div className="hidden lg:block absolute -right-16 xl:-right-6 top-1/2 -translate-y-1/2 w-[260px] xl:w-[290px] pointer-events-none z-10 select-none">
              <img
                src="/vault-3d.png"
                alt="Vaultoran 3D Vault Illustration"
                className="w-full h-auto drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Right Column: Floating Login Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end relative z-20">
            <div className="w-full max-w-[430px] bg-white dark:bg-[#141414] p-7 sm:p-9 rounded-[32px] border border-slate-100 dark:border-neutral-800 shadow-[0_20px_50px_rgba(79,70,229,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden transition-colors duration-200">
              {/* Card Header with Shield Icon */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-[#4338ca] flex items-center justify-center shadow-md shadow-indigo-600/25">
                  <Shield className="w-7 h-7 text-white stroke-[2.5]" />
                </div>
                <h2 className="text-[22px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                  Vaultoran Security Portal
                </h2>
                <p className="text-[12px] text-slate-500 dark:text-neutral-400 font-mono mt-1 font-medium tracking-normal">
                  Zero-Trust Confidential Document Exchange
                </p>
              </div>

              {/* 1-Click Role Login Box */}
              <div className="mb-5 p-3 rounded-2xl bg-[#f8f9ff] dark:bg-neutral-800/80 border border-indigo-100/70 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center space-x-1.5 text-slate-600 dark:text-neutral-300 text-[10px] font-mono uppercase tracking-wider font-bold">
                    <Zap className="w-3.5 h-3.5 text-[#6366f1] fill-[#6366f1]/20" />
                    <span>INSTANT 1-CLICK ROLE LOGIN:</span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-neutral-400">
                    Auto-auth
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin('admin@trustvault.io', 'AdminVault#2026!', 'admin')}
                    className="py-2 px-1.5 rounded-xl bg-[#f3e8ff] dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 text-[11px] font-bold text-purple-700 dark:text-purple-300 transition text-center shadow-2xs disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1"
                  >
                    {loading && activeQuickRole === 'admin' ? (
                      <div className="w-3 h-3 border-2 border-purple-400 border-t-purple-700 rounded-full animate-spin"></div>
                    ) : (
                      <span>Admin SOC</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin('owner@trustvault.io', 'OwnerVault#2026!', 'owner')}
                    className="py-2 px-1.5 rounded-xl bg-[#f0f9ff] dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 text-[11px] font-bold text-sky-700 dark:text-sky-300 transition text-center shadow-2xs disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1"
                  >
                    {loading && activeQuickRole === 'owner' ? (
                      <div className="w-3 h-3 border-2 border-sky-400 border-t-sky-700 rounded-full animate-spin"></div>
                    ) : (
                      <span>Owner</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin('viewer1@trustvault.io', 'Viewer1Vault#2026!', 'viewer')}
                    className="py-2 px-1.5 rounded-xl bg-[#f0fdf4] dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 transition text-center shadow-2xs disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1"
                  >
                    {loading && activeQuickRole === 'viewer' ? (
                      <div className="w-3 h-3 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin"></div>
                    ) : (
                      <span>Viewer</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Segmented Tab Control: SIGN IN / SIGN UP */}
              <div className="flex rounded-xl bg-[#f1f4f9] dark:bg-neutral-800 p-1 mb-5 border border-slate-200/70 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition cursor-pointer ${
                    isLogin
                      ? 'bg-white dark:bg-[#222222] text-[#4338ca] dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition cursor-pointer ${
                    !isLogin
                      ? 'bg-white dark:bg-[#222222] text-[#4338ca] dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center space-x-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Login / Signup Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-neutral-300 mb-1.5 font-bold">
                      Full Legal Name
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-slate-400 dark:text-neutral-500 absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Eleanor Vance"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#f8fafc] dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-800 transition shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-neutral-300 mb-1.5 font-bold">
                    Corporate Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-400 dark:text-neutral-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@vaultoran.io"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#f8fafc] dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-800 transition shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-neutral-300 mb-1.5 font-bold">
                    Secret Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-neutral-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#f8fafc] dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-800 transition shadow-2xs"
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-neutral-300 mb-1.5 font-bold">
                      Account Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8fafc] dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-800 transition font-medium"
                    >
                      <option value="viewer" className="dark:bg-neutral-800 dark:text-neutral-100">Viewer (Read-only / Delegated clearances)</option>
                      <option value="owner" className="dark:bg-neutral-800 dark:text-neutral-100">Document Owner (Upload & manage private vault)</option>
                    </select>
                    <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1 font-mono font-medium">
                      *Admin credentials cannot be self-assigned for security integrity.
                    </p>
                  </div>
                )}

                {/* Progress bar if Render backend cold boot takes over 2s */}
                {loading && loadingSeconds >= 2 && (
                  <div className="p-3 my-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-center animate-pulse">
                    <div className="flex items-center justify-center space-x-2 text-indigo-700 dark:text-indigo-300 text-xs font-bold font-mono">
                      <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping"></div>
                      <span>Waking Cloud Enclave ({loadingSeconds}s)...</span>
                    </div>
                    <div className="w-full bg-indigo-200/50 dark:bg-indigo-900/40 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full animate-pulse w-3/4"></div>
                    </div>
                  </div>
                )}

                {/* Action Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl font-bold uppercase tracking-wider text-xs bg-[#4338ca] hover:bg-[#3730a3] text-white disabled:opacity-50 transition shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 mt-4 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{loadingSeconds >= 2 ? `Waking Enclave (${loadingSeconds}s)...` : 'Authenticating...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isLogin ? 'Sign In & Enter Vault' : 'Sign Up & Create Account'}</span>
                      <ArrowRight className="w-4 h-4 ml-0.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Card Footer */}
              <div className="mt-5 text-center text-xs">
                {isLogin ? (
                  <p className="text-slate-500 dark:text-neutral-400 font-medium">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(false);
                        setError('');
                      }}
                      className="font-bold text-[#4338ca] dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </p>
                ) : (
                  <p className="text-slate-500 dark:text-neutral-400 font-medium">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(true);
                        setError('');
                      }}
                      className="font-bold text-[#4338ca] dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
