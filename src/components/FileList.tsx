'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  File, 
  Image as ImageIcon, 
  FileText, 
  Video, 
  Music, 
  Copy, 
  Eye, 
  Trash2, 
  X, 
  Loader2, 
  Download, 
  AlertTriangle,
  FileSpreadsheet,
  Presentation,
  FileCode
} from 'lucide-react';

function getFileIcon(mimetype: string, filename: string = '') {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  const isCodeOrText = 
    mimetype.startsWith('text/') ||
    [
      'application/json',
      'application/javascript',
      'application/x-javascript',
      'application/typescript',
      'application/xml',
      'application/x-yaml',
      'application/x-sh',
      'application/x-bash',
      'application/sql',
    ].includes(mimetype) ||
    [
      'txt', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'md', 'py', 
      'go', 'java', 'c', 'cpp', 'h', 'hpp', 'sh', 'bash', 'yml', 'yaml', 
      'xml', 'ini', 'conf', 'sql', 'gitignore', 'env', 'rs', 'swift', 'kt', 
      'php', 'rb', 'pl', 'cs', 'fs', 'scala', 'dart', 'hs', 'lua', 'r', 'm'
    ].includes(ext);

  if (isCodeOrText) {
    return <FileCode size={24} style={{ color: '#a855f7' }} />; // Code purple
  }

  if (mimetype.startsWith('image/')) return <ImageIcon size={24} style={{ color: '#3b82f6' }} />;
  if (mimetype.startsWith('video/')) return <Video size={24} style={{ color: '#ec4899' }} />;
  if (mimetype.startsWith('audio/')) return <Music size={24} style={{ color: '#10b981' }} />;
  if (mimetype === 'application/pdf' || ext === 'pdf') return <FileText size={24} style={{ color: '#ef4444' }} />;

  if (
    mimetype === 'application/msword' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'doc' ||
    ext === 'docx'
  ) {
    return <FileText size={24} style={{ color: '#60a5fa' }} />; // Word blue
  }
  if (
    mimetype === 'application/vnd.ms-excel' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    ext === 'xls' ||
    ext === 'xlsx'
  ) {
    return <FileSpreadsheet size={24} style={{ color: '#10b981' }} />; // Excel green
  }
  if (
    mimetype === 'application/vnd.ms-powerpoint' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    ext === 'ppt' ||
    ext === 'pptx'
  ) {
    return <Presentation size={24} style={{ color: '#f97316' }} />; // PowerPoint orange
  }
  return <File size={24} style={{ color: '#94a3b8' }} />;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatExpiry(expiresAt: string) {
  const now = new Date();
  const exp = new Date(expiresAt);
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Expired';
  if (diffDays === 1) return 'Expires tomorrow';
  return `Expires in ${diffDays} days`;
}

function TextPreviewer({ url }: { url: string }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load file content');
        return res.text();
      })
      .then((text) => setContent(text))
      .catch((err) => setError(err.message || 'Failed to read file'))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', width: '100%' }}>
        <Loader2 size={24} className="animate-spin text-primary" style={{ margin: '0 auto 0.5rem auto' }} />
        <p style={{ fontSize: '0.85rem' }}>Loading file content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', color: '#f87171', padding: '1.5rem', width: '100%' }}>
        <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem auto' }} />
        <p style={{ fontSize: '0.85rem' }}>{error}</p>
      </div>
    );
  }

  return (
    <pre style={{
      width: '100%',
      maxHeight: '65vh',
      overflow: 'auto',
      padding: '1.25rem',
      background: 'rgba(7, 10, 18, 0.45)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '10px',
      fontFamily: 'Consolas, Monaco, "Courier New", Courier, monospace',
      fontSize: '0.875rem',
      color: '#cbd5e1',
      lineHeight: '1.5',
      textAlign: 'left',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
    }}>
      {content}
    </pre>
  );
}

export default function FileList({ 
  files, 
  onDelete,
  showToast
}: { 
  files: any[], 
  onDelete?: (id: string) => void,
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preview Modal States
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  // Auto-cancel the armed state after 3s
  useEffect(() => {
    if (confirmingId) {
      timeoutRef.current = setTimeout(() => setConfirmingId(null), 3000);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [confirmingId]);

  if (files.length === 0) {
    return <p className="text-center" style={{ color: '#cbd5e1' }}>No files uploaded yet.</p>;
  }

  const handleDeleteClick = async (id: string) => {
    if (confirmingId !== id) {
      // First click — arm the button
      setConfirmingId(id);
      return;
    }
    // Second click — actually delete
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setConfirmingId(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      onDelete?.(id);
      showToast?.('File deleted successfully', 'success');
    } catch (err: any) {
      if (showToast) {
        showToast(err.message || 'Delete failed', 'error');
      } else {
        alert('Error: ' + err.message);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handlePreviewClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setPreviewId(id);
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewData(null);

    fetch(`/api/f/${id}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().catch(() => ({})).then((data) => {
            throw new Error(data.error || 'Failed to load file preview');
          });
        }
        return res.json();
      })
      .then((data) => {
        setPreviewData(data);
      })
      .catch((err) => {
        setPreviewError(err.message || 'Error loading preview');
      })
      .finally(() => {
        setPreviewLoading(false);
      });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {files.map(file => {
        const link = `${window.location.origin}/f/${file.id}`;
        const isConfirming = confirmingId === file.id;
        const isDeleting = deletingId === file.id;

        return (
          <div
            key={file.id}
            className="glass-card"
            style={{
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: isDeleting ? 0.4 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {getFileIcon(file.mimetype, file.originalName)}
              <div>
                <p style={{ fontWeight: 500 }}>{file.originalName}</p>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  {formatBytes(file.size)} • {formatExpiry(file.expiresAt)}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                className="btn"
                style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.1)' }}
                onClick={() => {
                  navigator.clipboard.writeText(link);
                  if (showToast) {
                    showToast('Link copied to clipboard!', 'success');
                  } else {
                    alert('Link copied to clipboard!');
                  }
                }}
                title="Copy Link"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={(e) => handlePreviewClick(e, file.id)}
                className="btn"
                style={{ 
                  padding: '0.5rem', 
                  background: 'rgba(59, 130, 246, 0.12)', 
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa' 
                }}
                title="View File"
              >
                <Eye size={16} />
              </button>
              <button
                className="btn"
                style={{
                  padding: isConfirming ? '0.5rem 0.75rem' : '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: isConfirming
                    ? 'rgba(239,68,68,0.85)'
                    : 'rgba(255,255,255,0.08)',
                  color: isConfirming ? '#fff' : '#94a3b8',
                  border: isConfirming
                    ? '1px solid rgba(239,68,68,0.9)'
                    : '1px solid rgba(255,255,255,0.12)',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontWeight: isConfirming ? 600 : 400,
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => handleDeleteClick(file.id)}
                disabled={isDeleting}
                title={isConfirming ? 'Click again to confirm delete' : 'Delete File'}
              >
                <Trash2 size={15} />
                {isConfirming && <span>Confirm?</span>}
              </button>
            </div>
          </div>
        );
      })}

      {/* Premium Glassmorphic File Preview Modal Overlay */}
      {previewId && (
        <div
          className="animate-fade"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(7, 10, 18, 0.75)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
          }}
          onClick={() => {
            setPreviewId(null);
            setPreviewData(null);
          }}
        >
          <div
            className="animate-modal"
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(25px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.15)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(255, 255, 255, 0.01)',
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                {previewLoading ? 'Loading Preview...' : previewData ? previewData.file.originalName : 'File Preview'}
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {previewData && (
                  <a
                    href={previewData.url}
                    download={previewData.file.originalName}
                    className="btn"
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      border: 'none',
                      color: '#ffffff',
                    }}
                  >
                    <Download size={14} /> Download
                  </a>
                )}
                <button
                  onClick={() => {
                    setPreviewId(null);
                    setPreviewData(null);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '0.4rem',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    e.currentTarget.style.color = '#f87171';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div
              style={{
                flex: 1,
                padding: '1.5rem',
                overflowY: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                background: 'rgba(7, 10, 18, 0.2)',
              }}
            >
              {previewLoading && (
                <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                  <Loader2 size={36} className="animate-spin text-primary" style={{ margin: '0 auto 1rem auto' }} />
                  <p style={{ fontSize: '0.9rem' }}>Fetching secure connection...</p>
                </div>
              )}

              {previewError && (
                <div style={{ textAlign: 'center', color: '#f87171', padding: '1rem' }}>
                  <AlertTriangle size={36} style={{ margin: '0 auto 1rem auto', color: '#f87171' }} />
                  <p style={{ fontWeight: 500 }}>Preview Unsuccessful</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.8 }}>{previewError}</p>
                </div>
              )}

              {previewData && (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {(() => {
                    const mime = previewData.file.mimetype;
                    const ext = previewData.file.originalName.toLowerCase().split('.').pop() || '';
                    const isOfficeDoc = [
                      'application/msword',
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      'application/vnd.ms-excel',
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                      'application/vnd.ms-powerpoint',
                      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                    ].includes(mime) || ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);

                    const isCodeOrText = 
                      mime.startsWith('text/') ||
                      [
                        'application/json',
                        'application/javascript',
                        'application/x-javascript',
                        'application/typescript',
                        'application/xml',
                        'application/x-yaml',
                        'application/x-sh',
                        'application/x-bash',
                        'application/sql',
                      ].includes(mime) ||
                      [
                        'txt', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'md', 'py', 
                        'go', 'java', 'c', 'cpp', 'h', 'hpp', 'sh', 'bash', 'yml', 'yaml', 
                        'xml', 'ini', 'conf', 'sql', 'gitignore', 'env', 'rs', 'swift', 'kt', 
                        'php', 'rb', 'pl', 'cs', 'fs', 'scala', 'dart', 'hs', 'lua', 'r', 'm'
                      ].includes(ext);

                    if (isCodeOrText) {
                      return <TextPreviewer url={previewData.url} />;
                    }

                    if (mime.startsWith('image/')) {
                      return (
                        <img
                          src={previewData.url}
                          alt={previewData.file.originalName}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '65vh',
                            borderRadius: '10px',
                            objectFit: 'contain',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                          }}
                        />
                      );
                    }

                    if (mime.startsWith('video/')) {
                      return (
                        <video
                          controls
                          autoPlay
                          src={previewData.url}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '65vh',
                            borderRadius: '10px',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                          }}
                        />
                      );
                    }

                    if (mime.startsWith('audio/')) {
                      return (
                        <div style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#cbd5e1', textAlign: 'center' }}>Playing audio track</p>
                          <audio controls autoPlay src={previewData.url} style={{ width: '100%' }} />
                        </div>
                      );
                    }

                    if (mime === 'application/pdf' || ext === 'pdf') {
                      return (
                        <iframe
                          src={previewData.url}
                          style={{
                            width: '100%',
                            height: '65vh',
                            border: 'none',
                            borderRadius: '10px',
                          }}
                        />
                      );
                    }

                    if (isOfficeDoc) {
                      return (
                        <iframe
                          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewData.url)}`}
                          style={{
                            width: '100%',
                            height: '65vh',
                            border: 'none',
                            borderRadius: '10px',
                            background: '#ffffff',
                          }}
                          title="Office Preview"
                        />
                      );
                    }

                    // Fallback
                    return (
                      <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '400px' }}>
                        {getFileIcon(previewData.file.mimetype, previewData.file.originalName)}
                        <h4 style={{ fontWeight: 600, color: '#f8fafc', marginTop: '1rem', marginBottom: '0.25rem' }}>
                          Preview Unavailable
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                          This file type ({previewData.file.mimetype || 'unknown'}) cannot be viewed inline. Please download it to your local machine.
                        </p>
                        <a
                          href={previewData.url}
                          download={previewData.file.originalName}
                          className="btn"
                          style={{
                            padding: '0.6rem 1.2rem',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#cbd5e1',
                          }}
                        >
                          Download {formatBytes(previewData.file.size)}
                        </a>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

