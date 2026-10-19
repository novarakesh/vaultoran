import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, User, AlertCircle, CheckCircle, ShieldAlert, Zap } from 'lucide-react';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register, revocationNotice, setRevocationNotice } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const user = await login(email, password);
        if (user.role === 'admin') navigate('/audit');
        else if (user.role === 'owner') navigate('/owner');
        else navigate('/viewer');
      } else {
        const user = await register(name, email, password, role);
        if (user.role === 'owner') navigate('/owner');
        else navigate('/viewer');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Account Auto-filler
  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsLogin(true);
    setError('');
    if (setRevocationNotice) setRevocationNotice(null);
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

        <div className="glass-panel p-8 rounded-3xl border-white/10 shadow-2xl relative overflow-hidden">
          {/* Top Cyber Branding */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center shadow-glow-cyan">
              <Shield className="w-8 h-8 text-vault-950 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">TrustVault Security Portal</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">Zero-Trust Confidential Document Exchange</p>
          </div>

          {/* Quick Demo Credentials Bar */}
          <div className="mb-6 p-3 rounded-2xl bg-vault-900/80 border border-white/5">
            <div className="flex items-center space-x-1.5 mb-2 text-slate-400 text-[10px] font-mono uppercase tracking-wider">
              <Zap className="w-3 h-3 text-cyber-cyan" />
              <span>One-Click Role Preset:</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@trustvault.io', 'AdminVault#2026!')}
                className="py-1 px-2 rounded-lg bg-cyber-purple/15 hover:bg-cyber-purple/25 border border-cyber-purple/30 text-[11px] font-bold text-cyber-purple transition"
              >
                Admin SOC
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('owner@trustvault.io', 'OwnerVault#2026!')}
                className="py-1 px-2 rounded-lg bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan/30 text-[11px] font-bold text-cyber-cyan transition"
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('viewer1@trustvault.io', 'Viewer1Vault#2026!')}
                className="py-1 px-2 rounded-lg bg-cyber-emerald/15 hover:bg-cyber-emerald/25 border border-cyber-emerald/30 text-[11px] font-bold text-cyber-emerald transition"
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
