'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, CheckCircle, XCircle, Clock, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Payout = {
  id: string;
  amountPaise: bigint | string;
  status: string;
  method: string;
  destinationMask?: string;
  createdAt: string;
  processedAt?: string;
  failedReason?: string;
  sellerProfile?: {
    storeName?: string;
    userId: string;
    bankAccountMasked?: string;
  };
};

type PayoutsResponse = {
  data: Payout[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-100 text-red-800',
};

export default function AdminPayoutsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPayouts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiClient.get<PayoutsResponse>(`/payouts/admin?${params}`);
      setPayouts(res.data ?? []);
      setMeta(res.meta);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    fetchPayouts();
  }, [user, router, fetchPayouts]);

  const processPayout = async (id: string, action: 'approve' | 'reject' | 'complete') => {
    setActionLoading(id);
    try {
      await apiClient.patch(`/payouts/admin/${id}/process?action=${action}`);
      await fetchPayouts(meta.page);
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Payout Management</h1>
          <p className="mt-1 text-sm text-ink-500">Review and process seller payout requests</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); }}
            className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="FAILED">Failed</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => fetchPayouts()}>
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
      ) : payouts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Clock className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No payouts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map((payout) => {
            const amount = typeof payout.amountPaise === 'string' ? parseInt(payout.amountPaise) : Number(payout.amountPaise);
            return (
              <div key={payout.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-ink-900">{formatINR(amount)}</span>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_STYLES[payout.status] || 'bg-ink-100 text-ink-600')}>
                        {payout.status}
                      </span>
                      {payout.method && (
                        <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs text-ink-500">{payout.method}</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
                      {payout.sellerProfile?.storeName && (
                        <span>{payout.sellerProfile.storeName}</span>
                      )}
                      {payout.destinationMask && (
                        <span className="font-mono text-xs">{payout.destinationMask}</span>
                      )}
                      <span>{new Date(payout.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {payout.failedReason && (
                      <p className="mt-1 text-xs text-red-600">{payout.failedReason}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {payout.status === 'PENDING' && (
                      <>
                        <Button
                          variant="brand"
                          size="sm"
                          onClick={() => processPayout(payout.id, 'approve')}
                          disabled={actionLoading === payout.id}
                        >
                          {actionLoading === payout.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1.5 h-4 w-4" />}
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => processPayout(payout.id, 'reject')}
                          disabled={actionLoading === payout.id}
                        >
                          <XCircle className="mr-1.5 h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    )}
                    {payout.status === 'PROCESSING' && (
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={() => processPayout(payout.id, 'complete')}
                        disabled={actionLoading === payout.id}
                      >
                        {actionLoading === payout.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1.5 h-4 w-4" />}
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => fetchPayouts(meta.page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-ink-500">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => fetchPayouts(meta.page + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
