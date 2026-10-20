import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { UserCheck, X, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

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
      fetchUserDirectory();
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const fetchUserDirectory = async () => {
    try {
      setLoadingUsers(true);
      const res = await apiClient.get('/api/users');
      // Filter out current document owner from potential shares
      const eligibleUsers = (res.data.users || []).filter(
        (u) => u._id !== (typeof doc?.owner === 'object' ? doc.owner._id : doc?.owner)
      );
      setUsers(eligibleUsers);
      if (eligibleUsers.length > 0) {
        setSelectedUserId(eligibleUsers[0]._id);
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

      setSuccess('Clearance updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
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
        permission: 'revoke',
      });

      setSuccess('Clearance revoked.');
      setTimeout(() => setSuccess(''), 3000);
      onShareUpdated(res.data.document);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revoke document sharing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#141414] max-w-xl w-full p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xl relative transition-colors duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-neutral-100">Manage Viewer Clearances</h3>
            <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono truncate max-w-sm font-semibold">{doc.title}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center space-x-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center space-x-2.5 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Grant Permission Form */}
        <form onSubmit={handleAddOrUpdateShare} className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 mb-6">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-800 dark:text-neutral-200 mb-3 flex items-center font-bold">
            <Plus className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" /> Delegate Clearance to Viewer
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingUsers || users.length === 0}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-slate-800 dark:text-neutral-100 text-xs font-medium focus:outline-none focus:border-indigo-500"
              >
                {users.length === 0 ? (
                  <option value="" className="bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100">No other registered users found</option>
                ) : (
                  users.map((u) => (
                    <option key={u._id} value={u._id} className="bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100">
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
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-slate-800 dark:text-neutral-100 text-xs focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="read" className="bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100">Read-Only (View & Stream)</option>
                <option value="edit" className="bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100">Can Edit (Edit & Stream)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting || !selectedUserId}
                className="w-full h-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {submitting ? '...' : 'Grant'}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-neutral-400 mt-2 font-mono font-medium">
            *Users without an explicit clearance grant are strictly blocked from downloading (HTTP 403).
          </p>
        </form>

        {/* Current Active Shares List */}
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-slate-800 dark:text-neutral-200 mb-2 font-bold">
            Active Clearance Grants ({doc.sharedWith?.length || 0})
          </p>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {!doc.sharedWith || doc.sharedWith.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-center text-xs font-medium text-slate-600 dark:text-neutral-400">
                This document is strictly restricted to its owner and administrators. No viewers currently have download clearance.
              </div>
            ) : (
              doc.sharedWith.map((share) => {
                const targetUser = share.user;
                return (
                  <div
                    key={share._id || (typeof targetUser === 'object' ? targetUser._id : targetUser)}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-neutral-100">
                        {typeof targetUser === 'object' ? targetUser.name : 'User'}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-neutral-400 font-mono font-medium">
                        {typeof targetUser === 'object' ? targetUser.email : targetUser}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold border ${
                          share.permission === 'edit'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {share.permission === 'edit' ? 'Can Edit & Download' : 'Read-Only'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRevokeShare(typeof targetUser === 'object' ? targetUser._id : targetUser)}
                        disabled={submitting}
                        title="Revoke clearance immediately"
                        className="p-1.5 rounded-lg text-slate-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-neutral-700 transition border border-slate-200 dark:border-neutral-700 cursor-pointer"
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
      </div>
    </div>
  );
};

export default ShareModal;
