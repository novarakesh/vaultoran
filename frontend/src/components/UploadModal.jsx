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

  // Compute cryptographic hash in browser
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
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-neutral-100">Deposit Confidential Document</h3>
            <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono font-medium">Encrypted vault storage and integrity validation</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center space-x-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold">
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
            className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer bg-slate-50 dark:bg-neutral-800 hover:bg-slate-100/50 dark:hover:bg-neutral-700 transition group"
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
                <File className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800 dark:text-neutral-100">{file.name}</p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono font-medium">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 mx-auto text-slate-400 dark:text-neutral-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition mb-2" />
                <p className="text-sm text-slate-800 dark:text-neutral-200 font-semibold">Click to select or drag and drop document</p>
                <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1 font-medium">PDF, Office, CSV, Images (Max 15MB)</p>
              </div>
            )}
          </div>

          {calculatingHash && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono animate-pulse font-semibold">Generating cryptographic hash...</p>
          )}
          {clientHash && !calculatingHash && (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[10px] text-slate-600 dark:text-neutral-400 font-mono uppercase block font-bold">Cryptographic Checksum:</span>
                <span className="text-[11px] text-slate-800 dark:text-neutral-200 font-mono truncate block font-medium">{clientHash}</span>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-800 dark:text-neutral-200 mb-1.5 font-bold">
              Document Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Executive Financial Audit"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-slate-800 dark:text-neutral-100 placeholder-slate-500 dark:placeholder-neutral-500 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-800 transition"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-800 dark:text-neutral-200 mb-1.5 font-bold">
              Classification Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-slate-800 dark:text-neutral-100 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-800 transition"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100">
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
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2 shadow-xs cursor-pointer"
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
