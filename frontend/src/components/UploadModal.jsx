import React, { useState } from 'react';
import apiClient from '../api/client';
import { Upload, X, File, ShieldCheck, AlertCircle } from 'lucide-react';

const CATEGORIES = ['Confidential', 'Financial', 'Legal', 'Technical', 'HR', 'Executive'];

const UploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Confidential');
  const [uploading, setUploading] = useState(false);
  const [clientHash, setClientHash] = useState('');
  const [calculatingHash, setCalculatingHash] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Compute SHA-256 hash in browser using Web Crypto API
  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;

    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('File exceeds maximum 15MB limit.');
      return;
    }

    setError('');
    setFile(selectedFile);
    if (!title) {
      // Clean extension for default title
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }

    try {
      setCalculatingHash(true);
      const buffer = await selectedFile.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      setClientHash(hashHex);
    } catch (e) {
      console.warn('Client hash computation skipped:', e);
    } finally {
      setCalculatingHash(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('category', category);

      const res = await apiClient.post('/api/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onUploadSuccess(res.data.document);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload document to secure vault.');
    } finally {
      setUploading(false);
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
          <div className="w-10 h-10 rounded-xl bg-cyber-cyan/15 text-cyber-cyan flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Deposit Confidential Document</h3>
            <p className="text-xs text-slate-400 font-mono">Secured with SHA-256 integrity validation</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-cyber-rose/10 border border-cyber-rose/30 flex items-center space-x-2.5 text-cyber-rose text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Drag & Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileChange(e.dataTransfer.files[0]);
              }
            }}
            className="border-2 border-dashed border-white/10 hover:border-cyber-cyan/40 rounded-xl p-6 text-center cursor-pointer bg-vault-900/50 transition group"
            onClick={() => document.getElementById('file-upload-input').click()}
          >
            <input
              id="file-upload-input"
              type="file"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files[0])}
            />

            {file ? (
              <div className="flex items-center justify-center space-x-3">
                <File className="w-8 h-8 text-cyber-cyan" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-200">{file.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 mx-auto text-slate-500 group-hover:text-cyber-cyan transition mb-2" />
                <p className="text-sm text-slate-300 font-medium">Click to select or drag and drop document</p>
                <p className="text-xs text-slate-500 mt-1">PDF, Office, CSV, Images (Max 15MB)</p>
              </div>
            )}
          </div>

          {/* Client SHA-256 Pre-calculation Badge */}
          {calculatingHash && (
            <p className="text-xs text-cyber-cyan font-mono animate-pulse">Calculating cryptographic SHA-256 checksum...</p>
          )}
          {clientHash && !calculatingHash && (
            <div className="p-2.5 rounded-lg bg-vault-900 border border-cyber-cyan/20 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-cyber-emerald flex-shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[10px] text-slate-400 font-mono uppercase block">SHA-256 Integrity Hash:</span>
                <span className="text-[11px] text-cyber-cyan font-mono truncate block">{clientHash}</span>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
              Document Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Executive Financial Audit"
              className="w-full px-3.5 py-2.5 rounded-xl bg-vault-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyber-cyan"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
              Security Classification Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-vault-900 border border-white/10 text-white text-sm focus:outline-none focus:border-cyber-cyan"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-vault-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-cyber-cyan text-vault-950 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-glow-cyan flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-vault-950/20 border-t-vault-950 rounded-full animate-spin"></div>
                  <span>Depositing to Vault...</span>
                </>
              ) : (
                <span>Upload to Vault</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
