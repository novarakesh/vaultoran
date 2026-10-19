import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import StatCard from '../components/StatCard';
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  Users,
  Search,
  Filter,
  RefreshCw,
  KeyRound,
  Eye,
  X,
  FileText,
  AlertTriangle
} from 'lucide-react';

const ACTIONS = ['ALL', 'VIEW_ATTEMPT_DENIED', 'UPLOAD', 'DOWNLOAD', 'PERMISSION_CHANGE', 'DELETE', 'LOGIN'];

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [revokingUserId, setRevokingUserId] = useState(null);
  const [selectedMetadata, setSelectedMetadata] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, [page, selectedAction]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (selectedAction !== 'ALL') params.action = selectedAction;

      const res = await apiClient.get('/api/audit', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await apiClient.get('/api/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAdminRevokeUser = async (userId, userEmail) => {
    try {
      setRevokingUserId(userId);
      setStatusMessage('');
      const res = await apiClient.patch(`/api/users/${userId}/revoke`);
      setStatusMessage(`Sessions revoked for ${userEmail}. New tokenVersion: ${res.data.tokenVersion}`);
      fetchUsers();
      fetchLogs();
    } catch (err) {
      console.error('Revoke user sessions error:', err);
      setStatusMessage(`Failed to revoke sessions: ${err.response?.data?.error || err.message}`);
    } finally {
      setRevokingUserId(null);
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'VIEW_ATTEMPT_DENIED':
        return 'bg-cyber-rose/20 text-cyber-rose border-cyber-rose/40 font-bold animate-pulse';
      case 'UPLOAD':
        return 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/40';
      case 'DOWNLOAD':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'PERMISSION_CHANGE':
        return 'bg-cyber-purple/20 text-cyber-purple border-cyber-purple/40';
      case 'DELETE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'LOGIN':
      default:
        return 'bg-cyber-emerald/20 text-cyber-emerald border-cyber-emerald/40';
    }
  };

  const deniedCount = logs.filter((l) => l.action === 'VIEW_ATTEMPT_DENIED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-rose mr-3 shadow-glow-rose"></span>
            Security Operations Center (SOC) — Audit Trail
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Immutable, append-only cryptographic event logs with Mongoose tamper-proof enforcement
          </p>
        </div>

        <button
          onClick={() => {
            fetchLogs();
            fetchUsers();
          }}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-vault-850 hover:bg-vault-800 text-slate-200 border border-white/10 text-xs font-semibold uppercase tracking-wider transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyber-cyan' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Threat Alert Banner (if VIEW_ATTEMPT_DENIED logs exist) */}
      {deniedCount > 0 && (
        <div className="mb-8 p-4 rounded-2xl bg-cyber-rose/15 border border-cyber-rose/40 shadow-glow-rose flex items-start space-x-3.5">
          <div className="p-2 rounded-xl bg-cyber-rose/20 text-cyber-rose">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              Active Security Intrusion Alerts Intercepted ({deniedCount} on this page)
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              The automated authorization engine intercepted unauthorized attempts to download or query restricted documents. Each attempt was blocked with HTTP 403 and logged to the immutable audit ledger.
            </p>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="mb-6 p-3 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono">
          {statusMessage}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Audit Events"
          value={total}
          subtitle="Append-only log ledger"
          icon={Activity}
          color="cyan"
        />
        <StatCard
          title="Denied Attempts"
          value={deniedCount}
          subtitle="HTTP 403 Intercepts"
          icon={ShieldAlert}
          color="rose"
        />
        <StatCard
          title="Protected Users"
          value={users.length}
          subtitle="Identity directory"
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Ledger Immutability"
          value="ENFORCED"
          subtitle="Update/delete blocked"
          icon={ShieldCheck}
          color="emerald"
        />
      </div>

      {/* User Directory & Killswitch Section */}
      <div className="glass-panel p-6 rounded-2xl border-white/5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <Users className="w-4 h-4 mr-2 text-cyber-purple" />
              Identity Directory & Session Revocation Controls
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Administratively increment tokenVersion to revoke compromised accounts instantly
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {users.map((u) => (
            <div key={u._id} className="p-3.5 rounded-xl bg-vault-900 border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white truncate">{u.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-vault-800 text-slate-400 uppercase">
                    {u.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono truncate">{u.email}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-2">
                  Session Token: <strong className="text-cyber-cyan">v{u.tokenVersion ?? 0}</strong>
                </p>
              </div>

              <button
                onClick={() => handleAdminRevokeUser(u._id, u.email)}
                disabled={revokingUserId === u._id}
                className="mt-3 w-full py-1.5 px-2 rounded-lg bg-cyber-rose/15 hover:bg-cyber-rose/25 text-cyber-rose border border-cyber-rose/30 text-[11px] font-bold transition flex items-center justify-center space-x-1"
              >
                <KeyRound className="w-3 h-3" />
                <span>{revokingUserId === u._id ? 'Revoking...' : 'Revoke Sessions'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log Filters */}
      <div className="glass-panel p-4 rounded-2xl border-white/5 mb-6 flex flex-wrap gap-2 items-center justify-between">
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
                  ? 'bg-cyber-cyan text-vault-950 font-bold shadow-glow-cyan'
                  : 'bg-vault-900 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {act}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono text-slate-400">
          Page {page} of {totalPages} ({total} total entries)
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="glass-panel rounded-2xl border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-vault-900/90 text-slate-400 font-mono uppercase tracking-wider border-b border-white/5">
              <tr>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Subject User</th>
                <th className="py-3.5 px-4">Target Document</th>
                <th className="py-3.5 px-4">Client IP</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4 text-right">Telemetry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 border-2 border-cyber-cyan/20 border-t-cyber-cyan rounded-full animate-spin mx-auto mb-2"></div>
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
                  <tr key={log._id} className="hover:bg-vault-900/50 transition">
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-mono border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {log.user ? (
                        <div>
                          <div className="font-semibold text-slate-200">{log.user.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono">Anonymous / Public</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {log.document ? (
                        <div className="text-slate-300 font-medium truncate max-w-xs" title={log.document.title}>
                          {log.document.title}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-cyber-cyan font-mono text-[11px]">{log.ip}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedMetadata(log)}
                        className="px-2.5 py-1 rounded-lg bg-vault-850 hover:bg-vault-800 text-slate-300 border border-white/5 text-[10px] transition inline-flex items-center space-x-1"
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
        <div className="p-4 bg-vault-900/60 border-t border-white/5 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3.5 py-1.5 rounded-xl bg-vault-850 text-slate-300 text-xs font-semibold uppercase disabled:opacity-40 hover:bg-vault-800 transition"
          >
            Previous
          </button>
          <span className="text-xs text-slate-400 font-mono">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3.5 py-1.5 rounded-xl bg-vault-850 text-slate-300 text-xs font-semibold uppercase disabled:opacity-40 hover:bg-vault-800 transition"
          >
            Next
          </button>
        </div>
      </div>

      {/* Telemetry Inspection Modal */}
      {selectedMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-950/80 backdrop-blur-md">
          <div className="glass-panel max-w-2xl w-full p-6 rounded-2xl border-white/10 shadow-2xl relative">
            <button
              onClick={() => setSelectedMetadata(null)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-vault-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyber-cyan/15 text-cyber-cyan flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Forensic Audit Telemetry</h3>
                <p className="text-xs text-slate-400 font-mono">
                  Record ID: <span className="text-cyber-cyan">{selectedMetadata._id}</span>
                </p>
              </div>
            </div>

            <div className="mb-4 space-y-2 text-xs font-mono text-slate-300 p-3 rounded-xl bg-vault-900 border border-white/5">
              <p><strong>Action:</strong> {selectedMetadata.action}</p>
              <p><strong>Client IP:</strong> {selectedMetadata.ip}</p>
              <p><strong>User Agent:</strong> {selectedMetadata.userAgent}</p>
              <p><strong>Timestamp:</strong> {new Date(selectedMetadata.timestamp).toISOString()}</p>
            </div>

            <p className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Raw Metadata Payload:</p>
            <pre className="p-4 rounded-xl bg-vault-950 border border-white/5 text-[11px] font-mono text-cyber-cyan overflow-x-auto max-h-64">
              {JSON.stringify(selectedMetadata.metadata || {}, null, 2)}
            </pre>

            <div className="flex justify-end pt-5">
              <button
                onClick={() => setSelectedMetadata(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-vault-800 text-white hover:bg-vault-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;
