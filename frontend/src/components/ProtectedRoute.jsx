import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vault-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyber-cyan/20 border-t-cyber-cyan rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-mono tracking-widest uppercase">Verifying Cryptographic Credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="glass-panel max-w-md w-full p-8 rounded-2xl border-cyber-rose/30 text-center shadow-glow-rose">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-cyber-rose/10 flex items-center justify-center text-cyber-rose">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied (403)</h2>
          <p className="text-slate-300 text-sm mb-6">
            Your account role <span className="font-mono text-cyber-cyan uppercase font-bold">[{user.role}]</span> is not authorized to access this restricted compartment.
          </p>
          <div className="flex flex-col space-y-3">
            {user.role === 'owner' && (
              <Link
                to="/owner"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-vault-800 hover:bg-vault-700 text-white font-medium text-sm transition"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Return to Owner Portal
              </Link>
            )}
            {user.role === 'viewer' && (
              <Link
                to="/viewer"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-vault-800 hover:bg-vault-700 text-white font-medium text-sm transition"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Return to Viewer Dashboard
              </Link>
            )}
            {user.role === 'admin' && (
              <Link
                to="/audit"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-vault-800 hover:bg-vault-700 text-white font-medium text-sm transition"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Return to Admin Audit SOC
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
