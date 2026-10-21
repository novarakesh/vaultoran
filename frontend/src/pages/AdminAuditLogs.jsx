import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import DocumentCard from '../components/DocumentCard';
import {
  Activity,
  Users,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  FolderLock,
  Eye,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  X,
  Trash2,
  UserPlus,
  Lock,
  Mail,
  User as UserIcon
} from 'lucide-react';

const ACTIONS = [
  'ALL',
  'LOGIN',
  'UPLOAD',
  'DOWNLOAD',
  'VIEW_ATTEMPT_DENIED',
  'PERMISSION_CHANGE',
  'DELETE',
];

const AdminAuditLogs = () => {
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('governance');
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [deniedTotal, setDeniedTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Identity Governance State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: 'info' });

  // Provision New Account Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer',
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState('');

  // User Deletion State
  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // System Documents
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Inspector Modal
  const [selectedMetadata, setSelectedMetadata] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [page, selectedAction]);

  useEffect(() => {
    fetchUsers();
    fetchDocuments();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const params = { page, limit: 15 };
      if (selectedAction !== 'ALL') {
        params.action = selectedAction;
      }

      const res = await apiClient.get('/api/audit', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);

      // Also get total denied intercept count for telemetry
      try {
        const dRes = await apiClient.get('/api/audit', { params: { action: 'VIEW_ATTEMPT_DENIED', limit: 1 } });
        setDeniedTotal(dRes.data.total || 0);
      } catch (_) {}
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await apiClient.get('/api/users');
      setUsers(res.data.users || []);

      // initialize role drafts
      const initialDrafts = {};
      (res.data.users || []).forEach((u) => {
        initialDrafts[u._id] = u.role;
      });
      setRoleDrafts(initialDrafts);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const res = await apiClient.get('/api/documents');
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to fetch platform documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Admin Account Provisioning
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateUserError('');

    if (!newUserData.name.trim() || !newUserData.email.trim() || !newUserData.password) {
      setCreateUserError('Please provide full legal name, corporate email, and password.');
      return;
    }

    if (newUserData.password.length < 8) {
      setCreateUserError('Password must contain at least 8 characters.');
      return;
    }

    try {
      setCreatingUser(true);
      let createdUser;

      try {
        // Preferred route: dedicated admin provisioning endpoint
        const res = await apiClient.post('/api/users', {
          name: newUserData.name.trim(),
          email: newUserData.email.trim(),
          password: newUserData.password,
          role: newUserData.role,
        });
        createdUser = res.data.user;
      } catch (postErr) {
        // Resilient fallback for cloud environments before the new route is deployed to Render
        if (postErr.response?.status === 404) {
          const fallbackRole = newUserData.role === 'admin' ? 'viewer' : newUserData.role;
          const regRes = await apiClient.post('/api/auth/register', {
            name: newUserData.name.trim(),
            email: newUserData.email.trim(),
            password: newUserData.password,
            role: fallbackRole,
          });
          createdUser = regRes.data.user;

          // If admin clearance was selected, upgrade via existing governance endpoint
          if (newUserData.role === 'admin' && createdUser?._id) {
            await apiClient.patch(`/api/users/${createdUser._id}/role`, { role: 'admin' });
            createdUser.role = 'admin';
          }
        } else {
          throw postErr;
        }
      }

      setStatusMessage({
        text: `Identity Provisioned: Account for ${createdUser.name} (${createdUser.email}) registered with role [${createdUser.role.toUpperCase()}].`,
        type: 'success',
      });

      setShowCreateModal(false);
      setNewUserData({ name: '', email: '', password: '', role: 'viewer' });
      fetchUsers();
      fetchLogs();
    } catch (err) {
      console.error('Provisioning error:', err);
      setCreateUserError(err.response?.data?.error || err.message || 'Failed to provision account.');
    } finally {
      setCreatingUser(false);
    }
  };

  // Admin Role Update
  const handleUpdateRole = async (userId, userEmail) => {
    const newRole = roleDrafts[userId];
    if (!newRole) return;

    try {
      setSavingRoleId(userId);
      setStatusMessage({ text: '', type: 'info' });

      const res = await apiClient.patch(`/api/users/${userId}/role`, { role: newRole });
      setStatusMessage({
        text: `Governance applied: ${userEmail} is now assigned the role of [${newRole.toUpperCase()}].`,
        type: 'success',
      });

      fetchUsers();
      fetchLogs();
    } catch (err) {
      console.error('Role update error:', err);
      setStatusMessage({
        text: `Governance error: ${err.response?.data?.error || err.message}`,
        type: 'error',
      });
    } finally {
      setSavingRoleId(null);
    }
  };

  // Admin User Deletion (Viewers & Owners)
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setDeletingUser(true);
      setStatusMessage({ text: '', type: 'info' });

      const res = await apiClient.delete(`/api/users/${userToDelete._id}`);
      setStatusMessage({
        text: `Identity Purged: ${userToDelete.name} (${userToDelete.email}) [${userToDelete.role.toUpperCase()}] was permanently removed.`,
        type: 'success',
      });

      setUserToDelete(null);
      fetchUsers();
      fetchLogs();
    } catch (err) {
      console.error('Delete user error:', err);
      setStatusMessage({
        text: `Deletion failed: ${err.response?.data?.error || err.message}`,
        type: 'error',
      });
    } finally {
      setDeletingUser(false);
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'VIEW_ATTEMPT_DENIED':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold';
      case 'UPLOAD':
        return 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 font-bold';
      case 'PERMISSION_CHANGE':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 font-bold';
      case 'DOWNLOAD':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold';
      case 'LOGIN':
        return 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 font-bold';
      case 'DELETE':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold';
      default:
        return 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-slate-300 dark:border-neutral-700 font-bold';
    }
  };

  const deniedCount = deniedTotal || logs.filter((l) => l.action === 'VIEW_ATTEMPT_DENIED').length;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-200">
      {/* Functional Admin Sidebar */}
      <Sidebar activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

      {/* Main Admin Console Area */}
      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-neutral-50 tracking-tight flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 mr-3 shadow-xs"></span>
              Admin Security & Governance Center
            </h2>
            <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-1 font-semibold">
              Role Governance, Access Enforcement, and Immutable Audit Ledger
            </p>
          </div>

          <button
            onClick={() => {
              fetchLogs();
              fetchUsers();
              fetchDocuments();
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white dark:bg-[#141414] border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-bold uppercase tracking-wider transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs || loadingUsers ? 'animate-spin text-indigo-500' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage.text && (
          <div
            className={`mb-6 p-3.5 rounded-xl border flex items-center space-x-2.5 text-xs font-mono font-medium ${
              statusMessage.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {statusMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Threat Alert Banner (if VIEW_ATTEMPT_DENIED) */}
        {deniedCount > 0 && (
          <div className="mb-8 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start space-x-3.5">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                Intrusion Detection Alert ({deniedCount} Unauthorized Access Intercepts)
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed font-medium">
                Unauthorized access attempts were blocked with HTTP 403 Forbidden and recorded in the immutable audit ledger.
              </p>
            </div>
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Audit Events"
            value={total}
            subtitle="Append-only log ledger"
            icon={Activity}
            color="indigo"
          />
          <StatCard
            title="Denied Intercepts"
            value={deniedCount}
            subtitle="HTTP 403 Blocked"
            icon={ShieldAlert}
            color="rose"
          />
          <StatCard
            title="Registered Identities"
            value={users.length}
            subtitle="Governed accounts"
            icon={Users}
            color="purple"
          />
          <StatCard
            title="Ledger Immutability"
            value="ENFORCED"
            subtitle="Pre-hook tamper block"
            icon={ShieldCheck}
            color="emerald"
          />
        </div>

        {/* TAB 1: IDENTITY GOVERNANCE (Assign & Switch Roles) */}
        {activeTab === 'governance' && (
          <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs mb-8 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100 uppercase tracking-wider flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Identity Governance & Role Assignment
                </h3>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono text-slate-600 dark:text-neutral-400 font-bold hidden md:inline-block">
                  {users.length} Identities
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewUserData({ name: '', email: '', password: '', role: 'viewer' });
                    setCreateUserError('');
                    setShowCreateModal(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Create Account</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-neutral-800/80 text-slate-700 dark:text-neutral-300 font-mono uppercase tracking-wider border-b border-slate-200 dark:border-neutral-700">
                  <tr>
                    <th className="py-3 px-4 font-bold">User Identity</th>
                    <th className="py-3 px-4 font-bold">Current Role</th>
                    <th className="py-3 px-4 font-bold">Token Version</th>
                    <th className="py-3 px-4 font-bold">Assign New Role</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 font-sans">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-500 font-medium font-mono">
                        Loading directory identities...
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const currentDraftRole = roleDrafts[u._id] || u.role;
                      const hasChanged = currentDraftRole !== u.role;

                      return (
                        <tr key={u._id} className="hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-neutral-100">{u.name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono font-medium">{u.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border uppercase ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                                  : u.role === 'owner'
                                  ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 dark:text-neutral-300 font-semibold">
                            v{u.tokenVersion ?? 0}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={currentDraftRole}
                              onChange={(e) =>
                                setRoleDrafts({ ...roleDrafts, [u._id]: e.target.value })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-slate-800 dark:text-neutral-100 text-xs font-medium focus:outline-none focus:border-indigo-500"
                            >
                              <option value="admin">Admin (Supreme Governance)</option>
                              <option value="owner">Owner (Document Vault & Shares)</option>
                              <option value="viewer">Viewer (Restricted Clearance)</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleUpdateRole(u._id, u.email)}
                                disabled={savingRoleId === u._id || !hasChanged}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                                  hasChanged
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 cursor-not-allowed'
                                }`}
                              >
                                {savingRoleId === u._id ? 'Saving...' : 'Apply Role'}
                              </button>

                              {u.role === 'admin' ? (
                                <span
                                  title={
                                    u._id === currentAdmin?._id
                                      ? 'You cannot delete your own administrator account'
                                      : 'Administrator accounts cannot be deleted'
                                  }
                                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold text-slate-400 dark:text-neutral-500 bg-slate-100/80 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700 cursor-not-allowed select-none"
                                >
                                  Protected
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setUserToDelete(u)}
                                  title={`Delete ${u.role}: ${u.name} (${u.email})`}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 hover:border-rose-600 transition shadow-xs cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: AUDIT LOG LEDGER */}
        {activeTab === 'audit' && (
          <div className="bg-white dark:bg-[#141414] rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs overflow-hidden mb-8 transition-colors">
            {/* Filters Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-neutral-800 flex flex-wrap gap-2 items-center justify-between bg-slate-50 dark:bg-neutral-850">
              <div className="flex flex-wrap gap-1.5">
                {ACTIONS.map((act) => (
                  <button
                    key={act}
                    onClick={() => {
                      setSelectedAction(act);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-mono uppercase tracking-wider font-bold transition cursor-pointer ${
                      selectedAction === act
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700'
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>

              <div className="text-xs font-mono text-slate-600 dark:text-neutral-400 font-bold">
                Page {page} of {totalPages} ({total} entries)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-neutral-800/80 text-slate-700 dark:text-neutral-300 font-mono uppercase tracking-wider border-b border-slate-200 dark:border-neutral-700">
                  <tr>
                    <th className="py-3 px-4 font-bold">Action</th>
                    <th className="py-3 px-4 font-bold">Subject User</th>
                    <th className="py-3 px-4 font-bold">Target Document</th>
                    <th className="py-3 px-4 font-bold">Client IP</th>
                    <th className="py-3 px-4 font-bold">Timestamp</th>
                    <th className="py-3 px-4 font-bold text-right">Telemetry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 font-mono">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500 font-medium">
                        <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
                        Querying immutable audit ledger...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500 font-medium">
                        No audit records match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 transition">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${getActionBadge(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {log.user ? (
                            <div>
                              <div className="font-bold text-slate-900 dark:text-neutral-100">{log.user.name}</div>
                              <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono font-medium">{log.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-slate-500 dark:text-neutral-500 font-mono font-medium">Anonymous / Public</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {log.document ? (
                            <div className="text-slate-800 dark:text-neutral-200 font-semibold truncate max-w-xs" title={log.document.title}>
                              {log.document.title}
                            </div>
                          ) : (
                            <span className="text-slate-500 dark:text-neutral-500 font-mono font-medium">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-bold">{log.ip}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-neutral-400 text-[11px] font-medium">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedMetadata(log)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 border border-slate-200 dark:border-neutral-700 text-[10px] font-bold transition inline-flex items-center space-x-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="p-4 bg-slate-50 dark:bg-neutral-850 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-bold uppercase disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-neutral-700 transition shadow-xs cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs text-slate-600 dark:text-neutral-400 font-mono font-bold">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-bold uppercase disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-neutral-700 transition shadow-xs cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ALL SYSTEM DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs mb-8 transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100 uppercase tracking-wider mb-4 flex items-center">
              <FolderLock className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
              All Vault Documents Across Platform ({documents.length})
            </h3>

            {loadingDocs ? (
              <div className="py-12 text-center text-slate-500 font-mono font-medium">Loading system documents...</div>
            ) : documents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-medium">No documents deposited across the system.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((doc) => (
                  <DocumentCard key={doc._id} document={doc} canManage={false} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: THREAT INTELLIGENCE */}
        {activeTab === 'threats' && (
          <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs mb-8 transition-colors">
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider mb-4 flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2 text-rose-600 dark:text-rose-400" />
              Intrusion Attempts & Security Threat Reports
            </h3>
            <p className="text-xs text-slate-600 dark:text-neutral-400 mb-6 font-mono font-medium">
              All unauthorized requests intercepted by authorizeDocumentAccess middleware.
            </p>

            <div className="space-y-3">
              {logs
                .filter((l) => l.action === 'VIEW_ATTEMPT_DENIED')
                .map((denial) => (
                  <div key={denial._id} className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                        Blocked Target: {denial.document?.title || denial.document || 'Restricted Document'}
                      </p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 font-mono mt-1 font-semibold">
                        Client IP: <strong>{denial.ip}</strong> | User: {denial.user?.email || 'Unauthorized Identity'}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1 font-medium">
                        Timestamp: {new Date(denial.timestamp).toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedMetadata(denial)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold cursor-pointer"
                    >
                      Inspect Telemetry
                    </button>
                  </div>
                ))}
              {logs.filter((l) => l.action === 'VIEW_ATTEMPT_DENIED').length === 0 && (
                <div className="p-8 text-center text-slate-500 dark:text-neutral-400 text-xs font-mono font-medium">
                  No unauthorized intrusion attempts recorded in the current log window.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Provision New User Account Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#141414] max-w-md w-full p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">Provision User Account</h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono font-medium">Zero-Trust Identity Governance</p>
                </div>
              </div>

              {createUserError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{createUserError}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                    Full Legal Name
                  </label>
                  <div className="relative flex items-center">
                    <UserIcon className="w-4 h-4 text-slate-400 dark:text-neutral-500 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={newUserData.name}
                      onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                      placeholder="e.g. Eleanor Vance"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 text-xs font-medium focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                    Corporate Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-400 dark:text-neutral-500 absolute left-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                      placeholder="name@vaultoran.io"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 text-xs font-medium focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                    Secret Password (min 8 characters)
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-neutral-500 absolute left-3 pointer-events-none" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 text-xs font-medium focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                    Assigned Role Clearance
                  </label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 text-xs font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="viewer">Viewer (Read-only / Delegated clearances)</option>
                    <option value="owner">Document Owner (Upload & manage private vault)</option>
                    <option value="admin">Administrator (Supreme Governance & SOC ledger)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    disabled={creatingUser}
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{creatingUser ? 'Provisioning...' : 'Provision Account'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Deletion Confirmation Modal */}
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#141414] max-w-md w-full p-6 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-2xl">
              <div className="flex items-center space-x-3 mb-4 text-rose-600 dark:text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-neutral-100">
                    Confirm Identity Deletion
                  </h3>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-bold">
                    Target Clearance: {userToDelete.role}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-6 text-sm text-slate-600 dark:text-neutral-300 font-medium">
                <p>
                  Are you sure you want to permanently delete user{' '}
                  <strong className="text-slate-900 dark:text-white font-bold">{userToDelete.name}</strong>{' '}
                  (<span className="font-mono text-xs">{userToDelete.email}</span>)?
                </p>

                {userToDelete.role === 'owner' ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs">
                    <p className="font-bold mb-1 flex items-center">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                      Owner Account Notice:
                    </p>
                    All confidential documents owned by this account will be soft-deleted to maintain audit compliance, and all clearances will be revoked.
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 text-xs font-mono">
                    This viewer will be purged from all document clearance access lists and active session credentials will be terminated immediately.
                  </div>
                )}

                <p className="text-xs text-slate-500 dark:text-neutral-400 italic">
                  This administrative governance action is irreversible and recorded in the append-only immutable audit ledger.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={deletingUser}
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingUser}
                  onClick={handleDeleteUser}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deletingUser ? 'Purging Identity...' : `Delete ${userToDelete.role === 'owner' ? 'Owner' : 'Viewer'}`}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Telemetry Inspection Modal */}
        {selectedMetadata && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#141414] max-w-2xl w-full p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xl relative">
              <button
                onClick={() => setSelectedMetadata(null)}
                className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-neutral-100">Audit Telemetry Payload</h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono font-medium">ID: {selectedMetadata._id}</p>
                </div>
              </div>

              <div className="mb-4 space-y-1.5 text-xs font-mono text-slate-700 dark:text-neutral-300 p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 font-medium">
                <p><strong className="text-slate-900 dark:text-white">Action:</strong> {selectedMetadata.action}</p>
                <p><strong className="text-slate-900 dark:text-white">Client IP:</strong> {selectedMetadata.ip}</p>
                <p><strong className="text-slate-900 dark:text-white">User Agent:</strong> {selectedMetadata.userAgent}</p>
                <p><strong className="text-slate-900 dark:text-white">Timestamp:</strong> {new Date(selectedMetadata.timestamp).toISOString()}</p>
              </div>

              <p className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-2 font-bold">Raw Payload Data:</p>
              <pre className="p-4 rounded-xl bg-neutral-900 text-emerald-400 text-[11px] font-mono overflow-x-auto max-h-64 border border-neutral-800">
                {JSON.stringify(selectedMetadata.metadata || {}, null, 2)}
              </pre>

              <div className="flex justify-end pt-5">
                <button
                  onClick={() => setSelectedMetadata(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminAuditLogs;
