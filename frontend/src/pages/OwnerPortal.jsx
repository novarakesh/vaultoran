import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import DocumentCard from '../components/DocumentCard';
import UploadModal from '../components/UploadModal';
import ShareModal from '../components/ShareModal';
import {
  FileText,
  Share2,
  HardDrive,
  Search,
  Filter,
  Plus,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  Trash2,
  Lock,
  Edit3
} from 'lucide-react';

const CATEGORIES = ['All', 'Confidential', 'Financial', 'Legal', 'Technical', 'HR', 'Executive'];

const OwnerPortal = () => {
  const [activeTab, setActiveTab] = useState('vault');
  const [documents, setDocuments] = useState([]);
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeShareDoc, setActiveShareDoc] = useState(null);
  const [docToDelete, setDocToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Clearance Manager state
  const [selectedDocForClearance, setSelectedDocForClearance] = useState('');
  const [selectedViewerId, setSelectedViewerId] = useState('');
  const [clearancePermission, setClearancePermission] = useState('read');
  const [clearanceStatus, setClearanceStatus] = useState('');

  useEffect(() => {
    fetchDocuments();
    fetchViewers();
  }, [searchQuery, selectedCategory]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedCategory !== 'All') params.category = selectedCategory;

      const res = await apiClient.get('/api/documents', { params });
      setDocuments(res.data.documents || []);

      if (res.data.documents && res.data.documents.length > 0 && !selectedDocForClearance) {
        setSelectedDocForClearance(res.data.documents[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchViewers = async () => {
    try {
      const res = await apiClient.get('/api/users/viewers');
      setViewers(res.data.viewers || []);
      if (res.data.viewers && res.data.viewers.length > 0 && !selectedViewerId) {
        setSelectedViewerId(res.data.viewers[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch viewers:', err);
    }
  };

  const handleUploadSuccess = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev]);
    if (!selectedDocForClearance) {
      setSelectedDocForClearance(newDoc._id);
    }
  };

  const handleShareUpdated = (updatedDoc) => {
    setDocuments((prev) =>
      prev.map((d) => (d._id === updatedDoc._id ? updatedDoc : d))
    );
    setActiveShareDoc(updatedDoc);
  };

  const handleDeleteConfirm = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/documents/${docToDelete._id}`);
      setDocuments((prev) => prev.filter((d) => d._id !== docToDelete._id));
      setDocToDelete(null);
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Grant Clearance from dedicated tab
  const handleGrantClearance = async (e) => {
    e.preventDefault();
    if (!selectedDocForClearance || !selectedViewerId) return;

    try {
      setClearanceStatus('Granting clearance...');
      const res = await apiClient.put(`/api/documents/${selectedDocForClearance}/share`, {
        userId: selectedViewerId,
        permission: clearancePermission,
      });

      setClearanceStatus('Clearance granted successfully.');
      setTimeout(() => setClearanceStatus(''), 3000);
      handleShareUpdated(res.data.document);
    } catch (err) {
      setClearanceStatus(`Failed: ${err.response?.data?.error || err.message}`);
    }
  };

  // Revoke Clearance from dedicated tab
  const handleRevokeClearance = async (docId, targetUserId) => {
    try {
      const res = await apiClient.put(`/api/documents/${docId}/share`, {
        userId: targetUserId,
        permission: 'revoke',
      });
      handleShareUpdated(res.data.document);
    } catch (err) {
      console.error('Revoke clearance error:', err);
    }
  };

  // Metrics
  const totalShares = documents.reduce((acc, curr) => acc + (curr.sharedWith?.length || 0), 0);
  const totalStorage = documents.reduce((acc, curr) => acc + (curr.size || 0), 0);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const currentClearanceDoc = documents.find((d) => d._id === selectedDocForClearance);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-200">
      {/* Functional Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Main Compartment */}
      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-neutral-50 tracking-tight flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 mr-3 shadow-xs"></span>
              Document Owner Vault Compartment
            </h2>
            <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-1 font-semibold">
              Deposit confidential files, manage access permissions, and delegate viewer clearance
            </p>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Deposit Document</span>
          </button>
        </div>

        {/* Metrics Row (SHA-256 card removed!) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="Protected Documents"
            value={documents.length}
            subtitle="Encrypted in private vault"
            icon={FileText}
            color="sky"
          />
          <StatCard
            title="Delegated Shares"
            value={totalShares}
            subtitle="To registered viewers"
            icon={Share2}
            color="purple"
          />
          <StatCard
            title="Vault Storage"
            value={formatBytes(totalStorage)}
            subtitle="Restricted private storage"
            icon={HardDrive}
            color="indigo"
          />
        </div>

        {/* TAB 1: VAULT (Documents Overview) */}
        {activeTab === 'vault' && (
          <>
            {/* Search & Filter Bar */}
            <div className="bg-white dark:bg-[#141414] p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs mb-8 flex flex-col md:flex-row gap-4 justify-between items-center transition-colors">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-500 dark:text-neutral-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents by title..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-100 placeholder-slate-500 dark:placeholder-neutral-500 text-xs font-medium focus:outline-none focus:border-indigo-500 font-mono transition"
                />
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto">
                <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-neutral-400">
                  <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
                  <span className="font-mono uppercase text-[11px] font-bold">Category:</span>
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-100 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer transition"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <button
                  onClick={fetchDocuments}
                  title="Refresh Documents"
                  className="p-2 rounded-xl text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 transition border border-slate-200 dark:border-neutral-700 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Documents Grid */}
            {loading ? (
              <div className="py-24 text-center">
                <div className="w-8 h-8 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono uppercase tracking-wider font-semibold">Opening Vault Compartment...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="bg-white dark:bg-[#141414] p-12 rounded-3xl border border-dashed border-slate-300 dark:border-neutral-800 text-center shadow-xs">
                <FileText className="w-12 h-12 text-slate-400 dark:text-neutral-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-neutral-100 mb-1">Your Vault is Empty</h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 max-w-sm mx-auto mb-6 font-medium">
                  Deposit your confidential files into the vault to manage encrypted storage and delegate clearance.
                </p>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
                >
                  Deposit First Document
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc._id}
                    document={doc}
                    canManage={true}
                    onDocumentUpdated={fetchDocuments}
                    onShareClick={(d) => setActiveShareDoc(d)}
                    onDeleteClick={(d) => setDocToDelete(d)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB 3: CLEARANCE & VIEWER PERMISSIONS MANAGER */}
        {activeTab === 'clearance' && (
          <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs mb-8 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100 uppercase tracking-wider flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Viewer Clearance & Delegation Console
                </h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-0.5 font-medium">
                  Only viewers with explicit clearance can view and download. Non-cleared users are strictly blocked.
                </p>
              </div>
            </div>

            {clearanceStatus && (
              <div className="mb-6 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-semibold">
                {clearanceStatus}
              </div>
            )}

            {/* Grant Permission Form */}
            <form onSubmit={handleGrantClearance} className="p-5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 mb-8">
              <h4 className="text-xs font-bold uppercase font-mono text-slate-800 dark:text-neutral-200 mb-4 flex items-center">
                <Plus className="w-4 h-4 mr-1 text-indigo-600 dark:text-indigo-400" /> Delegate Document Clearance
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 mb-1 font-bold">
                    1. Select Document
                  </label>
                  <select
                    value={selectedDocForClearance}
                    onChange={(e) => setSelectedDocForClearance(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-xs text-slate-800 dark:text-neutral-100 font-medium focus:outline-none focus:border-indigo-500"
                  >
                    {documents.map((d) => (
                      <option key={d._id} value={d._id} className="bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100">
                        {d.title} ({d.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 mb-1 font-bold">
                    2. Select Viewer
                  </label>
                  <select
                    value={selectedViewerId}
                    onChange={(e) => setSelectedViewerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-xs text-slate-800 dark:text-neutral-100 font-medium focus:outline-none focus:border-indigo-500"
                  >
                    {viewers.length === 0 ? (
                      <option value="" className="bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100">No registered viewers found</option>
                    ) : (
                      viewers.map((v) => (
                        <option key={v._id} value={v._id} className="bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100">
                          {v.name} ({v.email})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 mb-1 font-bold">
                    3. Clearance Level
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={clearancePermission}
                      onChange={(e) => setClearancePermission(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-xs text-slate-800 dark:text-neutral-100 font-medium focus:outline-none focus:border-indigo-500"
                    >
                      <option value="read" className="bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100">Can Read (View & Download Only)</option>
                      <option value="edit" className="bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100">Can Edit (Edit, Revise & Download)</option>
                    </select>

                    <button
                      type="submit"
                      disabled={!selectedDocForClearance || !selectedViewerId}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      Grant
                    </button>
                  </div>
                </div>
              </div>

              {/* Clearance capability description helper */}
              <div className="mt-4 p-3 rounded-xl border text-xs">
                {clearancePermission === 'read' ? (
                  <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 p-2.5 rounded-lg font-medium">
                    <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>
                      <strong>Can Read:</strong> Viewer can stream, preview, and download authentic file. Editing, metadata changes, and file revision updates are strictly locked.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-purple-800 dark:text-purple-300 bg-purple-50/60 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60 p-2.5 rounded-lg font-medium">
                    <Edit3 className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    <span>
                      <strong>Can Edit:</strong> Viewer can stream, preview, download, edit document title/category, and commit revised file versions with recalculated SHA-256 integrity hashes.
                    </span>
                  </div>
                )}
              </div>
            </form>

            {/* Currently Active Shares for selected doc */}
            {currentClearanceDoc && (
              <div>
                <h4 className="text-xs font-mono uppercase font-bold text-slate-800 dark:text-neutral-200 mb-3">
                  Current Clearance Grants for "{currentClearanceDoc.title}" ({currentClearanceDoc.sharedWith?.length || 0})
                </h4>

                {!currentClearanceDoc.sharedWith || currentClearanceDoc.sharedWith.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs font-mono text-slate-600 dark:text-neutral-400 text-center font-medium">
                    This document is strictly restricted to your account. No viewer clearances granted.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentClearanceDoc.sharedWith.map((share) => {
                      const vObj = share.user;
                      const vId = typeof vObj === 'object' ? vObj._id : vObj;
                      const vName = typeof vObj === 'object' ? vObj.name : 'Authorized Viewer';
                      const vEmail = typeof vObj === 'object' ? vObj.email : 'Registered identity';

                      return (
                        <div
                          key={share._id || vId}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-neutral-100">{vName}</p>
                            <p className="text-[11px] font-mono text-slate-600 dark:text-neutral-400 font-medium">{vEmail}</p>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span
                              className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                                share.permission === 'edit'
                                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              }`}
                            >
                              {share.permission === 'edit' ? 'Can Edit & Download' : 'Read-Only & Download'}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRevokeClearance(currentClearanceDoc._id, vId)}
                              className="text-xs font-mono text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-bold transition cursor-pointer"
                            >
                              Revoke
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STORAGE ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs mb-8 transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100 uppercase tracking-wider mb-6 flex items-center">
              <HardDrive className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
              Vault Compartment Storage Telemetry
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700">
                <span className="text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase block font-bold">Total Space Utilized</span>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-neutral-100 mt-1">{formatBytes(totalStorage)}</p>
                <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1 font-medium">Encrypted AES disk storage</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700">
                <span className="text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase block font-bold">Total Clearances Granted</span>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-neutral-100 mt-1">{totalShares}</p>
                <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1 font-medium">Across registered viewers</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700">
                <span className="text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase block font-bold">Encrypted Documents</span>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-neutral-100 mt-1">{documents.length}</p>
                <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1 font-medium">Isolated compartment objects</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={handleUploadSuccess}
        />

        {/* Share Clearance Modal */}
        <ShareModal
          isOpen={!!activeShareDoc}
          onClose={() => setActiveShareDoc(null)}
          document={activeShareDoc}
          onShareUpdated={handleShareUpdated}
        />

        {/* Soft Delete Confirmation Modal */}
        {docToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#141414] max-w-md w-full p-6 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-xl">
              <div className="flex items-center space-x-3 mb-4 text-rose-600 dark:text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-neutral-100">Confirm Soft-Deletion</h3>
              </div>
              <p className="text-slate-600 dark:text-neutral-300 text-sm mb-6 leading-relaxed font-medium">
                Are you sure you want to soft-delete <span className="font-bold text-slate-800 dark:text-white">"{docToDelete.title}"</span>? The document will be revoked from all viewers and archived for compliance audit.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDocToDelete(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer"
                >
                  {deleting ? 'Archiving...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default OwnerPortal;
