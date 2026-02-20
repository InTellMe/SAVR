'use client';

import { useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<ReactNode>('');
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  async function redirectBasedOnSubscription() {
    // Redirect to pricing page for new signups
    // AuthContext will handle user data fetching via Supabase
    router.push('/pricing');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signUp(email, password);
      
      // User record is automatically created in Supabase via database trigger
      // with default subscription_tier='basic' and subscription_status='pending'
      await redirectBasedOnSubscription();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      if (message.includes('auth/email-already-in-use')) {
        setError(
          <span>
            An account with this email already exists. You may have previously signed up with Google.{' '}
            <Link href="/sign-in" className="underline text-[#00d4ff]">Sign in instead</Link>
          </span>
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      
      // User record is automatically created in Supabase via database trigger
      // AuthContext will handle fetching user data and redirect happens in auth callback
      router.push('/pricing');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign up with Google';
      if (message.includes('auth/popup-closed-by-user')) {
        setError('Sign-up cancelled. Please try again.');
      } else if (message.includes('auth/account-exists-with-different-credential') || message.includes('auth/credential-already-in-use')) {
        setError(
          <span>
            An account with this email already exists using email and password.{' '}
            <Link href="/sign-in" className="underline text-[#00d4ff]">Sign in with your password</Link>, then link your Google account in Settings.
          </span>
        );
      } else if (message.includes('auth/email-already-in-use')) {
        setError(
          <span>
            This email is already registered.{' '}
            <Link href="/sign-in" className="underline text-[#00d4ff]">Sign in instead</Link>
          </span>
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { background: 'rgba(6, 9, 24, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)' };

  const EyeIcon = ({ show }: { show: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      {show ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  );

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />
      <div className="flex items-center justify-center pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 p-8 rounded-2xl" style={{ background: 'rgba(10, 10, 10, 0.7)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div>
            <h2 className="text-center text-3xl font-bold text-white">
              Create your account
            </h2>
            <p className="mt-2 text-center text-sm" style={{ color: '#9ca3c2' }}>
              Start your 5-day free trial. Or{' '}
              <Link href="/sign-in" className="font-medium text-[#00d4ff] hover:text-[#00bfa6] transition-colors">
                sign in to existing account
              </Link>
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
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
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(0, 212, 255, 0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#9ca3c2] mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-xl text-white placeholder-[#6b7294] outline-none transition-all duration-200"
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(0, 212, 255, 0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7294] hover:text-[#9ca3c2] transition-colors"
                    tabIndex={-1}
                  >
                    <EyeIcon show={showPassword} />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#9ca3c2] mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-xl text-white placeholder-[#6b7294] outline-none transition-all duration-200"
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(0, 212, 255, 0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7294] hover:text-[#9ca3c2] transition-colors"
                    tabIndex={-1}
                  >
                    <EyeIcon show={showConfirmPassword} />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Sign up'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 text-[#6b7294]" style={{ background: 'rgba(13, 17, 41, 0.7)' }}>Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign up with Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
