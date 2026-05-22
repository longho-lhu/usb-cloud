'use client';

import { useEffect, useState } from 'react';
import Uploader from '@/components/Uploader';
import FileList from '@/components/FileList';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings } from 'lucide-react';

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

      <Uploader onUploadComplete={fetchFiles} />
      
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Uploaded Files</h2>
      <FileList files={files} onDelete={(id) => setFiles(prev => prev.filter((f: any) => f.id !== id))} />

    </main>
  );
}
