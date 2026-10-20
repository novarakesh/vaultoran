import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import {
  Shield,
  Users,
  Activity,
  UploadCloud,
  UserCheck,
  Eye,
  Lock,
  Edit3,
  HardDrive,
  KeyRound,
  ShieldAlert,
  FolderLock,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';

const Sidebar = ({ activeTab, onSelectTab, onOpenUpload }) => {
  const { user, isAdmin, isOwner } = useAuth();
  const { isSidebarExpanded, toggleSidebar } = useSidebar();

  const adminNav = [
    { id: 'governance', label: 'Identity Governance', icon: Users, desc: 'Assign & switch user roles' },
    { id: 'audit', label: 'Audit Log Ledger', icon: Activity, desc: 'Immutable security telemetry' },
    { id: 'documents', label: 'System Documents', icon: FolderLock, desc: 'Oversee all vault files' },
    { id: 'threats', label: 'Threat Intelligence', icon: ShieldAlert, desc: '403 Denied access alerts' },
  ];

  const ownerNav = [
    { id: 'vault', label: 'My Document Vault', icon: FolderLock, desc: 'View & download owned files' },
    { id: 'upload', label: 'Deposit New File', icon: UploadCloud, desc: 'Upload confidential file', action: true },
    { id: 'clearance', label: 'Clearance & Shares', icon: UserCheck, desc: 'Grant Read / Edit permissions' },
    { id: 'analytics', label: 'Storage Analytics', icon: HardDrive, desc: 'Space & category breakdown' },
  ];

  const viewerNav = [
    { id: 'cleared', label: 'Cleared Documents', icon: Eye, desc: 'Files shared with your identity' },
    { id: 'readonly', label: 'Read-Only Clearances', icon: Lock, desc: 'Restricted to viewing/download' },
    { id: 'editable', label: 'Collaborative Clearances', icon: Edit3, desc: 'Granted edit clearance' },
    { id: 'session', label: 'Identity & Security', icon: KeyRound, desc: 'Token version & credentials' },
  ];

  const currentNav = isAdmin ? adminNav : isOwner ? ownerNav : viewerNav;

  const getCompartmentName = () => {
    if (isAdmin) return 'Admin Console';
    if (isOwner) return 'Owner Compartment';
    return 'Viewer Compartment';
  };

  const getRoleDotColor = () => {
    if (isAdmin) return 'bg-purple-600';
    if (isOwner) return 'bg-sky-600';
    return 'bg-emerald-600';
  };

  return (
    <aside
      className={`${
        isSidebarExpanded ? 'w-64' : 'w-20'
      } bg-white dark:bg-[#141414] border-r border-slate-200 dark:border-neutral-800 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 shadow-sm transition-all duration-300 ease-in-out z-30 select-none`}
    >
      <div className={isSidebarExpanded ? 'p-4' : 'px-2.5 py-4'}>
        {/* Top Header Toggle Bar */}
        {isSidebarExpanded ? (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-neutral-400">
              Navigation
            </span>
            <button
              type="button"
              id="sidebar-collapse-btn"
              onClick={toggleSidebar}
              title="Collapse to icons only"
              aria-label="Collapse sidebar"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center mb-3">
            <button
              type="button"
              id="sidebar-expand-btn"
              onClick={toggleSidebar}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 flex items-center justify-center transition border border-slate-200 dark:border-neutral-700 cursor-pointer shadow-2xs"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Role Compartment Badge */}
        {isSidebarExpanded ? (
          <div className="mb-5 p-3 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 transition-all">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${getRoleDotColor()} animate-pulse`}></span>
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-slate-800 dark:text-neutral-200">
                {getCompartmentName()}
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-neutral-400 font-mono mt-0.5 font-semibold">
              Clearance: <strong className="text-slate-800 dark:text-neutral-200 uppercase">{user?.role}</strong>
            </p>
          </div>
        ) : (
          <div
            className="mb-5 p-2 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 flex flex-col items-center justify-center cursor-default group relative shadow-2xs"
            title={`${getCompartmentName()} (Clearance: ${user?.role})`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${getRoleDotColor()} animate-pulse`}></span>
            <span className="text-[9px] font-mono uppercase font-extrabold text-slate-700 dark:text-neutral-300 mt-1">
              {user?.role?.[0]?.toUpperCase()}
            </span>

            {/* Hover Tooltip */}
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 dark:bg-neutral-800 text-white text-xs rounded-xl shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap border border-slate-700 dark:border-neutral-700 flex flex-col">
              <span className="font-bold">{getCompartmentName()}</span>
              <span className="text-[10px] text-slate-400 font-mono uppercase font-medium">Clearance: {user?.role}</span>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="space-y-2">
          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            if (!isSidebarExpanded) {
              /* COLLAPSED MODE: Only icons appear, fully functional */
              return (
                <div key={item.id} className="relative group flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.action && onOpenUpload) {
                        onOpenUpload();
                      } else {
                        onSelectTab(item.id);
                      }
                    }}
                    aria-label={item.label}
                    title={item.label}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl transition cursor-pointer relative ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />

                    {/* Active Accent Bar */}
                    {isActive && (
                      <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-indigo-600 rounded-r-full shadow-xs"></span>
                    )}

                    {/* Action badge indicator */}
                    {item.action && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-neutral-900"></span>
                    )}
                  </button>

                  {/* Floating Tooltip with Label & Desc */}
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-900 dark:bg-neutral-800 text-white text-xs rounded-xl shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap border border-slate-700 dark:border-neutral-700 flex flex-col">
                    <div className="font-bold text-white flex items-center space-x-1.5">
                      <span>{item.label}</span>
                      {item.action && (
                        <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-mono font-bold">
                          ACTION
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-300 dark:text-neutral-400 font-mono font-medium mt-0.5">
                      {item.desc}
                    </div>
                  </div>
                </div>
              );
            }

            /* EXPANDED MODE: Full sidebar with icons and descriptions */
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.action && onOpenUpload) {
                    onOpenUpload();
                  } else {
                    onSelectTab(item.id);
                  }
                }}
                className={`w-full flex items-start space-x-3 p-2.5 rounded-xl text-left transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                    : 'text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-neutral-800 border border-transparent'
                }`}
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="overflow-hidden min-w-0 flex-1">
                  <div className="text-xs leading-snug font-bold truncate flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.action && (
                      <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                        +FILE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-neutral-400 truncate font-medium">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Quick Toggle */}
      <div className="border-t border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-850/50">
        {isSidebarExpanded ? (
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[11px] text-slate-600 dark:text-neutral-400 font-mono font-bold">
              <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Zero-Trust Enforced</span>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse to icons only"
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-500 dark:text-neutral-400 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-3 flex flex-col items-center space-y-2">
            <div
              className="group relative cursor-default"
              title="Zero-Trust Enforced"
            >
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 dark:bg-neutral-800 text-white text-[11px] rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap border border-slate-700 dark:border-neutral-700 font-mono font-bold">
                Zero-Trust Enforced
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar"
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-500 dark:text-neutral-400 transition cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
