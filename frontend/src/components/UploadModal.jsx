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
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Deposit Confidential Document</h3>
            <p className="text-xs text-slate-500 font-mono">Secured with SHA-256 integrity validation</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-2.5 text-rose-700 text-xs">
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
            className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-slate-100/50 transition group"
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
                <File className="w-8 h-8 text-indigo-600" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 mx-auto text-slate-400 group-hover:text-indigo-600 transition mb-2" />
                <p className="text-sm text-slate-700 font-medium">Click to select or drag and drop document</p>
                <p className="text-xs text-slate-500 mt-1">PDF, Office, CSV, Images (Max 15MB)</p>
              </div>
            )}
          </div>

          {/* Client SHA-256 Checksum Preview */}
          {calculatingHash && (
            <p className="text-xs text-indigo-600 font-mono animate-pulse">Calculating cryptographic SHA-256 checksum...</p>
          )}
          {clientHash && !calculatingHash && (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[10px] text-slate-500 font-mono uppercase block font-semibold">SHA-256 Integrity Hash:</span>
                <span className="text-[11px] text-slate-700 font-mono truncate block">{clientHash}</span>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 mb-1.5 font-bold">
              Document Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Executive Financial Audit"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 mb-1.5 font-bold">
              Classification Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition"
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
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2 shadow-xs"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
