import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import DocumentCard from '../components/DocumentCard';
import { useAuth } from '../context/AuthContext';
import {
  Eye,
  FileCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  KeyRound,
  Lock,
  Edit3
} from 'lucide-react';

const CATEGORIES = ['All', 'Confidential', 'Financial', 'Legal', 'Technical', 'HR', 'Executive'];

const ViewerDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('cleared');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchSharedDocuments();
  }, [searchQuery, selectedCategory]);

  const fetchSharedDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedCategory !== 'All') params.category = selectedCategory;

      const res = await apiClient.get('/api/documents', { params });
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to fetch shared documents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract current viewer's permission level ('read' | 'edit')
  const getViewerPermission = (doc) => {
    if (!doc.sharedWith || !user) return 'read';
    const entry = doc.sharedWith.find(
      (s) => (typeof s.user === 'object' ? s.user._id : s.user) === user._id
    );
    return entry ? entry.permission : 'read';
  };

  const readOnlyCount = documents.filter((d) => getViewerPermission(d) === 'read').length;
  const editableCount = documents.filter((d) => getViewerPermission(d) === 'edit').length;

  // Filter based on activeTab
  const displayedDocuments = documents.filter((doc) => {
    if (activeTab === 'readonly') {
      return getViewerPermission(doc) === 'read';
    }
    if (activeTab === 'editable') {
      return getViewerPermission(doc) === 'edit';
    }
    return true; // 'cleared' shows all
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-200">
      {/* Functional Viewer Sidebar */}
      <Sidebar activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

      {/* Main Viewer Compartment Area */}
      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-neutral-50 tracking-tight flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-3 shadow-xs"></span>
              Confidential Viewer Compartment
            </h2>
            <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-1 font-semibold">
              Securely view and stream documents delegated to your identity clearance
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-700 dark:text-neutral-300 bg-white dark:bg-[#141414] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-bold">Identity Clearance: Active</span>
          </div>
        </div>

        {/* Metrics Row (SHA-256 and Active Forensic Audit removed) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="Cleared Documents"
            value={documents.length}
            subtitle="Granted by document owners"
            icon={FileCheck}
            color="emerald"
          />
          <StatCard
            title="Read-Only Clearances"
            value={readOnlyCount}
            subtitle="Secure read-only streaming"
            icon={Lock}
            color="sky"
          />
          <StatCard
            title="Collaborative Clearances"
            value={editableCount}
            subtitle="Edit and update permissions"
            icon={Edit3}
            color="purple"
          />
        </div>

        {/* TAB: DOCUMENTS (Cleared, Read-Only, or Editable) */}
        {activeTab !== 'session' && (
          <>
            {/* Search & Filter Bar */}
            <div className="bg-white dark:bg-[#141414] p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs mb-8 flex flex-col md:flex-row gap-4 justify-between items-center transition-colors">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-500 dark:text-neutral-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cleared documents by title..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-100 placeholder-slate-500 dark:placeholder-neutral-500 text-xs font-medium focus:outline-none focus:border-emerald-500 font-mono transition"
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
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-100 text-xs focus:outline-none focus:border-emerald-500 font-medium cursor-pointer transition"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <button
                  onClick={fetchSharedDocuments}
                  title="Refresh Shared Documents"
                  className="p-2 rounded-xl text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 transition border border-slate-200 dark:border-neutral-700 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Documents Grid */}
            {loading ? (
              <div className="py-24 text-center">
                <div className="w-8 h-8 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono uppercase tracking-wider font-semibold">Accessing Authorized Vault...</p>
              </div>
            ) : displayedDocuments.length === 0 ? (
              <div className="bg-white dark:bg-[#141414] p-12 rounded-3xl border border-dashed border-slate-300 dark:border-neutral-800 text-center shadow-xs">
                <Eye className="w-12 h-12 text-slate-400 dark:text-neutral-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-neutral-100 mb-1">No Documents Cleared</h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 max-w-sm mx-auto font-medium">
                  {activeTab === 'readonly'
                    ? 'No read-only documents found.'
                    : activeTab === 'editable'
                    ? 'No collaborative edit-clearance documents found.'
                    : 'You do not currently have any confidential documents delegated to your account by an owner. Non-granted documents are strictly blocked.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedDocuments.map((doc) => (
                  <DocumentCard
                    key={doc._id}
                    document={doc}
                    canManage={false}
                    permissionLevel={getViewerPermission(doc)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB: IDENTITY & SECURITY */}
        {activeTab === 'session' && (
          <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs mb-8 transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100 uppercase tracking-wider mb-4 flex items-center">
              <KeyRound className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
              Viewer Security & Session Telemetry
            </h3>

            <div className="space-y-4 max-w-xl">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 space-y-2 text-xs font-mono font-medium">
                <p><strong className="text-slate-800 dark:text-neutral-200">Name:</strong> <span className="text-slate-700 dark:text-neutral-300">{user?.name}</span></p>
                <p><strong className="text-slate-800 dark:text-neutral-200">Email:</strong> <span className="text-slate-700 dark:text-neutral-300">{user?.email}</span></p>
                <p><strong className="text-slate-800 dark:text-neutral-200">Clearance Role:</strong> <span className="text-emerald-700 dark:text-emerald-400 font-bold uppercase">{user?.role}</span></p>
                <p><strong className="text-slate-800 dark:text-neutral-200">Session Token Version:</strong> <span className="text-slate-700 dark:text-neutral-300">v{user?.tokenVersion ?? 0}</span></p>
              </div>

              <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed font-medium">
                Your authenticated session is active and verified under zero-trust governance protocols.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ViewerDashboard;
