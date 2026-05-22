'use client';

import { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FolderOpen, FileUp } from 'lucide-react';

interface UploadProgress {
  current: number;
  total: number;
  filename: string;
}

export default function Uploader({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (filesList: File[]) => {
    if (filesList.length === 0) return;
    setUploading(true);
    
    try {
      for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i];
        const originalName = file.webkitRelativePath || file.name;
        
        setUploadProgress({
          current: i + 1,
          total: filesList.length,
          filename: originalName
        });

        // 1. Get presigned URL
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: originalName, size: file.size, type: file.type }),
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Could not get upload url for ${originalName}`);
        }
        const { uploadUrl } = await res.json();

        // 2. Upload directly to R2
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload of ${originalName} to storage failed.`);
        }
      }

      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert('Upload failed: ' + message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      // Reset inputs so the same files/folders can be selected/uploaded again
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  }, [onUploadComplete]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    uploadFiles(acceptedFiles);
  }, [uploadFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true, // Handle clicks manually to allow separate file and folder selection triggers
  });

  return (
    <>
      {/* Hidden inputs to trigger selection manually, placed outside dropzone div to prevent programmatic click event bubbling */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files) {
            uploadFiles(Array.from(e.target.files));
          }
        }}
        style={{ display: 'none' }}
      />
      
      <input
        type="file"
        ref={folderInputRef}
        onChange={(e) => {
          if (e.target.files) {
            uploadFiles(Array.from(e.target.files));
          }
        }}
        style={{ display: 'none' }}
        {...({ webkitdirectory: '', directory: '', multiple: true } as React.InputHTMLAttributes<HTMLInputElement>)}
      />

      <div 
        {...getRootProps()} 
        className="glass-card" 
        style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          borderStyle: 'dashed', 
          borderWidth: '2px',
          borderColor: isDragActive ? 'var(--primary-color)' : 'var(--glass-border)',
          cursor: 'default',
          transition: 'all 0.2s',
          marginBottom: '2rem'
        }}
      >
        <input {...getInputProps()} />
        
        <UploadCloud size={48} className="text-primary mb-4" style={{ margin: '0 auto' }} />
        
        {uploading && uploadProgress ? (
          <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '1.1rem', textAlign: 'center' }}>
              Uploading {uploadProgress.current} of {uploadProgress.total} files...
            </p>
            <p style={{ 
              fontSize: '0.85rem', 
              color: '#94a3b8', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap', 
              margin: '0 0 1rem 0',
              textAlign: 'center'
            }}>
              {uploadProgress.filename}
            </p>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              background: 'rgba(255,255,255,0.08)', 
              borderRadius: '4px', 
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ 
                width: `${(uploadProgress.current / uploadProgress.total) * 100}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, var(--primary-color) 0%, #a855f7 100%)', 
                transition: 'width 0.3s ease-out',
                borderRadius: '4px'
              }}></div>
            </div>
          </div>
        ) : isDragActive ? (
          <p style={{ fontWeight: 500, fontSize: '1.1rem' }}>Drop files/folders here ...</p>
        ) : (
          <div>
            <p style={{ fontWeight: 500, fontSize: '1.1rem', marginBottom: '1.25rem' }}>
              Drag & drop files or folders here
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="btn"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontWeight: 500, 
                  cursor: 'pointer',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                  fontSize: '0.9rem'
                }}
              >
                <FileUp size={16} /> Select Files
              </button>
              
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
                className="btn"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontWeight: 500, 
                  cursor: 'pointer',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                  fontSize: '0.9rem'
                }}
              >
                <FolderOpen size={16} /> Select Folder
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
