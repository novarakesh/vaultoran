import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
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
  AlertTriangle
} from 'lucide-react';

const CATEGORIES = ['All', 'Confidential', 'Financial', 'Legal', 'Technical', 'HR', 'Executive'];

const OwnerPortal = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeShareDoc, setActiveShareDoc] = useState(null);
  const [docToDelete, setDocToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [searchQuery, selectedCategory]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedCategory !== 'All') params.category = selectedCategory;

      const res = await apiClient.get('/api/documents', { params });
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev]);
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

  // Metrics Calculations
  const totalStorage = documents.reduce((acc, curr) => acc + (curr.size || 0), 0);
  const totalShares = documents.reduce((acc, curr) => acc + (curr.sharedWith?.length || 0), 0);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-cyan mr-3 shadow-glow-cyan"></span>
            Owner Vault Compartment
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Manage confidential documents, view SHA-256 hashes, and configure clearance shares
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyber-cyan text-vault-950 font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 transition shadow-glow-cyan"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Protected Documents"
          value={documents.length}
          subtitle="Actively monitored vault"
          icon={FileText}
          color="cyan"
        />
        <StatCard
          title="Delegated Shares"
          value={totalShares}
          subtitle="Across registered viewers"
          icon={Share2}
          color="purple"
        />
        <StatCard
          title="Vault Storage"
          value={formatBytes(totalStorage)}
          subtitle="Restricted private storage"
          icon={HardDrive}
          color="cyan"
        />
        <StatCard
          title="Integrity Verification"
          value="100% SHA-256"
          subtitle="Zero-tamper guarantee"
          icon={ShieldCheck}
          color="emerald"
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border-white/5 mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by document title..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-vault-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyber-cyan font-mono"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono uppercase text-[11px]">Category:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-vault-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyber-cyan"
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
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-vault-850 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyber-cyan' : ''}`} />
          </button>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-cyber-cyan/20 border-t-cyber-cyan rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">Accessing Vault Storage...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border-dashed border-white/10 text-center">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Documents Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            Your private vault is empty or no documents match your active search filters.
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyber-cyan text-vault-950 text-xs font-bold uppercase tracking-wider hover:bg-cyan-300 transition shadow-glow-cyan"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vault-950/80 backdrop-blur-md">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border-cyber-rose/30 shadow-glow-rose">
            <div className="flex items-center space-x-3 mb-4 text-cyber-rose">
              <div className="p-2.5 rounded-xl bg-cyber-rose/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Confirm Soft-Deletion</h3>
            </div>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Are you sure you want to soft-delete <span className="font-bold text-white">"{docToDelete.title}"</span>? The document will be revoked from all viewers and archived for compliance audit.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-vault-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-cyber-rose text-white hover:bg-rose-600 transition shadow-glow-rose"
              >
                {deleting ? 'Archiving...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerPortal;
