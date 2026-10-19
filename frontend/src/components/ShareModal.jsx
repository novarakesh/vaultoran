import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { UserCheck, X, Shield, Trash2, Plus, AlertCircle, CheckCircle } from 'lucide-react';

const ShareModal = ({ isOpen, onClose, document: doc, onShareUpdated }) => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permission, setPermission] = useState('read');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await apiClient.get('/api/users');
      // Filter out document owner
      const available = res.data.users.filter((u) => u._id !== doc.owner?._id && u._id !== doc.owner);
      setUsers(available);
      if (available.length > 0) {
        setSelectedUserId(available[0]._id);
      }
    } catch (err) {
      setError('Failed to fetch user directory for share assignment.');
    } finally {
      setLoadingUsers(false);
    }
  };

  if (!isOpen || !doc) return null;

  const handleAddOrUpdateShare = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await apiClient.put(`/api/documents/${doc._id}/share`, {
        userId: selectedUserId,
        permission,
      });

      setSuccess('Access permissions updated.');
      onShareUpdated(res.data.document);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update document sharing permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeShare = async (targetUserId) => {
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await apiClient.put(`/api/documents/${doc._id}/share`, {
        userId: targetUserId,
        permission: 'none',
      });

      setSuccess('User access successfully revoked.');
      onShareUpdated(res.data.document);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revoke document access.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-950/80 backdrop-blur-md">
      <div className="glass-panel max-w-xl w-full p-6 rounded-2xl border-white/10 shadow-glow-cyan relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-vault-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyber-purple/15 text-cyber-purple flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Manage Compartmentalized Access</h3>
            <p className="text-xs text-slate-400 font-mono truncate max-w-sm">{doc.title}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-cyber-rose/10 border border-cyber-rose/30 flex items-center space-x-2.5 text-cyber-rose text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-cyber-emerald/10 border border-cyber-emerald/30 flex items-center space-x-2.5 text-cyber-emerald text-xs">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Add Share Form */}
        <form onSubmit={handleAddOrUpdateShare} className="p-4 rounded-xl bg-vault-900/60 border border-white/5 mb-6">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-300 mb-3 flex items-center">
            <Plus className="w-3.5 h-3.5 mr-1 text-cyber-cyan" /> Grant New Clearance
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingUsers || users.length === 0}
                className="w-full px-3 py-2 rounded-xl bg-vault-850 border border-white/10 text-white text-xs focus:outline-none focus:border-cyber-cyan"
              >
                {users.length === 0 ? (
                  <option value="">No other registered users found</option>
                ) : (
                  users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email}) [{u.role}]
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-vault-850 border border-white/10 text-white text-xs focus:outline-none focus:border-cyber-cyan"
              >
                <option value="read">Read Only</option>
                <option value="edit">Can Edit</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting || !selectedUserId}
                className="w-full h-full py-2 px-3 rounded-xl bg-cyber-cyan text-vault-950 hover:bg-cyan-300 font-bold text-xs transition disabled:opacity-50"
              >
                {submitting ? '...' : 'Grant'}
              </button>
            </div>
          </div>
        </form>

        {/* Current Active Shares List */}
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
            Active Delegated Shares ({doc.sharedWith?.length || 0})
          </p>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {!doc.sharedWith || doc.sharedWith.length === 0 ? (
              <div className="p-4 rounded-xl bg-vault-900/30 border border-white/5 text-center text-xs text-slate-500">
                This document is strictly restricted to its owner and administrators.
              </div>
            ) : (
              doc.sharedWith.map((share) => {
                const targetUser = share.user;
                return (
                  <div
                    key={share._id || (typeof targetUser === 'object' ? targetUser._id : targetUser)}
                    className="flex items-center justify-between p-3 rounded-xl bg-vault-900 border border-white/5"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        {typeof targetUser === 'object' ? targetUser.name : 'User'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {typeof targetUser === 'object' ? targetUser.email : targetUser}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                          share.permission === 'edit'
                            ? 'bg-cyber-purple/20 text-cyber-purple border-cyber-purple/30'
                            : 'bg-cyber-emerald/20 text-cyber-emerald border-cyber-emerald/30'
                        }`}
                      >
                        {share.permission === 'edit' ? 'Can Edit' : 'Read Only'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRevokeShare(typeof targetUser === 'object' ? targetUser._id : targetUser)}
                        disabled={submitting}
                        title="Revoke clearance"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-cyber-rose hover:bg-cyber-rose/10 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end pt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-vault-800 hover:bg-vault-700 text-white transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
