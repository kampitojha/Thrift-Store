'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient, ApiError } from '@/lib/api';
import { Smartphone, Monitor, Globe, Laptop, LogOut, Shield, Loader2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

type Session = {
  id: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
  isCurrent: boolean;
  createdAt: string;
  lastUsedAt: string;
};

export default function SessionsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [logginOutAll, setLogginOutAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchSessions();
  }, [user, router]);

  const fetchSessions = async () => {
    try {
      const data = await apiClient.get<{ data: Session[] }>('/auth/sessions');
      setSessions(data.data || data as unknown as Session[]);
    } catch {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    setError(null);
    try {
      await apiClient.post(`/auth/sessions/${sessionId}/revoke`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllOthers = async () => {
    setLogginOutAll(true);
    setError(null);
    try {
      await apiClient.post('/auth/sessions/revoke-others');
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to revoke sessions');
    } finally {
      setLogginOutAll(false);
    }
  };

  const getDeviceIcon = (type?: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="h-5 w-5" />;
      case 'tablet': return <Smartphone className="h-5 w-5" />;
      default: return <Monitor className="h-5 w-5" />;
    }
  };

  if (!user) return null;

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700 mb-4">
          <ChevronLeft className="h-4 w-4" />Back to Settings
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Active sessions</h1>
        <p className="mt-1 text-sm text-ink-500">Manage devices where you&apos;re signed in.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-ink-500">{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</p>
        {sessions.length > 1 && (
          <Button variant="outline" size="sm" onClick={revokeAllOthers} disabled={logginOutAll}>
            {logginOutAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
            Sign out other devices
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink-400" /></div>
      ) : (
        <div className="space-y-3">
          {sessions.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-500">No active sessions found.</p>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-600">
                  {getDeviceIcon(session.deviceType)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink-900">
                      {session.deviceName || session.browser || 'Unknown device'}
                    </p>
                    {session.isCurrent && (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-800">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-500">
                    {session.os && `${session.os} · `}
                    {session.location || session.ipAddress || 'Unknown location'}
                    {session.lastUsedAt && ` · Last used ${new Date(session.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              {!session.isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeSession(session.id)}
                  disabled={revoking === session.id}
                  className="text-red-600 hover:text-red-800"
                >
                  {revoking === session.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
