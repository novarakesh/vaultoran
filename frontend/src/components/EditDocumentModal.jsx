import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import {
  X,
  Edit3,
  UploadCloud,
  FileCheck,
  AlertCircle,
  CheckCircle,
  File,
  Lock,
  HardDrive
} from 'lucide-react';

const CATEGORIES = ['Confidential', 'Financial', 'Legal', 'Technical', 'HR', 'Executive'];

const EditDocumentModal = ({ isOpen, onClose, document: doc, onDocumentUpdated }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Confidential');
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (doc) {
      setTitle(doc.title || '');
      setCategory(doc.category || 'Confidential');
      setSelectedFile(null);
      setError('');
      setSuccess('');
    }
  }, [doc, isOpen]);

  if (!isOpen || !doc) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setError('File size exceeds the 15MB maximum security limit.');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Document title cannot be empty.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', category);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await apiClient.put(`/api/documents/${doc._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Document updated successfully! Cryptographic ledger updated.');
      if (onDocumentUpdated) {
        onDocumentUpdated(res.data.document);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to update document:', err);
      setError(err.response?.data?.error || 'Failed to update document. Please verify clearance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#141414] max-w-lg w-full p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-2xl relative transition-colors duration-200">
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-neutral-100">
              Edit & Revise Document
            </h3>
            <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono truncate max-w-xs font-semibold">
              {doc.title}
            </p>
          </div>
        </div>

        {/* Clearance Notice */}
        <div className="mb-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-start space-x-2.5 text-xs text-purple-900 dark:text-purple-200">
          <FileCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase font-mono tracking-wider">Collaborative Edit Clearance Active:</span>
            <p className="text-[11px] text-purple-800 dark:text-purple-300 mt-0.5 leading-relaxed font-medium">
              You are authorized to modify document metadata and upload revised file versions. The cryptographic SHA-256 integrity hash will automatically recalculate upon revision.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Document Title */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-800 dark:text-neutral-200 mb-1.5 font-bold">
              Document Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q4 Board Review Summary"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 text-xs font-medium focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Classification Category */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-800 dark:text-neutral-200 mb-1.5 font-bold">
              Security Classification Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-neutral-100 text-xs font-medium focus:outline-none focus:border-purple-500 cursor-pointer transition"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Upload Revised Version (Optional) */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-800 dark:text-neutral-200 mb-1.5 font-bold">
              Upload Revised File Version <span className="text-slate-500 dark:text-neutral-400 font-normal">(Optional replacement)</span>
            </label>
            <div className="relative border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl p-4 text-center transition bg-slate-50/50 dark:bg-neutral-800/40">
              <input
                type="file"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {selectedFile ? (
                <div className="flex items-center justify-center space-x-2 text-purple-700 dark:text-purple-300">
                  <File className="w-5 h-5 flex-shrink-0" />
                  <span className="text-xs font-bold font-mono truncate max-w-xs">{selectedFile.name}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-6 h-6 text-slate-400 dark:text-neutral-500 mx-auto" />
                  <p className="text-xs text-slate-700 dark:text-neutral-300 font-medium">
                    Drop replacement file here or <span className="text-purple-600 dark:text-purple-400 font-bold underline">browse</span>
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
                    Current: {doc.originalName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition border border-slate-200 dark:border-neutral-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold font-mono uppercase tracking-wider transition shadow-sm disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving Revision...</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Save Document Edits</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDocumentModal;
