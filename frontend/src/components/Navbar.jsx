import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  FileText,
  Eye,
  Activity,
  LogOut,
  Radio,
  KeyRound,
  User,
  AlertTriangle
} from 'lucide-react';

const Navbar = () => {
  const { user, logout, logoutAll, isAdmin, isOwner, isViewer } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const handleRevokeAll = async () => {
    setRevoking(true);
    await logoutAll();
    setRevoking(false);
    setShowRevokeConfirm(false);
    navigate('/login');
  };

  const navItemClass = (path) => {
    const isActive = location.pathname === path;
    return `flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
      isActive
        ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30 shadow-glow-cyan'
        : 'text-slate-400 hover:text-slate-200 hover:bg-vault-850 border border-transparent'
    }`;
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-cyber-purple/20 text-cyber-purple border-cyber-purple/40';
      case 'owner':
        return 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/40';
      case 'viewer':
      default:
        return 'bg-cyber-emerald/20 text-cyber-emerald border-cyber-emerald/40';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/5 bg-vault-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Live Status */}
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center shadow-glow-cyan">
                  <Shield className="w-5 h-5 text-vault-950 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-lg font-extrabold tracking-tight text-white group-hover:text-cyber-cyan transition">
                    Trust<span className="text-cyber-cyan">Vault</span>
                  </span>
                  <div className="flex items-center space-x-1.5 -mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald animate-cyber-pulse"></span>
                    <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase">Zero-Trust</span>
                  </div>
                </div>
              </Link>

              {/* Render Backend Connection Indicator */}
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-vault-900 border border-white/5 text-[11px] font-mono text-slate-400">
                <Radio className="w-3 h-3 text-cyber-emerald animate-pulse" />
                <span className="text-slate-500">Live API:</span>
                <span className="text-cyber-cyan font-bold">Render</span>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            {user && (
              <nav className="hidden md:flex items-center space-x-2">
                {isAdmin && (
                  <Link to="/audit" className={navItemClass('/audit')}>
                    <Activity className="w-3.5 h-3.5 text-cyber-rose" />
                    <span>Admin Audit SOC</span>
                  </Link>
                )}
                {(isOwner || isAdmin) && (
                  <Link to="/owner" className={navItemClass('/owner')}>
                    <FileText className="w-3.5 h-3.5 text-cyber-cyan" />
                    <span>Owner Portal</span>
                  </Link>
                )}
                {(isViewer || isAdmin) && (
                  <Link to="/viewer" className={navItemClass('/viewer')}>
                    <Eye className="w-3.5 h-3.5 text-cyber-emerald" />
                    <span>Viewer Dashboard</span>
                  </Link>
                )}
              </nav>
            )}

            {/* User Profile & Actions */}
            {user ? (
              <div className="flex items-center space-x-2.5">
                {/* Profile Pill */}
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-vault-900/90 border border-white/10">
                  <div className="w-7 h-7 rounded-lg bg-vault-800 flex items-center justify-center text-slate-300">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-slate-200 leading-none truncate max-w-[120px]">{user.name}</div>
                    <div className="flex items-center space-x-1 mt-1">
                      <span className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border leading-none ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Revoke All Sessions Killswitch */}
                <button
                  type="button"
                  onClick={() => setShowRevokeConfirm(true)}
                  title="Emergency Session Revocation Killswitch"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyber-rose/10 hover:bg-cyber-rose/20 text-cyber-rose border border-cyber-rose/30 transition shadow-glow-rose"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Killswitch</span>
                </button>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  title="Sign Out"
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-vault-800 transition border border-white/5"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-cyber-cyan text-vault-950 hover:bg-cyan-300 transition shadow-glow-cyan"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile / Secondary Navigation Bar (Always Visible on Small Screens) */}
        {user && (
          <div className="md:hidden border-t border-white/5 bg-vault-900/90 px-4 py-2 flex items-center justify-around overflow-x-auto space-x-2">
            {isAdmin && (
              <Link to="/audit" className={navItemClass('/audit')}>
                <Activity className="w-3.5 h-3.5 text-cyber-rose" />
                <span>Admin SOC</span>
              </Link>
            )}
            {(isOwner || isAdmin) && (
              <Link to="/owner" className={navItemClass('/owner')}>
                <FileText className="w-3.5 h-3.5 text-cyber-cyan" />
                <span>Owner</span>
              </Link>
            )}
            {(isViewer || isAdmin) && (
              <Link to="/viewer" className={navItemClass('/viewer')}>
                <Eye className="w-3.5 h-3.5 text-cyber-emerald" />
                <span>Viewer</span>
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Confirmation Modal for Session Revocation */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-950/80 backdrop-blur-md">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border-cyber-rose/40 shadow-glow-rose">
            <div className="flex items-center space-x-3 mb-4 text-cyber-rose">
              <div className="p-2.5 rounded-xl bg-cyber-rose/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Emergency Session Killswitch</h3>
            </div>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              This will increment your cryptographic <code className="text-cyber-cyan font-mono">tokenVersion</code> in the database, instantly invalidating all active sessions across any devices. You will be required to log in again.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowRevokeConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-vault-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeAll}
                disabled={revoking}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-cyber-rose text-white hover:bg-rose-600 transition shadow-glow-rose flex items-center space-x-2"
              >
                {revoking ? 'Revoking...' : 'Revoke All Sessions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
