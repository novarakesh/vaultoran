import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, User, AlertCircle, ShieldAlert, Zap, LogOut } from 'lucide-react';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user: currentUser, login, register, logout, revocationNotice, setRevocationNotice } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

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
  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsLogin(true);
    setError('');
    setLoading(true);
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
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Revocation Alert Banner */}
        {revocationNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-cyber-rose/10 border border-cyber-rose/30 shadow-glow-rose flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-cyber-rose flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cyber-rose">Session Revocation Alert</p>
              <p className="text-xs text-slate-300 mt-0.5">{revocationNotice}</p>
            </div>
          </div>
        )}

        {/* If user is already logged in, show current session pill */}
        {currentUser && (
          <div className="mb-6 p-3.5 rounded-2xl bg-vault-900 border border-cyber-cyan/30 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyber-cyan/15 text-cyber-cyan flex items-center justify-center font-bold text-xs uppercase">
                {currentUser.role[0]}
              </div>
              <div>
                <p className="text-xs text-slate-300">
                  Signed in as <strong className="text-white">{currentUser.name}</strong>
                </p>
                <p className="text-[10px] font-mono text-cyber-cyan uppercase font-bold">
                  Role: {currentUser.role}
                </p>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="px-2.5 py-1.5 rounded-lg bg-vault-800 hover:bg-cyber-rose/20 text-slate-300 hover:text-cyber-rose text-[11px] font-mono transition flex items-center space-x-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Switch User</span>
            </button>
          </div>
        )}

        <div className="glass-panel p-8 rounded-3xl border-white/10 shadow-2xl relative overflow-hidden">
          {/* Top Cyber Branding */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center shadow-glow-cyan">
              <Shield className="w-8 h-8 text-vault-950 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">TrustVault Security Portal</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">Zero-Trust Confidential Document Exchange</p>
          </div>

          {/* Quick 1-Click Role Login Bar */}
          <div className="mb-6 p-3.5 rounded-2xl bg-vault-900/90 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] font-mono uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-cyber-cyan" />
                <span>Instant 1-Click Role Login:</span>
              </div>
              <span className="text-[9px] font-mono text-slate-500">Auto-auth</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('admin@trustvault.io', 'AdminVault#2026!')}
                className="py-2 px-2 rounded-xl bg-cyber-purple/15 hover:bg-cyber-purple/30 border border-cyber-purple/40 text-[11px] font-extrabold text-cyber-purple transition shadow-glow-purple text-center disabled:opacity-50"
              >
                Admin SOC
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('owner@trustvault.io', 'OwnerVault#2026!')}
                className="py-2 px-2 rounded-xl bg-cyber-cyan/15 hover:bg-cyber-cyan/30 border border-cyber-cyan/40 text-[11px] font-extrabold text-cyber-cyan transition shadow-glow-cyan text-center disabled:opacity-50"
              >
                Owner
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('viewer1@trustvault.io', 'Viewer1Vault#2026!')}
                className="py-2 px-2 rounded-xl bg-cyber-emerald/15 hover:bg-cyber-emerald/30 border border-cyber-emerald/40 text-[11px] font-extrabold text-cyber-emerald transition shadow-glow-emerald text-center disabled:opacity-50"
              >
                Viewer
              </button>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex rounded-xl bg-vault-900 p-1 mb-6 border border-white/5">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition ${
                isLogin ? 'bg-cyber-cyan text-vault-950 shadow-glow-cyan' : 'text-slate-400 hover:text-white'
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
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition ${
                !isLogin ? 'bg-cyber-cyan text-vault-950 shadow-glow-cyan' : 'text-slate-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-cyber-rose/10 border border-cyber-rose/30 flex items-center space-x-2.5 text-cyber-rose text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Full Legal Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-vault-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@trustvault.io"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-vault-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyber-cyan"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                Secret Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-vault-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyber-cyan"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Account Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-vault-900 border border-white/10 text-white text-sm focus:outline-none focus:border-cyber-cyan"
                >
                  <option value="viewer">Viewer (Read-only / Delegated shares)</option>
                  <option value="owner">Document Owner (Upload & manage private vault)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">
                  *Admin credentials cannot be self-assigned for security integrity.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs bg-cyber-cyan text-vault-950 hover:bg-cyan-300 disabled:opacity-50 transition shadow-glow-cyan flex items-center justify-center space-x-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-vault-950/20 border-t-vault-950 rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>{isLogin ? 'Authenticate & Enter Vault' : 'Create Verified Identity'}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
