'use client';

import { useEffect, useState, useRef } from 'react';
import Uploader from '@/components/Uploader';
import FileList from '@/components/FileList';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setFiles(data.files);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Your Files</h1>
        <Link href="/settings" className="btn" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <Settings size={20} /> Settings
        </Link>
      </div>

      <Uploader onUploadComplete={fetchFiles} showToast={showToast} />
      
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Uploaded Files</h2>
      <FileList 
        files={files} 
        onDelete={(id) => setFiles(prev => prev.filter((f: any) => f.id !== id))} 
        showToast={showToast}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className="animate-toast"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${
              toast.type === 'success'
                ? 'rgba(16, 185, 129, 0.3)'
                : toast.type === 'error'
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(59, 130, 246, 0.3)'
            }`,
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.4), 0 0 15px rgba(59, 130, 246, 0.08)',
            color: '#f8fafc',
            maxWidth: '380px',
          }}
        >
          {toast.type === 'success' && <CheckCircle size={20} style={{ color: '#10b981', flexShrink: 0 }} />}
          {toast.type === 'error' && <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />}
          {toast.type === 'info' && <Info size={20} style={{ color: '#3b82f6', flexShrink: 0 }} />}
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              marginLeft: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.2rem',
              borderRadius: '4px',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </main>
  );
}
