import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { Shield, Lock, Mail, User, AlertCircle, ShieldAlert, Zap, LogOut } from 'lucide-react';

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
    <div className="min-h-[90vh] flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-200">
      <div className="w-full max-w-md">
        {/* Revocation Alert Banner */}
        {revocationNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start space-x-3 shadow-xs">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Session Revocation Alert</p>
              <p className="text-xs font-medium text-slate-700 dark:text-neutral-300 mt-0.5">{revocationNotice}</p>
            </div>
          </div>
        )}

        {/* If user is already logged in, show current session pill */}
        {currentUser && (
          <div className="mb-6 p-3.5 rounded-2xl bg-white dark:bg-[#141414] border border-slate-200 dark:border-neutral-800 shadow-xs flex items-center justify-between">
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

        <div className="bg-white dark:bg-[#141414] p-8 rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-xl relative overflow-hidden transition-colors duration-200">
          {/* Top Branding */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md">
              <Shield className="w-8 h-8 text-white stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Vaultoran Security Portal</h1>
            <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-1 font-semibold">Zero-Trust Confidential Document Exchange</p>
          </div>

          {/* Quick 1-Click Role Login Bar */}
          <div className="mb-6 p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 text-slate-600 dark:text-neutral-400 text-[10px] font-mono uppercase tracking-wider font-bold">
                <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Instant 1-Click Role Login:</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-neutral-400">Auto-auth</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('admin@trustvault.io', 'AdminVault#2026!', 'admin')}
                className="py-2 px-2 rounded-xl bg-purple-50 dark:bg-neutral-800 hover:bg-purple-100 dark:hover:bg-neutral-700 border border-purple-200 dark:border-neutral-700 text-[11px] font-extrabold text-purple-700 dark:text-purple-300 transition text-center shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1"
              >
                {loading && activeQuickRole === 'admin' ? (
                  <>
                    <div className="w-3 h-3 border-2 border-purple-400 border-t-purple-700 rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Admin SOC</span>
                )}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('owner@trustvault.io', 'OwnerVault#2026!', 'owner')}
                className="py-2 px-2 rounded-xl bg-sky-50 dark:bg-neutral-800 hover:bg-sky-100 dark:hover:bg-neutral-700 border border-sky-200 dark:border-neutral-700 text-[11px] font-extrabold text-sky-700 dark:text-sky-300 transition text-center shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1"
              >
                {loading && activeQuickRole === 'owner' ? (
                  <>
                    <div className="w-3 h-3 border-2 border-sky-400 border-t-sky-700 rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Owner</span>
                )}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('viewer1@trustvault.io', 'Viewer1Vault#2026!', 'viewer')}
                className="py-2 px-2 rounded-xl bg-emerald-50 dark:bg-neutral-800 hover:bg-emerald-100 dark:hover:bg-neutral-700 border border-emerald-200 dark:border-neutral-700 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 transition text-center shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1"
              >
                {loading && activeQuickRole === 'viewer' ? (
                  <>
                    <div className="w-3 h-3 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Viewer</span>
                )}
              </button>
            </div>
          </div>

          {/* Tab Selector: Sign In and Sign Up */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-neutral-800 p-1 mb-6 border border-slate-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition cursor-pointer ${
                isLogin
                  ? 'bg-white dark:bg-[#222222] text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
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
                  ? 'bg-white dark:bg-[#222222] text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center space-x-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-800 dark:text-neutral-200 mb-1.5 font-bold">
                  Full Legal Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 dark:text-neutral-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 placeholder-slate-500 dark:placeholder-neutral-500 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-800 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-800 dark:text-neutral-200 mb-1.5 font-bold">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 dark:text-neutral-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@vaultoran.io"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 placeholder-slate-500 dark:placeholder-neutral-500 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-800 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-800 dark:text-neutral-200 mb-1.5 font-bold">
                Secret Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 dark:text-neutral-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 placeholder-slate-500 dark:placeholder-neutral-500 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-800 transition"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-800 dark:text-neutral-200 mb-1.5 font-bold">
                  Account Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-800 transition font-medium"
                >
                  <option value="viewer" className="dark:bg-neutral-800 dark:text-neutral-100">Viewer (Read-only / Delegated clearances)</option>
                  <option value="owner" className="dark:bg-neutral-800 dark:text-neutral-100">Document Owner (Upload & manage private vault)</option>
                </select>
                <p className="text-[11px] text-slate-600 dark:text-neutral-400 mt-1 font-mono font-medium">
                  *Admin credentials cannot be self-assigned for security integrity.
                </p>
              </div>
            )}

            {/* Transparent progress notification if cold boot is occurring */}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition shadow-sm flex items-center justify-center space-x-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{loadingSeconds >= 2 ? `Waking Enclave (${loadingSeconds}s)...` : 'Authenticating...'}</span>
                </>
              ) : (
                <span>{isLogin ? 'Sign In & Enter Vault' : 'Sign Up & Create Account'}</span>
              )}
            </button>
          </form>

          {/* Bottom toggle between Sign In and Sign Up */}
          <div className="mt-5 text-center text-xs">
            {isLogin ? (
              <p className="text-slate-600 dark:text-neutral-300 font-medium">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError('');
                  }}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </p>
            ) : (
              <p className="text-slate-600 dark:text-neutral-300 font-medium">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError('');
                  }}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
