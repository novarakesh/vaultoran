import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Users,
  Activity,
  FileText,
  UploadCloud,
  UserCheck,
  Eye,
  Lock,
  Edit3,
  HardDrive,
  KeyRound,
  ShieldAlert,
  BarChart3,
  FolderLock
} from 'lucide-react';

const Sidebar = ({ activeTab, onSelectTab, onOpenUpload }) => {
  const { user, isAdmin, isOwner, isViewer } = useAuth();

  const adminNav = [
    { id: 'governance', label: 'Identity Governance', icon: Users, desc: 'Assign & switch user roles' },
    { id: 'audit', label: 'Audit Log Ledger', icon: Activity, desc: 'Immutable security telemetry' },
    { id: 'documents', label: 'System Documents', icon: FolderLock, desc: 'Oversee all vault files' },
    { id: 'threats', label: 'Threat Intelligence', icon: ShieldAlert, desc: '403 Denied access alerts' },
  ];

  const ownerNav = [
    { id: 'vault', label: 'My Document Vault', icon: FolderLock, desc: 'View & download owned files' },
    { id: 'upload', label: 'Deposit New File', icon: UploadCloud, desc: 'Upload with SHA-256 check', action: true },
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

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 shadow-sm">
      <div className="p-4">
        {/* Role Compartment Badge */}
        <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isAdmin ? 'bg-indigo-600' : isOwner ? 'bg-sky-600' : 'bg-emerald-600'
              }`}
            ></span>
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-slate-700">
              {isAdmin ? 'Admin Console' : isOwner ? 'Owner Compartment' : 'Viewer Compartment'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            Clearance Level: <strong className="text-slate-700 uppercase">{user?.role}</strong>
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

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
                className={`w-full flex items-start space-x-3 p-2.5 rounded-xl text-left transition ${
                  isActive
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                }`}
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-lg ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs leading-snug">{item.label}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
          <Shield className="w-3.5 h-3.5 text-indigo-600" />
          <span>Zero-Trust Enforced</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
