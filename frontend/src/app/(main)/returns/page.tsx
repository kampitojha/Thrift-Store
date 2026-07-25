'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RotateCcw, Loader2, Package, Search, ChevronRight, ArrowLeft } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type ReturnOrder = {
  id: string; orderNumber: string; status: string; totalPaise: number; createdAt: string;
  items: Array<{ id: string; title: string; quantity: number; unitPricePaise: number; thumbnailUrl?: string }>;
  timeline: Array<{ id: string; status: string; note?: string; createdAt: string }>;
};

export default function ReturnsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [returns, setReturns] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    apiClient.get<{ data: ReturnOrder[] }>('/returns/my')
      .then((res) => setReturns(res.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load returns'))
      .finally(() => setLoading(false));
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-700 mb-4"><ArrowLeft className="h-4 w-4" />Back to orders</Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Returns</h1>
        <p className="mt-1 text-sm text-ink-500">Track your return requests</p>
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-ink-100 animate-pulse" />)}</div>
      ) : returns.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <RotateCcw className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No return requests</p>
          <p className="mt-2 text-sm text-ink-500">When you request a return on an order, it will appear here.</p>
          <Link href="/orders"><Button variant="brand" className="mt-6">View orders</Button></Link>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((r) => (
            <Link key={r.id} href={`/orders/${r.id}`} className="block rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:shadow-lift">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-ink-900">{r.orderNumber}</span>
                    <Badge variant={r.status === 'REFUNDED' ? 'success' : r.status === 'RETURN_REQUESTED' ? 'default' : 'outline'}>{r.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {r.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                          {item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0"><p className="truncate text-sm text-ink-700">{item.title}</p><p className="text-xs text-ink-400">Qty {item.quantity}</p></div>
                      </div>
                    ))}
                  </div>
                  {r.timeline[0]?.note && <p className="mt-2 text-xs text-ink-500">{r.timeline[0].note}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-ink-900">{formatINR(r.totalPaise)}</p>
                    <p className="text-xs text-ink-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-ink-300" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
