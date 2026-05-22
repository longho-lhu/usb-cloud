'use client';

import { useEffect, useState, use } from 'react';
import { Download, AlertCircle } from 'lucide-react';

export default function FileViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [fileData, setFileData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/f/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setFileData(data);
        }
      })
      .catch(() => setError('Error loading file'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading file...</div>;

  if (error) {
    return (
      <div className="auth-container">
        <div className="glass-card auth-card text-center">
          <AlertCircle size={48} className="text-danger mb-4" style={{ margin: '0 auto', color: 'var(--danger-color)' }} />
          <h1 className="auth-title">File Not Found</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const { file, url } = fileData;

  const renderPreview = () => {
    if (file.mimetype.startsWith('image/')) {
      return <img src={url} alt={file.originalName} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px' }} />;
    }
    if (file.mimetype.startsWith('video/')) {
      return <video controls src={url} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px' }} />;
    }
    if (file.mimetype.startsWith('audio/')) {
      return <audio controls src={url} style={{ width: '100%', marginTop: '2rem' }} />;
    }
    if (file.mimetype === 'application/pdf') {
      return <iframe src={url} style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px' }} />;
    }
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
        <p>No preview available for this file type.</p>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', width: '100%' }}>
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', wordBreak: 'break-all' }}>{file.originalName}</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              Size: {Math.round(file.size / 1024)} KB • Expires: {new Date(file.expiresAt).toLocaleDateString()}
            </p>
          </div>
          <a href={url} download={file.originalName} target="_blank" rel="noopener noreferrer" className="btn">
            <Download size={20} /> Download
          </a>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
