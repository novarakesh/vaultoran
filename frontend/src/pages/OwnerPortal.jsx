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
  ShieldCheck,
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
      const res = await apiClient.get('/api/users');
      // Filter only viewers
      const vList = (res.data.users || []).filter((u) => u.role === 'viewer');
      setViewers(vList);
      if (vList.length > 0 && !selectedViewerId) {
        setSelectedViewerId(vList[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch viewers:', err);
    }
  };

  const handleUploadSuccess = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocForClearance(newDoc._id);
  };

  const handleShareUpdated = (updatedDoc) => {
    setDocuments((prev) =>
      prev.map((d) => (d._id === updatedDoc._id ? updatedDoc : d))
    );
    setActiveShareDoc(updatedDoc);
  };

  const handleDeleteConfirm = async () => {
    if (!docToDelete) return;
    try {
      setDeleting(true);
      await apiClient.delete(`/api/documents/${docToDelete._id}`);
      setDocuments((prev) => prev.filter((d) => d._id !== docToDelete._id));
      setDocToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Direct Clearance Grant from Clearance Manager Tab
  const handleGrantClearance = async (e) => {
    e.preventDefault();
    if (!selectedDocForClearance || !selectedViewerId) return;

    try {
      setClearanceStatus('');
      const res = await apiClient.put(`/api/documents/${selectedDocForClearance}/share`, {
        userId: selectedViewerId,
        permission: clearancePermission,
      });

      setClearanceStatus(`Clearance successfully granted (${clearancePermission === 'edit' ? 'Can Edit & Download' : 'Read-Only'}). Viewer can now access and stream this document.`);
      handleShareUpdated(res.data.document);
    } catch (err) {
      setClearanceStatus(`Failed to grant clearance: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleRevokeClearance = async (docId, viewerId) => {
    try {
      const res = await apiClient.put(`/api/documents/${docId}/share`, {
        userId: viewerId,
        permission: 'none',
      });
      setClearanceStatus('Clearance revoked. Viewer can no longer download or view this document.');
      handleShareUpdated(res.data.document);
    } catch (err) {
      setClearanceStatus(`Revocation failed: ${err.response?.data?.error || err.message}`);
    }
  };

  // Metrics Calculations
  const totalStorage = documents.reduce((acc, curr) => acc + (curr.size || 0), 0);
  const totalShares = documents.reduce((acc, curr) => acc + (curr.sharedWith?.length || 0), 0);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const currentClearanceDoc = documents.find((d) => d._id === selectedDocForClearance);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* Functional Owner Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Main Owner Compartment Area */}
      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600 mr-3"></span>
              Document Owner Vault Compartment
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Deposit confidential files, verify SHA-256 integrity, and delegate viewer access
            </p>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Deposit Document</span>
          </button>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
          <StatCard
            title="Integrity Verification"
            value="100% SHA-256"
            subtitle="Zero-tamper guarantee"
            icon={ShieldCheck}
            color="emerald"
          />
        </div>

        {/* TAB 1: VAULT (Documents Overview) */}
        {activeTab === 'vault' && (
          <>
            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents by title..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto">
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono uppercase text-[11px] font-semibold">Category:</span>
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <button
                  onClick={fetchDocuments}
                  title="Refresh Vault Documents"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition border border-slate-200"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Documents Grid */}
            {loading ? (
              <div className="py-24 text-center">
                <div className="w-8 h-8 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Accessing Vault Storage...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center shadow-xs">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No Documents in Private Vault</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
                  Deposit your confidential files into the vault to generate cryptographic SHA-256 hashes and delegate clearance.
                </p>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition shadow-sm"
                >
                  Upload First Document
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc._id}
                    document={doc}
                    canManage={true}
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-indigo-600" />
                  Viewer Clearance & Delegation Console
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Only viewers with explicit clearance can view and download. Non-cleared users are strictly blocked.
                </p>
              </div>
            </div>

            {clearanceStatus && (
              <div className="mb-6 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono">
                {clearanceStatus}
              </div>
            )}

            {/* Grant Permission Form */}
            <form onSubmit={handleGrantClearance} className="p-5 rounded-xl bg-slate-50 border border-slate-200 mb-8">
              <h4 className="text-xs font-bold uppercase font-mono text-slate-700 mb-4 flex items-center">
                <Plus className="w-4 h-4 mr-1 text-indigo-600" /> Delegate Document Clearance
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
                    1. Select Document
                  </label>
                  <select
                    value={selectedDocForClearance}
                    onChange={(e) => setSelectedDocForClearance(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                  >
                    {documents.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.title} ({d.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
                    2. Select Viewer
                  </label>
                  <select
                    value={selectedViewerId}
                    onChange={(e) => setSelectedViewerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                  >
                    {viewers.length === 0 ? (
                      <option value="">No registered viewers found</option>
                    ) : (
                      viewers.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.name} ({v.email})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
                    3. Clearance Level
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={clearancePermission}
                      onChange={(e) => setClearancePermission(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                    >
                      <option value="read">Read-Only (View & Download)</option>
                      <option value="edit">Can Edit (Edit & Download)</option>
                    </select>

                    <button
                      type="submit"
                      disabled={!selectedDocForClearance || !selectedViewerId}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                    >
                      Grant
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Active Grants for Selected Document */}
            {currentClearanceDoc && (
              <div>
                <h4 className="text-xs font-bold uppercase font-mono text-slate-700 mb-3">
                  Current Clearance Grants for "{currentClearanceDoc.title}" ({currentClearanceDoc.sharedWith?.length || 0})
                </h4>

                <div className="space-y-2">
                  {!currentClearanceDoc.sharedWith || currentClearanceDoc.sharedWith.length === 0 ? (
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                      No viewers have been granted clearance on this document. Non-cleared users are strictly blocked from downloading.
                    </div>
                  ) : (
                    currentClearanceDoc.sharedWith.map((share) => {
                      const vObj = share.user;
                      const vId = typeof vObj === 'object' ? vObj._id : vObj;
                      const vName = typeof vObj === 'object' ? vObj.name : 'Viewer';
                      const vEmail = typeof vObj === 'object' ? vObj.email : vId;

                      return (
                        <div
                          key={vId}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800">{vName}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{vEmail}</p>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                                share.permission === 'edit'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {share.permission === 'edit' ? 'Can Edit & Download' : 'Read-Only & Download'}
                            </span>

                            <button
                              onClick={() => handleRevokeClearance(currentClearanceDoc._id, vId)}
                              title="Revoke clearance (Blocks download)"
                              className="px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 font-medium transition flex items-center space-x-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs mb-8">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
              <HardDrive className="w-4 h-4 mr-2 text-indigo-600" />
              Vault Storage Footprint & Classification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-mono uppercase text-slate-500 mb-1">Total Storage Allocated</p>
                <p className="text-3xl font-extrabold text-slate-900">{formatBytes(totalStorage)}</p>
                <p className="text-xs text-slate-400 mt-2">Across {documents.length} secure confidential documents</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-mono uppercase text-slate-500 mb-1">Clearance Grants</p>
                <p className="text-3xl font-extrabold text-slate-900">{totalShares}</p>
                <p className="text-xs text-slate-400 mt-2">Active access delegations across registered viewers</p>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white max-w-md w-full p-6 rounded-2xl border border-rose-200 shadow-xl">
              <div className="flex items-center space-x-3 mb-4 text-rose-600">
                <div className="p-2.5 rounded-xl bg-rose-100">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Confirm Soft-Deletion</h3>
              </div>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                Are you sure you want to soft-delete <span className="font-bold text-slate-800">"{docToDelete.title}"</span>? The document will be revoked from all viewers and archived for compliance audit.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDocToDelete(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 transition"
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
