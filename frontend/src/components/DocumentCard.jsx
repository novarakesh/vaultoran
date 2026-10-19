import React, { useState } from 'react';
import apiClient from '../api/client';
import {
  Download,
  Share2,
  Trash2,
  ShieldCheck,
  Calendar,
  User,
  HardDrive,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';

const DocumentCard = ({
  document: doc,
  canManage = false,
  onShareClick,
  onDeleteClick,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const copyHashToClipboard = () => {
    navigator.clipboard.writeText(doc.fileHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError('');

    try {
      const response = await apiClient.get(`/api/documents/${doc._id}/download`, {
        responseType: 'blob',
      });

      // Extract filename from Content-Disposition header if available
      let filename = doc.originalName || `${doc.title}.pdf`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = decodeURIComponent(matches[1].replace(/['"]/g, ''));
        }
      }

      // Create download link from secure stream blob
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
      console.error('Secure streaming error:', err);
      setDownloadError(err.response?.data?.error || 'Integrity or authorization check failed on download.');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between border-white/5 relative">
      <div>
        {/* Header: Category and Share Count */}
        <div className="flex items-center justify-between mb-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30">
            {doc.category || 'Confidential'}
          </span>

          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-[11px]">{formatFileSize(doc.size)}</span>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-base font-bold text-white mb-1.5 line-clamp-1 hover:text-cyber-cyan transition">
          {doc.title}
        </h4>
        <p className="text-xs text-slate-400 font-mono mb-4 truncate">{doc.originalName}</p>

        {/* SHA-256 Integrity Hash Badge */}
        <div className="mb-4 p-2 rounded-xl bg-vault-950/70 border border-white/5 flex items-center justify-between group">
          <div className="flex items-center space-x-1.5 overflow-hidden">
            <ShieldCheck className="w-3.5 h-3.5 text-cyber-emerald flex-shrink-0" />
            <span className="text-[10px] text-slate-400 font-mono truncate" title={doc.fileHash}>
              SHA-256: <span className="text-slate-300 font-medium">{doc.fileHash.substring(0, 16)}...</span>
            </span>
          </div>

          <button
            onClick={copyHashToClipboard}
            className="p-1 rounded text-slate-500 hover:text-cyber-cyan transition"
            title="Copy full cryptographic hash"
          >
            {copiedHash ? <Check className="w-3.5 h-3.5 text-cyber-emerald" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Metadata Footer */}
        <div className="space-y-1.5 text-xs text-slate-400 mb-5">
          <div className="flex items-center space-x-2">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate">
              Owner: <strong className="text-slate-300">{doc.owner?.name || 'Authorized Owner'}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {downloadError && (
        <div className="mb-3 p-2 rounded-lg bg-cyber-rose/15 border border-cyber-rose/30 text-cyber-rose text-[11px] flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{downloadError}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 mr-2 px-3.5 py-2 rounded-xl bg-cyber-cyan/15 hover:bg-cyber-cyan text-cyber-cyan hover:text-vault-950 border border-cyber-cyan/30 text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-glow-cyan"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{downloading ? 'Verifying & Streaming...' : 'Secure Stream'}</span>
        </button>

        {canManage && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onShareClick(doc)}
              title="Manage Shares"
              className="p-2 rounded-xl text-slate-400 hover:text-cyber-purple hover:bg-cyber-purple/10 transition"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteClick(doc)}
              title="Soft Delete Document"
              className="p-2 rounded-xl text-slate-400 hover:text-cyber-rose hover:bg-cyber-rose/10 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentCard;
