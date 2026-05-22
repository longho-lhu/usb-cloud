'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [defaultExpirationDays, setDefaultExpirationDays] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.status === 401) {
          router.push('/login');
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        if (data.user) {
          setDefaultExpirationDays(data.user.defaultExpirationDays);
        }
        setLoading(false);
      })
      .catch(() => {});
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultExpirationDays }),
      });
      if (res.ok) {
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch {
      setMessage('An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div className="auth-container">
      <div className="glass-card auth-card">
        <h1 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>User Settings</h1>
        <form onSubmit={handleSave}>
          <div className="input-group">
            <label htmlFor="expiration">Default File Expiration</label>
            <select
              id="expiration"
              className="input"
              value={defaultExpirationDays}
              onChange={(e) => setDefaultExpirationDays(Number(e.target.value))}
            >
              <option value={1}>24 Hours (1 Day)</option>
              <option value={3}>72 Hours (3 Days)</option>
              <option value={7}>1 Week (7 Days)</option>
            </select>
            <p className="text-sm" style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
              Files uploaded will be automatically deleted after this time. (You also need to configure R2 Lifecycle rules).
            </p>
          </div>
          {message && <p className={message.includes('success') ? 'success-msg mb-4' : 'error-msg mb-4'}>{message}</p>}
          <button type="submit" className="btn" style={{ width: '100%' }} disabled={saving}>
            <Save size={20} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
