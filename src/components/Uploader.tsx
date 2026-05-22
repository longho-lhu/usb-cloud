'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';

export default function Uploader({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    setUploading(true);
    try {
      // 1. Get presigned URL
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, size: file.size, type: file.type }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Could not get upload url');
      }
      const { uploadUrl, fileId } = await res.json();

      // 2. Upload directly to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadRes.ok) throw new Error('Upload to storage failed. This might be a CORS issue. Please configure CORS on your R2 bucket.');

      // 3. Confirm upload (not needed since DB record is created in step 1)
      onUploadComplete();
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div 
      {...getRootProps()} 
      className="glass-card" 
      style={{ 
        textAlign: 'center', 
        padding: '3rem', 
        borderStyle: 'dashed', 
        borderWidth: '2px',
        borderColor: isDragActive ? 'var(--primary-color)' : 'var(--glass-border)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginBottom: '2rem'
      }}
    >
      <input {...getInputProps()} />
      <UploadCloud size={48} className="text-primary mb-4" style={{ margin: '0 auto' }} />
      {uploading ? (
        <p>Uploading...</p>
      ) : isDragActive ? (
        <p>Drop the file here ...</p>
      ) : (
        <p>Drag & drop a file here, or click to select file</p>
      )}
    </div>
  );
}
