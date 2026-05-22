'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, HardDrive, Users, CheckCircle, XCircle, ArrowLeft, Edit, Layers } from 'lucide-react';

interface UserData {
  id: string;
  username: string;
  role: string;
  storageLimit: number;
  planName: string;
  storageUsed: number;
  createdAt: string;
}

const PREDEFINED_PLANS = [
  { name: 'Free', limit: 1 * 1024 * 1024 * 1024, label: 'Free Plan (1 GB)' },
  { name: 'Basic', limit: 5 * 1024 * 1024 * 1024, label: 'Basic Plan (5 GB)' },
  { name: 'Premium', limit: 20 * 1024 * 1024 * 1024, label: 'Premium Plan (20 GB)' },
  { name: 'Custom', limit: 0, label: 'Custom Plan...' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('Free');
  const [customAmount, setCustomAmount] = useState('1');
  const [customUnit, setCustomUnit] = useState('GB'); // 'MB' or 'GB'
  const [selectedRole, setSelectedRole] = useState('user');
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsersAndMe = async () => {
    try {
      // 1. Fetch current user role first to verify admin privileges
      const meRes = await fetch('/api/auth/me');
      if (meRes.status === 401) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      if (!meData.user || meData.user.role !== 'admin') {
        alert('Access denied. Administrators only.');
        router.push('/');
        return;
      }
      setCurrentUser(meData.user);

      // 2. Fetch all users
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        throw new Error('Could not fetch user registry');
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error(error);
      alert('Unauthorized access or system error occurred.');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndMe();
  }, []);

  const handleOpenEdit = (user: UserData) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setErrorMsg('');
    setSuccessMsg('');

    // Pre-populate plan selection
    const isPredefined = PREDEFINED_PLANS.some(
      (p) => p.name === user.planName && p.limit === user.storageLimit
    );

    if (isPredefined) {
      setSelectedPlan(user.planName);
    } else {
      setSelectedPlan('Custom');
      // Convert bytes back to readable unit for the input
      if (user.storageLimit >= 1024 * 1024 * 1024) {
        setCustomAmount((user.storageLimit / (1024 * 1024 * 1024)).toFixed(1));
        setCustomUnit('GB');
      } else {
        setCustomAmount((user.storageLimit / (1024 * 1024)).toFixed(0));
        setCustomUnit('MB');
      }
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUpdating(true);
    setErrorMsg('');
    setSuccessMsg('');

    let limitBytes = 0;
    let planName = selectedPlan;

    if (selectedPlan === 'Custom') {
      const amount = parseFloat(customAmount);
      if (isNaN(amount) || amount <= 0) {
        setErrorMsg('Please enter a valid custom storage amount.');
        setUpdating(false);
        return;
      }
      limitBytes = amount * (customUnit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024);
      planName = 'Custom';
    } else {
      const plan = PREDEFINED_PLANS.find((p) => p.name === selectedPlan);
      limitBytes = plan ? plan.limit : 1 * 1024 * 1024 * 1024;
    }

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName,
          storageLimit: limitBytes,
          role: selectedRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user limits');
      }

      setSuccessMsg('Account configuration updated successfully.');
      setTimeout(() => {
        setEditingUser(null);
        fetchUsersAndMe();
      }, 1000);
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setUpdating(false);
    }
  };

  // Helper: Format bytes to human readable sizes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filtered User Registry
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics Aggregates
  const totalUsersCount = users.length;
  const totalCloudSpaceLimit = users.reduce((acc, curr) => acc + curr.storageLimit, 0);
  const totalCloudSpaceUsed = users.reduce((acc, curr) => acc + curr.storageUsed, 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', fontSize: '1.2rem' }}>
        Authenticating administrator session...
      </div>
    );
  }

  return (
    <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', width: '100%' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
            <ArrowLeft size={14} /> Back to Files
          </Link>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Account Management
          </h1>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.12)', padding: '0.85rem', borderRadius: '12px', color: '#3b82f6' }}>
            <Users size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Accounts</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{totalUsersCount}</p>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(168, 85, 247, 0.12)', padding: '0.85rem', borderRadius: '12px', color: '#a855f7' }}>
            <HardDrive size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Storage Allocated</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{formatBytes(totalCloudSpaceLimit)}</p>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '0.85rem', borderRadius: '12px', color: '#10b981' }}>
            <HardDrive size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Space Used</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
              {formatBytes(totalCloudSpaceUsed)} <span style={{ fontSize: '0.95rem', fontWeight: 450, color: '#94a3b8' }}>
                ({totalCloudSpaceLimit > 0 ? ((totalCloudSpaceUsed / totalCloudSpaceLimit) * 100).toFixed(1) : 0}%)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Registry section */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Registered Users</h2>
          <input
            type="text"
            className="input"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', maxWidth: '300px', fontSize: '0.9rem', padding: '0.5rem 1rem' }}
          />
        </div>

        {filteredUsers.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No accounts matched your search queries.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '1rem 0.75rem', color: '#94a3b8', fontWeight: 500, fontSize: '0.9rem' }}>Username</th>
                  <th style={{ padding: '1rem 0.75rem', color: '#94a3b8', fontWeight: 500, fontSize: '0.9rem' }}>Role</th>
                  <th style={{ padding: '1rem 0.75rem', color: '#94a3b8', fontWeight: 500, fontSize: '0.9rem' }}>Plan</th>
                  <th style={{ padding: '1rem 0.75rem', color: '#94a3b8', fontWeight: 500, fontSize: '0.9rem', width: '280px' }}>Cloud Usage</th>
                  <th style={{ padding: '1rem 0.75rem', color: '#94a3b8', fontWeight: 500, fontSize: '0.9rem' }}>Joined Date</th>
                  <th style={{ padding: '1rem 0.75rem', color: '#94a3b8', fontWeight: 500, fontSize: '0.9rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const usagePercentage = Math.min((user.storageUsed / user.storageLimit) * 100, 100);
                  // Progress color based on usage percentage
                  const progressColor = usagePercentage > 90 
                    ? '#ef4444' // red
                    : usagePercentage > 70 
                      ? '#f59e0b' // yellow
                      : 'var(--primary-color)'; // blue

                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1.25rem 0.75rem', fontWeight: 500 }}>{user.username}</td>
                      <td style={{ padding: '1.25rem 0.75rem' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '6px', 
                          background: user.role === 'admin' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.05)',
                          color: user.role === 'admin' ? '#c084fc' : '#cbd5e1',
                          border: user.role === 'admin' ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                          fontWeight: 600
                        }}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 0.75rem' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '6px', 
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          fontWeight: 500
                        }}>
                          {user.planName}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 0.75rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
                            <span>{formatBytes(user.storageUsed)}</span>
                            <span>{formatBytes(user.storageLimit)}</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${usagePercentage}%`, height: '100%', background: progressColor, borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1.25rem 0.75rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleOpenEdit(user)}
                          className="btn" 
                          style={{ 
                            padding: '0.4rem 0.8rem', 
                            fontSize: '0.8rem', 
                            background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            gap: '0.3rem'
                          }}
                        >
                          <Edit size={12} /> Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Modal Dialog Overlay */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-card" style={{ 
            width: '100%', 
            maxWidth: '500px', 
            padding: '2.25rem', 
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)',
            position: 'relative'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} className="text-primary" /> Manage Account Quota
            </h3>
            
            <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Modify storage quotas, plan bundles, and permission levels for user <strong style={{ color: '#fff' }}>{editingUser.username}</strong>.
            </p>

            <form onSubmit={handleSavePlan}>
              {/* Plan dropdown selection */}
              <div className="input-group">
                <label>Storage Bundle / Plan</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="input"
                  style={{ background: 'rgba(15, 23, 42, 0.95)', cursor: 'pointer' }}
                >
                  {PREDEFINED_PLANS.map((plan) => (
                    <option key={plan.name} value={plan.name} style={{ background: '#0f172a' }}>
                      {plan.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Storage Limit Inputs */}
              {selectedPlan === 'Custom' && (
                <div className="input-group" style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px dashed rgba(255,255,255,0.1)', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  marginBottom: '1.25rem'
                }}>
                  <label>Custom Storage Capacity</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      className="input"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Amount"
                      style={{ flex: 1 }}
                      required
                    />
                    <select
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      className="input"
                      style={{ width: '100px', cursor: 'pointer', background: 'rgba(15, 23, 42, 0.95)' }}
                    >
                      <option value="MB" style={{ background: '#0f172a' }}>MB</option>
                      <option value="GB" style={{ background: '#0f172a' }}>GB</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Role Selection */}
              <div className="input-group" style={{ marginBottom: '2rem' }}>
                <label>Permission Level / Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="input"
                  style={{ background: 'rgba(15, 23, 42, 0.95)', cursor: 'pointer' }}
                >
                  <option value="user" style={{ background: '#0f172a' }}>User (Standard access)</option>
                  <option value="admin" style={{ background: '#0f172a' }}>Admin (Full workspace control)</option>
                </select>
              </div>

              {/* Feedback messages */}
              {errorMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  <XCircle size={14} /> {errorMsg}
                </div>
              )}
              {successMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success-color)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  <CheckCircle size={14} /> {successMsg}
                </div>
              )}

              {/* Bottom control actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setEditingUser(null)}
                  disabled={updating}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={updating}
                  style={{ minWidth: '120px' }}
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
