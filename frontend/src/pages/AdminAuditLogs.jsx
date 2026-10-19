import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import DocumentCard from '../components/DocumentCard';
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  Users,
  Search,
  RefreshCw,
  KeyRound,
  Eye,
  X,
  UserCheck,
  FolderLock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const ACTIONS = ['ALL', 'VIEW_ATTEMPT_DENIED', 'UPLOAD', 'DOWNLOAD', 'PERMISSION_CHANGE', 'DELETE', 'LOGIN'];

const AdminAuditLogs = () => {
  const [activeTab, setActiveTab] = useState('governance');

  // Logs state
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Users & Governance state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [revokingUserId, setRevokingUserId] = useState(null);

  // System Documents state
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Modal inspection
  const [selectedMetadata, setSelectedMetadata] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: 'info' });

  useEffect(() => {
    fetchLogs();
    fetchUsers();
    fetchDocuments();
  }, [page, selectedAction]);

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const params = { page, limit: 15 };
      if (selectedAction !== 'ALL') params.action = selectedAction;

      const res = await apiClient.get('/api/audit', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await apiClient.get('/api/users');
      setUsers(res.data.users || []);

      // Initialize role drafts
      const drafts = {};
      (res.data.users || []).forEach((u) => {
        drafts[u._id] = u.role;
      });
      setRoleDrafts(drafts);
    } catch (err) {
      console.error('Failed to load users:', err);
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
      console.error('Failed to load system documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Admin Governance: Update User Role (Admin, Owner, Viewer)
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

  // Admin Killswitch: Revoke All Sessions for User
  const handleAdminRevokeUser = async (userId, userEmail) => {
    try {
      setRevokingUserId(userId);
      setStatusMessage({ text: '', type: 'info' });

      const res = await apiClient.patch(`/api/users/${userId}/revoke`);
      setStatusMessage({
        text: `Session killswitch activated for ${userEmail}. All active JWTs invalidated (tokenVersion: ${res.data.tokenVersion}).`,
        type: 'success',
      });

      fetchUsers();
      fetchLogs();
    } catch (err) {
      console.error('Revoke user sessions error:', err);
      setStatusMessage({
        text: `Failed to revoke sessions: ${err.response?.data?.error || err.message}`,
        type: 'error',
      });
    } finally {
      setRevokingUserId(null);
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'VIEW_ATTEMPT_DENIED':
        return 'bg-rose-100 text-rose-700 border-rose-300 font-bold';
      case 'UPLOAD':
        return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case 'DOWNLOAD':
        return 'bg-sky-100 text-sky-700 border-sky-300';
      case 'PERMISSION_CHANGE':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'DELETE':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'LOGIN':
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    }
  };

  const deniedCount = logs.filter((l) => l.action === 'VIEW_ATTEMPT_DENIED').length;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* Functional Admin Sidebar */}
      <Sidebar activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

      {/* Main Admin Console Area */}
      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 mr-3"></span>
              Admin Security & Governance Center
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Role Governance, Access Enforcement, and Immutable Audit Ledger
            </p>
          </div>

          <button
            onClick={() => {
              fetchLogs();
              fetchUsers();
              fetchDocuments();
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs || loadingUsers ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh All Telemetry</span>
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage.text && (
          <div
            className={`mb-6 p-3.5 rounded-xl border flex items-center space-x-2.5 text-xs font-mono ${
              statusMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
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
          <div className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3.5">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900 uppercase tracking-wider">
                Intrusion Detection Alert ({deniedCount} Unauthorized Access Intercepts)
              </h4>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-indigo-600" />
                  Identity Governance & Role Assignment
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Govern platform access by promoting or delegating users between Admin, Owner, and Viewer roles.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-mono uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Current Role</th>
                    <th className="py-3 px-4">Assign New Role</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400 font-mono">
                        Loading directory...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500">
                        No registered users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const selectedRole = roleDrafts[u._id] || u.role;
                      const hasChanged = selectedRole !== u.role;

                      return (
                        <tr key={u._id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-semibold text-slate-800">{u.name}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{u.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 text-purple-700 border-purple-200'
                                  : u.role === 'owner'
                                  ? 'bg-sky-100 text-sky-700 border-sky-200'
                                  : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={selectedRole}
                              onChange={(e) =>
                                setRoleDrafts({ ...roleDrafts, [u._id]: e.target.value })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:border-indigo-500"
                            >
                              <option value="admin">Admin (Supreme Governance)</option>
                              <option value="owner">Owner (Document Vault & Shares)</option>
                              <option value="viewer">Viewer (Restricted Clearance)</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleUpdateRole(u._id, u.email)}
                              disabled={savingRoleId === u._id || !hasChanged}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                                hasChanged
                                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              {savingRoleId === u._id ? 'Saving...' : 'Apply Role'}
                            </button>

                            <button
                              onClick={() => handleAdminRevokeUser(u._id, u.email)}
                              disabled={revokingUserId === u._id}
                              title="Revoke active sessions"
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition"
                            >
                              <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                              <span>{revokingUserId === u._id ? '...' : 'Killswitch'}</span>
                            </button>
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-8">
            {/* Filters Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap gap-2 items-center justify-between bg-slate-50">
              <div className="flex flex-wrap gap-1.5">
                {ACTIONS.map((act) => (
                  <button
                    key={act}
                    onClick={() => {
                      setSelectedAction(act);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-mono uppercase tracking-wider font-semibold transition ${
                      selectedAction === act
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>

              <div className="text-xs font-mono text-slate-500">
                Page {page} of {totalPages} ({total} total entries)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-mono uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Subject User</th>
                    <th className="py-3 px-4">Target Document</th>
                    <th className="py-3 px-4">Client IP</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Telemetry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
                        Querying immutable audit ledger...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500">
                        No audit records match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/70 transition">
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
                              <div className="font-semibold text-slate-800">{log.user.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{log.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">Anonymous / Public</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {log.document ? (
                            <div className="text-slate-700 font-medium truncate max-w-xs" title={log.document.title}>
                              {log.document.title}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-indigo-600 font-mono text-[11px]">{log.ip}</td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedMetadata(log)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] transition inline-flex items-center space-x-1"
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
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold uppercase disabled:opacity-40 hover:bg-slate-100 transition shadow-xs"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500 font-mono">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold uppercase disabled:opacity-40 hover:bg-slate-100 transition shadow-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ALL SYSTEM DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs mb-8">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
              <FolderLock className="w-4 h-4 mr-2 text-indigo-600" />
              All Vault Documents Across Platform ({documents.length})
            </h3>

            {loadingDocs ? (
              <div className="py-12 text-center text-slate-400 font-mono">Loading system documents...</div>
            ) : documents.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No documents deposited across the system.</div>
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs mb-8">
            <h3 className="text-sm font-bold text-rose-900 uppercase tracking-wider mb-4 flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2 text-rose-600" />
              Intrusion Attempts & Security Threat Reports
            </h3>
            <p className="text-xs text-slate-500 mb-6 font-mono">
              All unauthorized requests intercepted by authorizeDocumentAccess middleware.
            </p>

            <div className="space-y-3">
              {logs
                .filter((l) => l.action === 'VIEW_ATTEMPT_DENIED')
                .map((denial) => (
                  <div key={denial._id} className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-rose-900">
                        Blocked Target: {denial.document?.title || denial.document || 'Restricted Document'}
                      </p>
                      <p className="text-[11px] text-rose-700 font-mono mt-1">
                        Client IP: <strong>{denial.ip}</strong> | User: {denial.user?.email || 'Unauthorized Identity'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Timestamp: {new Date(denial.timestamp).toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedMetadata(denial)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 text-xs font-semibold"
                    >
                      Inspect Telemetry
                    </button>
                  </div>
                ))}
              {logs.filter((l) => l.action === 'VIEW_ATTEMPT_DENIED').length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">
                  No unauthorized intrusion attempts recorded in the current log window.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Telemetry Inspection Modal */}
        {selectedMetadata && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white max-w-2xl w-full p-6 rounded-2xl border border-slate-200 shadow-xl relative">
              <button
                onClick={() => setSelectedMetadata(null)}
                className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Audit Telemetry Payload</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {selectedMetadata._id}</p>
                </div>
              </div>

              <div className="mb-4 space-y-1.5 text-xs font-mono text-slate-700 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p><strong>Action:</strong> {selectedMetadata.action}</p>
                <p><strong>Client IP:</strong> {selectedMetadata.ip}</p>
                <p><strong>User Agent:</strong> {selectedMetadata.userAgent}</p>
                <p><strong>Timestamp:</strong> {new Date(selectedMetadata.timestamp).toISOString()}</p>
              </div>

              <p className="text-xs font-mono uppercase tracking-wider text-slate-600 mb-2 font-bold">Raw Payload Data:</p>
              <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 text-[11px] font-mono overflow-x-auto max-h-64">
                {JSON.stringify(selectedMetadata.metadata || {}, null, 2)}
              </pre>

              <div className="flex justify-end pt-5">
                <button
                  onClick={() => setSelectedMetadata(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
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
