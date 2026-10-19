import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { UserCheck, X, Trash2, Plus, AlertCircle, CheckCircle, Shield } from 'lucide-react';

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
      // Owner only grants permissions to Viewers (or other users excluding self)
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

      setSuccess(`Clearance granted: ${permission === 'edit' ? 'Can Edit & Download' : 'Read-Only & Download'}.`);
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

      setSuccess('Clearance revoked. Target user can no longer view or download.');
      onShareUpdated(res.data.document);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revoke document access.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white max-w-xl w-full p-6 rounded-2xl border border-slate-200 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Manage Viewer Clearances</h3>
            <p className="text-xs text-slate-500 font-mono truncate max-w-sm">{doc.title}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-2.5 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2.5 text-emerald-700 text-xs">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Grant Permission Form */}
        <form onSubmit={handleAddOrUpdateShare} className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-700 mb-3 flex items-center font-bold">
            <Plus className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Delegate Clearance to Viewer
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingUsers || users.length === 0}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
              >
                {users.length === 0 ? (
                  <option value="">No other registered users found</option>
                ) : (
                  users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email}) [{u.role.toUpperCase()}]
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="read">Read-Only (View & Download)</option>
                <option value="edit">Can Edit (Edit & Download)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting || !selectedUserId}
                className="w-full h-full py-2 px-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs transition disabled:opacity-50 shadow-xs"
              >
                {submitting ? '...' : 'Grant'}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            *Users without an explicit clearance grant are strictly blocked from downloading (HTTP 403).
          </p>
        </form>

        {/* Current Active Shares List */}
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-slate-700 mb-2 font-bold">
            Active Clearance Grants ({doc.sharedWith?.length || 0})
          </p>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {!doc.sharedWith || doc.sharedWith.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                This document is strictly restricted to its owner and administrators. No viewers currently have download clearance.
              </div>
            ) : (
              doc.sharedWith.map((share) => {
                const targetUser = share.user;
                return (
                  <div
                    key={share._id || (typeof targetUser === 'object' ? targetUser._id : targetUser)}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {typeof targetUser === 'object' ? targetUser.name : 'User'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {typeof targetUser === 'object' ? targetUser.email : targetUser}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold border ${
                          share.permission === 'edit'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {share.permission === 'edit' ? 'Can Edit & Download' : 'Read-Only'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRevokeShare(typeof targetUser === 'object' ? targetUser._id : targetUser)}
                        disabled={submitting}
                        title="Revoke clearance immediately"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-slate-200"
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
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
