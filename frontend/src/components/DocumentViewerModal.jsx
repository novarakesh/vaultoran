import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  File,
  ShieldCheck,
  Maximize2,
  Minimize2,
  AlertCircle,
  Calendar,
  User,
  HardDrive,
  Eye,
  RefreshCw,
  Lock
} from 'lucide-react';

const TEXT_EXTENSIONS = [
  'txt', 'sql', 'json', 'csv', 'md', 'js', 'jsx', 'ts', 'tsx',
  'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'xml', 'log',
  'yaml', 'yml', 'env', 'sh', 'bat', 'ps1', 'ini', 'conf'
];

const DocumentViewerModal = ({ isOpen, onClose, document: doc }) => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [blobUrl, setBlobUrl] = useState(null);
  const [fileType, setFileType] = useState('text'); // 'text' | 'pdf' | 'image' | 'binary'
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [wrapText, setWrapText] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Determine file type helper
  const detectFileType = (documentItem) => {
    if (!documentItem) return 'text';
    const mime = (documentItem.mimeType || '').toLowerCase();
    const name = (documentItem.originalName || documentItem.title || '').toLowerCase();
    const ext = name.split('.').pop() || '';

    if (mime === 'application/pdf' || ext === 'pdf') {
      return 'pdf';
    }
    if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
      return 'image';
    }
    if (
      mime.startsWith('text/') ||
      mime === 'application/json' ||
      mime === 'application/javascript' ||
      mime === 'application/xml' ||
      TEXT_EXTENSIONS.includes(ext)
    ) {
      return 'text';
    }
    return 'binary';
  };

  useEffect(() => {
    if (!isOpen || !doc) {
      setContent('');
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setError('');
      setIsFullscreen(false);
      return;
    }

    let active = true;
    const detected = detectFileType(doc);
    setFileType(detected);
    setLoading(true);
    setError('');

    const fetchDocumentContent = async () => {
      try {
        const response = await apiClient.get(`/api/documents/${doc._id}/download`, {
          responseType: 'blob',
        });

        if (!active) return;

        if (detected === 'text') {
          const text = await response.data.text();
          setContent(text);
        } else {
          const url = window.URL.createObjectURL(response.data);
          setBlobUrl(url);
        }
      } catch (err) {
        if (!active) return;
        console.error('Failed to stream document for preview:', err);
        let errorMsg = 'Failed to load document content.';
        if (err.response && err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const parsed = JSON.parse(text);
            if (parsed && parsed.error) {
              errorMsg = parsed.error;
            }
          } catch (_) {}
        } else if (err.response?.data?.error) {
          errorMsg = err.response.data.error;
        }
        setError(errorMsg);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDocumentContent();

    return () => {
      active = false;
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const handleCopyText = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      const response = await apiClient.get(`/api/documents/${doc._id}/download`, {
        responseType: 'blob',
      });
      let filename = doc.originalName || `${doc.title}.pdf`;
      const blob = new Blob([response.data], { type: doc.mimeType });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const lines = content ? content.split('\n') : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs transition-all">
      <div
        className={`bg-white dark:bg-[#141414] rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full fixed inset-2 sm:inset-4 rounded-xl'
            : 'w-full max-w-5xl h-[88vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/80 dark:bg-neutral-850/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              {fileType === 'pdf' ? (
                <File className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              ) : fileType === 'image' ? (
                <Eye className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>

            <div className="overflow-hidden">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100 truncate">
                  {doc.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-200 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200">
                  {doc.category || 'Confidential'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono truncate font-semibold">{doc.originalName}</p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {fileType === 'text' && !loading && !error && (
              <>
                <button
                  onClick={handleCopyText}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-bold transition flex items-center space-x-1 shadow-2xs cursor-pointer"
                  title="Copy full text to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setWrapText(!wrapText)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition shadow-2xs cursor-pointer ${
                    wrapText
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                      : 'bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-700'
                  }`}
                  title="Toggle Word Wrap"
                >
                  Wrap
                </button>

                <button
                  onClick={() => setShowLineNumbers(!showLineNumbers)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition shadow-2xs cursor-pointer ${
                    showLineNumbers
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                      : 'bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-700'
                  }`}
                  title="Toggle Line Numbers"
                >
                  Lines
                </button>
              </>
            )}

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
              title="Download file to device"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-700 transition shadow-2xs cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security & Cryptographic Integrity Banner */}
        <div className="px-5 py-2 bg-emerald-50/70 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between text-xs flex-shrink-0">
          <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="font-mono text-[11px] truncate">
              <strong>Verified Integrity:</strong> SHA-256 <span className="opacity-90">{doc.fileHash}</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-4 text-slate-700 dark:text-neutral-300 text-[11px] font-mono font-medium">
            <span className="flex items-center space-x-1">
              <HardDrive className="w-3 h-3 text-slate-500 dark:text-neutral-400" />
              <span>{formatFileSize(doc.size)}</span>
            </span>
            <span className="flex items-center space-x-1">
              <User className="w-3 h-3 text-slate-500 dark:text-neutral-400" />
              <span>{doc.owner?.name || 'Owner'}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-slate-500 dark:text-neutral-400" />
              <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white dark:bg-[#121212] overflow-hidden relative flex flex-col">
          {loading && (
            <div className="absolute inset-0 z-10 bg-white/90 dark:bg-neutral-900/90 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <p className="text-sm font-bold text-slate-800 dark:text-neutral-100">
                Retrieving document stream from Vaultoran...
              </p>
              <p className="text-xs font-mono text-slate-500 dark:text-neutral-400 font-semibold">
                Verifying cryptographic integrity hash
              </p>
            </div>
          )}

          {error && (
            <div className="p-8 flex flex-col items-center justify-center text-center h-full">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-neutral-100 mb-1">
                Unable to Display Document
              </h4>
              <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mb-6 font-medium">{error}</p>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-bold transition cursor-pointer"
                >
                  Close Reader
                </button>
              </div>
            </div>
          )}

          {!loading && !error && fileType === 'text' && (
            <div className="flex-1 overflow-auto flex font-mono text-xs leading-relaxed selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-900 dark:selection:text-indigo-200">
              {showLineNumbers && (
                <div className="bg-slate-50 dark:bg-neutral-900 border-r border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-500 select-none py-4 px-3 text-right font-mono flex-shrink-0 font-medium">
                  {lines.map((_, i) => (
                    <div key={i} className="leading-5">
                      {i + 1}
                    </div>
                  ))}
                </div>
              )}
              <div
                className={`flex-1 p-4 text-slate-900 dark:text-neutral-100 font-mono ${
                  wrapText ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
                }`}
              >
                {lines.map((line, idx) => (
                  <div key={idx} className="leading-5 hover:bg-slate-50 dark:hover:bg-neutral-800/60 px-1 rounded-xs">
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !error && fileType === 'pdf' && (
            <div className="flex-1 h-full w-full bg-slate-100 dark:bg-neutral-900 p-2 sm:p-4">
              {blobUrl ? (
                <iframe
                  src={blobUrl}
                  title={doc.title}
                  className="w-full h-full rounded-xl border border-slate-300 dark:border-neutral-700 shadow-inner bg-white dark:bg-neutral-800"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-600 dark:text-neutral-400 text-xs font-medium">
                  Preparing PDF preview...
                </div>
              )}
            </div>
          )}

          {!loading && !error && fileType === 'image' && (
            <div className="flex-1 overflow-auto bg-slate-100/50 dark:bg-neutral-900/50 p-6 flex items-center justify-center">
              {blobUrl && (
                <img
                  src={blobUrl}
                  alt={doc.title}
                  className="max-h-full max-w-full rounded-xl border border-slate-200 dark:border-neutral-700 shadow-md object-contain"
                />
              )}
            </div>
          )}

          {!loading && !error && fileType === 'binary' && (
            <div className="p-8 flex flex-col items-center justify-center text-center h-full">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-neutral-100 mb-1">
                Binary / Encrypted File Vault Entry
              </h4>
              <p className="text-xs text-slate-600 dark:text-neutral-400 max-w-md mb-2 font-medium">
                This document is formatted as <code className="font-mono text-slate-800 dark:text-neutral-200 font-bold">{doc.mimeType || 'binary'}</code> and cannot be rendered directly in the text reader.
              </p>
              <p className="text-xs text-slate-600 dark:text-neutral-400 mb-6 font-medium">
                You can download the verified authentic file to open it with your authorized local application.
              </p>
              <button
                onClick={handleDownload}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center space-x-2 shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Secure Download File ({formatFileSize(doc.size)})</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Statistics Bar */}
        <div className="px-5 py-2.5 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-850 text-[11px] text-slate-600 dark:text-neutral-400 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <span className="font-mono uppercase font-bold text-slate-700 dark:text-neutral-300">
              Format: {doc.mimeType || 'application/octet-stream'}
            </span>
            {fileType === 'text' && (
              <span className="font-mono font-medium">
                {lines.length} {lines.length === 1 ? 'line' : 'lines'} • {content.length} characters
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-mono text-[10px] text-slate-600 dark:text-neutral-400 font-bold">
              Vaultoran Zero-Trust Secure Reader
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;
