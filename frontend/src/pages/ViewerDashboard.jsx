import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
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
  Clock
} from 'lucide-react';

const CATEGORIES = ['All', 'Confidential', 'Financial', 'Legal', 'Technical', 'HR', 'Executive'];

const ViewerDashboard = () => {
  const { user } = useAuth();
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-emerald mr-3 shadow-glow-emerald"></span>
            Viewer Compartment Dashboard
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Access confidential documents securely delegated to your identity clearance
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-vault-900 px-3 py-1.5 rounded-xl border border-white/5">
          <Clock className="w-3.5 h-3.5 text-cyber-cyan" />
          <span>Active Clearance: Verified</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Accessible Documents"
          value={documents.length}
          subtitle="Delegated with clearance"
          icon={FileCheck}
          color="emerald"
        />
        <StatCard
          title="Cryptographic Proof"
          value="SHA-256"
          subtitle="Validated before streaming"
          icon={ShieldCheck}
          color="cyan"
        />
        <StatCard
          title="Audit Logging"
          value="Immutable"
          subtitle="All downloads logged"
          icon={Eye}
          color="purple"
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
            placeholder="Search documents by title..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-vault-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyber-emerald font-mono"
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
            className="px-3 py-2 rounded-xl bg-vault-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyber-emerald"
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
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-vault-850 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyber-emerald' : ''}`} />
          </button>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-cyber-emerald/20 border-t-cyber-emerald rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">Retrieving Authorized Documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border-dashed border-white/10 text-center">
          <Eye className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Shared Documents Available</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You do not currently have any confidential documents delegated to your account, or no documents match your active filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <DocumentCard
              key={doc._id}
              document={doc}
              canManage={user?.role === 'admin'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewerDashboard;
