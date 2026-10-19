import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import DocumentCard from '../components/DocumentCard';
import { useAuth } from '../context/AuthContext';
import {
  Eye,
  FileCheck,
  ShieldCheck,
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
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* Functional Viewer Sidebar */}
      <Sidebar activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

      {/* Main Viewer Compartment Area */}
      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-3"></span>
              Confidential Viewer Compartment
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Securely view and stream documents delegated to your identity clearance
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Identity Clearance: Active</span>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="Cleared Documents"
            value={documents.length}
            subtitle="Granted by document owners"
            icon={FileCheck}
            color="emerald"
          />
          <StatCard
            title="Cryptographic Proof"
            value="SHA-256"
            subtitle="Verified before streaming"
            icon={ShieldCheck}
            color="sky"
          />
          <StatCard
            title="Forensic Audit"
            value="Active"
            subtitle="All view & download events logged"
            icon={Eye}
            color="purple"
          />
        </div>

        {/* TAB: DOCUMENTS (Cleared, Read-Only, or Editable) */}
        {activeTab !== 'session' && (
          <>
            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cleared documents by title..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-500 font-mono"
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
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-medium"
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
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition border border-slate-200"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Documents Grid */}
            {loading ? (
              <div className="py-24 text-center">
                <div className="w-8 h-8 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Accessing Authorized Vault...</p>
              </div>
            ) : displayedDocuments.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center shadow-xs">
                <Eye className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No Documents Cleared</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs mb-8">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
              <KeyRound className="w-4 h-4 mr-2 text-indigo-600" />
              Viewer Security & Session Telemetry
            </h3>

            <div className="space-y-4 max-w-xl">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono">
                <p><strong>Name:</strong> {user?.name}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Clearance Role:</strong> <span className="text-emerald-700 font-bold uppercase">{user?.role}</span></p>
                <p><strong>Session Token Version:</strong> v{user?.tokenVersion ?? 0}</p>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                If you suspect your credentials have been compromised, activate the emergency session killswitch to immediately revoke all active tokens.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ViewerDashboard;
