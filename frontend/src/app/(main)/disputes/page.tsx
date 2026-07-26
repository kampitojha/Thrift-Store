'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Loader2, ChevronRight, ArrowLeft } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type DisputeItem = {
  id: string; reason: string; status: string; resolution?: string; createdAt: string;
  order: { id: string; orderNumber: string; totalPaise: number; status: string; createdAt: string };
  raisedBy: { id: string; username: string; displayName?: string };
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800', UNDER_REVIEW: 'bg-amber-100 text-amber-800',
  RESOLVED_BUYER: 'bg-emerald-100 text-emerald-800', RESOLVED_SELLER: 'bg-blue-100 text-blue-800',
  CLOSED: 'bg-ink-100 text-ink-600', ESCALATED: 'bg-purple-100 text-purple-800',
};

export default function DisputesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'my' | 'seller'>('my');

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    const endpoint = tab === 'my' ? '/disputes/my' : '/disputes/seller';
    apiClient.get<{ data: DisputeItem[] }>(endpoint)
      .then((res) => setDisputes(res.data ?? []))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load disputes'))
      .finally(() => setLoading(false));
  }, [user, router, tab]);

  if (!user) return null;

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-700 mb-4"><ArrowLeft className="h-4 w-4" />Back to orders</Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Disputes</h1>
        <p className="mt-1 text-sm text-ink-500">Track and manage disputes</p>
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <div className="mb-6 flex gap-2">
        <Button variant={tab === 'my' ? 'default' : 'outline'} size="sm" onClick={() => setTab('my')}>My disputes</Button>
        <Button variant={tab === 'seller' ? 'default' : 'outline'} size="sm" onClick={() => setTab('seller')}>As seller</Button>
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-ink-100 animate-pulse" />)}</div>
      ) : disputes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Shield className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No disputes</p>
          <p className="mt-2 text-sm text-ink-500">When you raise a dispute on an order, it will appear here.</p>
          <Link href="/orders"><Button variant="brand" className="mt-6">View orders</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <div key={d.id} className="rounded-2xl border border-ink-100 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-ink-900">Dispute</span>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium', STATUS_COLORS[d.status] || 'bg-ink-100 text-ink-600')}>{d.status.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-700">Order: <Link href={`/orders/${d.order.id}`} className="text-brand-600 hover:underline">{d.order.orderNumber}</Link></p>
                  <p className="text-sm text-ink-500 mt-0.5">Reason: {d.reason}</p>
                  {d.resolution && <p className="text-sm text-ink-500 mt-0.5">Resolution: {d.resolution}</p>}
                  <p className="text-xs text-ink-400 mt-1">Opened {new Date(d.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
                <Link href={`/orders/${d.order.id}`}><Button variant="ghost" size="sm">View <ChevronRight className="h-4 w-4" /></Button></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
