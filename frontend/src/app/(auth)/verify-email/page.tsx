'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/api';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }
    apiClient.post('/auth/verify-email', { token }, { token: null })
      .then(() => {
        setStatus('success');
        setMessage('Email verified successfully!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err instanceof ApiError ? err.message : 'Verification failed');
      });
  }, [token]);

  const handleResend = async () => {
    const email = searchParams.get('email');
    if (!email) { setMessage('Email parameter missing'); return; }
    setResending(true);
    try {
      await apiClient.post('/auth/resend-verification', { email }, { token: null });
      setResendSent(true);
    } catch {
      setMessage('Failed to resend. Try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-lift text-center">
      {status === 'verifying' && (
        <>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-600" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900">Verifying your email…</h1>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-7 w-7 text-emerald-700" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Email verified!</h1>
          <p className="mt-2 text-sm text-ink-500">{message}</p>
          <Link href="/"><Button variant="brand" className="mt-6 w-full">Continue to Thrift Store</Button></Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-7 w-7 text-red-700" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Verification failed</h1>
          <p className="mt-2 text-sm text-ink-500">{message}</p>
          <div className="mt-6 space-y-2">
            {!resendSent ? (
              <Button variant="outline" className="w-full" onClick={handleResend} disabled={resending}>
                {resending ? 'Sending…' : 'Resend verification email'}
              </Button>
            ) : (
              <p className="text-sm text-emerald-700">Verification email sent!</p>
            )}
            <Link href="/sign-in"><Button variant="brand" className="w-full">Go to sign in</Button></Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-lift text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-600" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
