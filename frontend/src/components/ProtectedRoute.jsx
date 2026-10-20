import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-200">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono tracking-widest uppercase font-semibold">
            Verifying Cryptographic Credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-200">
        <div className="bg-white dark:bg-[#141414] max-w-md w-full p-8 rounded-2xl border border-slate-200 dark:border-neutral-800 text-center shadow-xl">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-neutral-100 mb-2">Access Denied (403)</h2>
          <p className="text-slate-600 dark:text-neutral-300 text-sm mb-6 font-medium">
            Your account role <span className="font-mono text-indigo-600 dark:text-indigo-400 uppercase font-bold">[{user.role}]</span> is not authorized to access this restricted compartment.
          </p>
          <div className="flex flex-col space-y-3">
            {user.role === 'owner' && (
              <Link
                to="/owner"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Return to Owner Portal
              </Link>
            )}
            {user.role === 'viewer' && (
              <Link
                to="/viewer"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Return to Viewer Dashboard
              </Link>
            )}
            {user.role === 'admin' && (
              <Link
                to="/audit"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-xs cursor-pointer"
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
