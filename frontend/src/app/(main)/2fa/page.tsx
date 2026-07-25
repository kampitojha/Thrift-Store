'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient, ApiError } from '@/lib/api';
import { Shield, ShieldCheck, Loader2, Copy, CheckCircle2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function TwoFactorPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [secret, setSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    checkStatus();
  }, [user, router]);

  const checkStatus = async () => {
    try {
      const data = await apiClient.get<{ enabled: boolean }>('/auth/2fa/status');
      setEnabled(data.enabled);
    } catch {
      // not configured yet
    } finally {
      setLoading(false);
    }
  };

  const startSetup = async () => {
    setError(null);
    try {
      const data = await apiClient.post<{ secret: string; qrCodeUrl: string }>('/auth/2fa/setup');
      setSecret(data.secret);
      setQrUrl(data.qrCodeUrl);
      setSetupMode(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to start setup');
    }
  };

  const verifyAndEnable = async () => {
    if (code.length !== 6) { setError('Enter a 6-digit code'); return; }
    setVerifying(true);
    setError(null);
    try {
      const data = await apiClient.post<{ backupCodes: string[] }>('/auth/2fa/verify', { code, secret });
      setBackupCodes(data.backupCodes);
      setEnabled(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Invalid code');
    } finally {
      setVerifying(false);
    }
  };

  const disable2fa = async () => {
    setError(null);
    try {
      await apiClient.post('/auth/2fa/disable', { code });
      setEnabled(false);
      setSetupMode(false);
      setBackupCodes([]);
      setSecret('');
      setQrUrl('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to disable');
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700 mb-4">
          <ChevronLeft className="h-4 w-4" />Back to Settings
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Two-factor authentication</h1>
        <p className="mt-1 text-sm text-ink-500">Add an extra layer of security to your account.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink-400" /></div>
      ) : !setupMode && !enabled ? (
        <div className="rounded-2xl border border-ink-100 bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink-100">
              <Shield className="h-6 w-6 text-ink-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-ink-900">Protect your account</h2>
              <p className="mt-1 text-sm text-ink-500">
                Two-factor authentication adds an extra layer of security. You&apos;ll need a code from your authenticator app in addition to your password.
              </p>
              <Button variant="brand" className="mt-4" onClick={startSetup}>
                Enable 2FA
              </Button>
            </div>
          </div>
        </div>
      ) : setupMode && !enabled ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-ink-100 bg-white p-6">
            <h2 className="font-semibold text-ink-900">Scan this QR code</h2>
            <p className="mt-1 text-sm text-ink-500">Use your authenticator app (Google Authenticator, Authy, etc.) to scan the QR code.</p>
            {qrUrl && (
              <div className="my-4 flex justify-center">
                <img src={qrUrl} alt="2FA QR Code" className="h-48 w-48 rounded-xl border" />
              </div>
            )}
            <div className="rounded-xl bg-ink-50 p-3">
              <p className="text-xs font-medium text-ink-500">Or enter this key manually:</p>
              <p className="mt-1 font-mono text-sm text-ink-900">{secret}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-6">
            <h2 className="font-semibold text-ink-900">Verify setup</h2>
            <p className="mt-1 text-sm text-ink-500">Enter the 6-digit code from your authenticator app.</p>
            <div className="mt-4 flex gap-3">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-32 text-center text-lg font-mono tracking-widest"
              />
              <Button variant="brand" onClick={verifyAndEnable} disabled={verifying || code.length !== 6}>
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & enable'}
              </Button>
            </div>
          </div>
        </div>
      ) : backupCodes.length > 0 ? (
        <div className="rounded-2xl border border-ink-100 bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <ShieldCheck className="h-6 w-6 text-emerald-700" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-ink-900">Backup codes</h2>
              <p className="mt-1 text-sm text-ink-500">
                Save these backup codes in a safe place. You can use each code once if you lose access to your authenticator app.
              </p>
              <div className="my-4 rounded-xl bg-ink-50 p-4">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((code, i) => (
                    <span key={i}>{code}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyBackupCodes}>
                  {copied ? <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy codes'}
                </Button>
                <Link href="/settings">
                  <Button variant="brand" size="sm">Done</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-ink-100 bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <ShieldCheck className="h-6 w-6 text-emerald-700" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-ink-900">2FA is enabled</h2>
              <p className="mt-1 text-sm text-ink-500">Your account is protected with two-factor authentication.</p>
              <div className="mt-4 flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter code to disable"
                  maxLength={6}
                  className="w-32 text-center text-sm font-mono tracking-widest"
                />
                <Button variant="destructive" size="sm" onClick={disable2fa} disabled={code.length !== 6}>
                  Disable 2FA
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
