import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Shield,
  LogOut,
  User,
  Sun,
  Moon
} from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAdmin, isOwner } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide standalone navbar on login page to match full-screen hero layout
  if (location.pathname === '/login') return null;

  const getDashboardTitle = () => {
    if (!user) return 'Confidential Document Security';
    if (isAdmin) return 'Admin Security & Governance Console';
    if (isOwner) return 'Document Owner Vault Portal';
    return 'Confidential Viewer Dashboard';
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'owner':
        return 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800';
      case 'viewer':
      default:
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#141414] border-b border-slate-200 dark:border-neutral-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-neutral-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  Vault<span className="text-indigo-600 dark:text-indigo-400">oran</span>
                </span>
                <div className="flex items-center space-x-1.5 -mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 tracking-wider uppercase font-semibold">Zero-Trust</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Dashboard Role Title */}
          <div className="hidden md:flex items-center">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-neutral-200">
              {getDashboardTitle()}
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-2.5">
            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-xl text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 transition border border-slate-200 dark:border-neutral-700 cursor-pointer shadow-2xs"
              aria-label="Toggle Dark and Light Mode"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {user ? (
              <>
                {/* Profile Pill */}
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700">
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 flex items-center justify-center text-slate-600 dark:text-neutral-300 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-800 dark:text-neutral-200 leading-none truncate max-w-[120px]">{user.name}</div>
                    <div className="flex items-center space-x-1 mt-1">
                      <span className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border leading-none ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  title="Sign Out"
                  className="p-2 rounded-xl text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 hover:bg-slate-100 dark:hover:bg-neutral-800 transition border border-slate-200 dark:border-neutral-700 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
