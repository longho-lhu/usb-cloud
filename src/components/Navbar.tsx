'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '1rem 2rem',
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--glass-border)',
      alignItems: 'center',
    }}>
      <Link href="/" style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <UploadCloud className="text-primary" /> USB Online
      </Link>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {user ? (
          <>
            <span style={{ color: '#cbd5e1' }}>Hi, {user.username}</span>
            <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              <LogOut size={16} /> Logout
            </button>
          </>
        ) : (
          <Link href="/login" className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            <User size={16} /> Login
          </Link>
        )}
      </div>
    </nav>
  );
}
