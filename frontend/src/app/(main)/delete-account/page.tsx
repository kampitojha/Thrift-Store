'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient, ApiError } from '@/lib/api';
import { AlertTriangle, Loader2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function DeleteAccountPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'confirm' | 'reason' | 'done'>('confirm');

  if (!user) {
    router.push('/sign-in');
    return null;
  }

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.delete('/users/me/account', { body: { reason: reason || undefined } });
      await logout();
      setStep('done');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="container-page py-10 max-w-lg mx-auto">
        <div className="rounded-3xl border border-ink-100 bg-white p-8 shadow-lift text-center">
          <h1 className="font-display text-2xl font-semibold text-ink-900">Account deleted</h1>
          <p className="mt-2 text-sm text-ink-500">We&apos;re sorry to see you go. Your account has been permanently deleted.</p>
          <Link href="/"><Button variant="brand" className="mt-6">Back to home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 max-w-lg mx-auto">
      <div className="mb-8">
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700 mb-4">
          <ChevronLeft className="h-4 w-4" />Back to Settings
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Delete account</h1>
        <p className="mt-1 text-sm text-ink-500">Permanently delete your account and all associated data.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>
      )}

      <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-700" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-red-900">What happens when you delete your account?</h2>
            <ul className="mt-2 space-y-1 text-sm text-red-800">
              <li>• Your profile and listings will be permanently removed</li>
              <li>• Active orders will be cancelled</li>
              <li>• Your username will become available to others</li>
              <li>This action cannot be undone.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-ink-100 bg-white p-6">
        <label className="mb-1.5 block text-xs font-medium text-ink-600">
          Type <strong className="text-red-700">DELETE</strong> to confirm
        </label>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE"
          className="mb-4"
        />
        <label className="mb-1.5 block text-xs font-medium text-ink-600">
          Reason for leaving <span className="text-ink-400">(optional)</span>
        </label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Help us improve…"
          className="mb-6"
        />
        <Button
          variant="destructive"
          className="w-full"
          disabled={confirmText !== 'DELETE' || loading}
          onClick={handleDelete}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Delete my account permanently
        </Button>
      </div>
    </div>
  );
}
