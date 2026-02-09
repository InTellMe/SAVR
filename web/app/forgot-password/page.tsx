'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      if (message.includes('auth/user-not-found')) {
        // Don't reveal whether the email exists — show success anyway for security
        setSuccess(true);
      } else if (message.includes('auth/too-many-requests')) {
        setError('Too many requests. Please wait a few minutes and try again.');
      } else if (message.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />
      <div className="flex items-center justify-center pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 p-8 rounded-2xl" style={{ background: 'rgba(10, 10, 10, 0.7)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div>
            <h2 className="text-center text-3xl font-bold text-white">
              Reset your password
            </h2>
            <p className="mt-2 text-center text-sm" style={{ color: '#9ca3c2' }}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-6">
              <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.2)', color: '#00d4ff' }}>
                If an account exists with that email, you&apos;ll receive a password reset link shortly. Check your inbox and spam folder.
              </div>
              <Link
                href="/sign-in"
                className="btn-primary w-full flex justify-center text-sm"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#9ca3c2] mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-[#6b7294] outline-none transition-all duration-200"
                  style={{ background: 'rgba(6, 9, 24, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(0, 212, 255, 0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </div>

              <div className="text-center">
                <Link href="/sign-in" className="text-sm font-medium text-[#00d4ff] hover:text-[#00bfa6] transition-colors">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
