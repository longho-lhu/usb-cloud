'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="auth-container">
      <div className="glass-card auth-card text-center">
        <ShieldAlert size={48} className="text-primary mb-4" style={{ margin: '0 auto' }} />
        <h1 className="auth-title" style={{ marginBottom: '1rem' }}>Forgot Password?</h1>
        <p className="mb-8" style={{ color: '#cbd5e1' }}>
          For security reasons, password resets are handled manually by the system administrator. 
          Please contact the admin to verify your identity and reset your password.
        </p>
        <Link href="/login" className="btn" style={{ width: '100%' }}>
          Back to Login
        </Link>
      </div>
    </div>
  );
}
