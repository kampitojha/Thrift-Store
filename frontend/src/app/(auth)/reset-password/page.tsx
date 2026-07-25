'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient, ApiError } from '@/lib/api';
import { Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-lift text-center">
        <h1 className="font-display text-2xl font-semibold text-ink-900">Invalid link</h1>
        <p className="mt-2 text-sm text-ink-500">This password reset link is missing or invalid.</p>
        <p className="mt-6 text-sm">
          <Link href="/forgot-password" className="font-medium text-brand-700 hover:underline">
            Request a new reset link
          </Link>
        </p>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password }, { token: null });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-lift text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-700" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Password reset!</h1>
        <p className="mt-2 text-sm text-ink-500">Your password has been updated successfully.</p>
        <Link href="/sign-in">
          <Button variant="brand" className="mt-6 w-full">Sign in with new password</Button>
        </Link>
      </div>
    );
  }

  const strengthChecks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /\d/.test(password) },
  ];
  const strength = strengthChecks.filter((c) => c.met).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength] || '';
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'][strength] || '';

  return (
    <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-lift">
      <h1 className="font-display text-2xl font-semibold text-ink-900">Set new password</h1>
      <p className="mt-1 text-sm text-ink-500">Choose a strong password for your account.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">New password</label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 chars, upper, lower, number"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : 'bg-ink-200'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-ink-500">Strength: {strengthLabel}</p>
              <ul className="space-y-0.5">
                {strengthChecks.map((check) => (
                  <li
                    key={check.label}
                    className={`flex items-center gap-1.5 text-xs ${check.met ? 'text-emerald-700' : 'text-ink-400'}`}
                  >
                    <span className={`${check.met ? 'text-emerald-500' : 'text-ink-300'}`}>
                      {check.met ? '✓' : '○'}
                    </span>
                    {check.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">Confirm password</label>
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
          )}
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <Button type="submit" variant="brand" className="w-full" disabled={loading}>
          {loading ? 'Resetting…' : (
            <span className="flex items-center gap-2"><Lock className="h-4 w-4" />Reset password</span>
          )}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-lift text-center"><p className="text-ink-500">Loading…</p></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
