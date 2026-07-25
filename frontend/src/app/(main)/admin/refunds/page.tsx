'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Refund = {
  id: string;
  orderId: string;
  amountPaise: number;
  reason?: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  order: {
    orderNumber: string;
    totalPaise: number;
    status: string;
  };
};

type RefundsResponse = {
  data: Refund[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  REFUNDED: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-ink-100 text-ink-600',
};

export default function AdminRefundsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchRefunds = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiClient.get<RefundsResponse>(`/refunds/admin?${params}`);
      setRefunds(res.data);
      setMeta(res.meta);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    fetchRefunds();
  }, [user, router, fetchRefunds]);

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Refund Management</h1>
          <p className="mt-1 text-sm text-ink-500">View all refunds processed on the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); }}
            className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="REFUNDED">Refunded</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => fetchRefunds()}>
            <Search className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-ink-100 animate-pulse" />
          ))}
        </div>
      ) : refunds.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <RefreshCw className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No refunds found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {refunds.map((refund) => (
            <div key={refund.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-ink-900">{formatINR(refund.amountPaise)}</span>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_STYLES[refund.status] || 'bg-ink-100 text-ink-600')}>
                      {refund.status}
                    </span>
                    <Link href={`/admin/orders/${refund.orderId}`} className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1">
                      #{refund.order.orderNumber} <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
                    {refund.reason && <span className="text-ink-600">{refund.reason}</span>}
                    <span>{new Date(refund.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {refund.processedAt && (
                      <span className="text-ink-400">Processed: {new Date(refund.processedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/admin/orders/${refund.orderId}`}>
                    <Button variant="outline" size="sm">View Order</Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => fetchRefunds(meta.page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-ink-500">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => fetchRefunds(meta.page + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
