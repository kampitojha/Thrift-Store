'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient, ApiError } from '@/lib/api';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/auth/forgot-password', { email }, { token: null });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-lift text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-700" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Check your email</h1>
        <p className="mt-2 text-sm text-ink-500">
          If an account exists for <strong className="text-ink-700">{email}</strong>, we&apos;ve sent password reset instructions.
        </p>
        <p className="mt-6 text-sm text-ink-500">
          <Link href="/sign-in" className="font-medium text-brand-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-lift">
      <div className="mb-8">
        <Link href="/sign-in" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-700">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Forgot password?</h1>
      <p className="mt-1 text-sm text-ink-500">No worries. Enter your email and we&apos;ll send you reset instructions.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">Email</label>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </div>
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <Button type="submit" variant="brand" className="w-full" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">Sending<Mail className="h-4 w-4 animate-pulse" /></span>
          ) : (
            <span className="flex items-center gap-2">Send reset link<Mail className="h-4 w-4" /></span>
          )}
        </Button>
      </form>
    </div>
  );
}
