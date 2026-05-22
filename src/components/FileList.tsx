'use client';

import { useState, useEffect, useRef } from 'react';
import { File, Image as ImageIcon, FileText, Video, Music, Copy, Eye, Trash2 } from 'lucide-react';

function getFileIcon(mimetype: string) {
  if (mimetype.startsWith('image/')) return <ImageIcon size={24} className="text-primary" />;
  if (mimetype === 'application/pdf') return <FileText size={24} className="text-primary" />;
  if (mimetype.startsWith('video/')) return <Video size={24} className="text-primary" />;
  if (mimetype.startsWith('audio/')) return <Music size={24} className="text-primary" />;
  return <File size={24} className="text-primary" />;
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

export default function FileList({ files, onDelete }: { files: any[], onDelete?: (id: string) => void }) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setDeletingId(null);
    }
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
              {getFileIcon(file.mimetype)}
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
                  alert('Link copied to clipboard!');
                }}
                title="Copy Link"
              >
                <Copy size={16} />
              </button>
              <a
                href={`/f/${file.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ padding: '0.5rem' }}
                title="View File"
              >
                <Eye size={16} />
              </a>
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
    </div>
  );
}

