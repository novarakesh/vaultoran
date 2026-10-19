import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  LogOut,
  Radio,
  KeyRound,
  User,
  AlertTriangle
} from 'lucide-react';

const Navbar = () => {
  const { user, logout, logoutAll, isAdmin, isOwner } = useAuth();
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

  const getDashboardTitle = () => {
    if (!user) return 'Confidential Document Security';
    if (isAdmin) return 'Admin Security & Governance Console';
    if (isOwner) return 'Document Owner Vault Portal';
    return 'Confidential Viewer Dashboard';
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'owner':
        return 'bg-sky-100 text-sky-700 border-sky-300';
      case 'viewer':
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
                  <Shield className="w-5 h-5 text-white stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-lg font-extrabold tracking-tight text-slate-900 group-hover:text-indigo-600 transition">
                    Trust<span className="text-indigo-600">Vault</span>
                  </span>
                  <div className="flex items-center space-x-1.5 -mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase font-medium">Zero-Trust</span>
                  </div>
                </div>
              </Link>

              {/* Render Backend Connection Status */}
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-600">
                <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                <span className="text-slate-400">Live API:</span>
                <span className="text-indigo-600 font-bold">Render</span>
              </div>
            </div>

            {/* Dashboard Role Title ONLY (No confusing other role tabs) */}
            <div className="hidden md:flex items-center">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                {getDashboardTitle()}
              </div>
            </div>

            {/* User Profile & Actions */}
            {user ? (
              <div className="flex items-center space-x-2.5">
                {/* Profile Pill */}
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-slate-800 leading-none truncate max-w-[120px]">{user.name}</div>
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
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
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
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Confirmation Modal for Session Revocation */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full p-6 rounded-2xl border border-rose-200 shadow-xl">
            <div className="flex items-center space-x-3 mb-4 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Emergency Session Killswitch</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              This will increment your cryptographic <code className="text-indigo-600 font-mono font-bold">tokenVersion</code> in the database, instantly invalidating all active sessions across any devices. You will be required to log in again.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowRevokeConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeAll}
                disabled={revoking}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 transition flex items-center space-x-2"
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
