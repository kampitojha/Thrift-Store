'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Search, ChevronLeft, ChevronRight, ExternalLink, CheckCircle, XCircle, Percent } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';

type Refund = {
  id: string;
  orderId: string;
  amountPaise: number;
  reason?: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  buyer: {
    id: string;
    username: string;
    displayName?: string | null;
  };
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

const REFUND_STATUSES = ['ALL', 'PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'] as const;

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function AdminRefundsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionRefundId, setActionRefundId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'partial' | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRefunds = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await apiClient.get<RefundsResponse>(`/admin/refunds?${params}`);
      setRefunds(res.data ?? []);
      setMeta(res.meta);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    fetchRefunds();
  }, [user, router, fetchRefunds]);

  const handleProcessRefund = async () => {
    if (!actionRefundId || !actionType) return;
    setProcessing(true);
    try {
      const body: any = { action: actionType, notes: actionNotes || undefined };
      if (actionType === 'partial') body.amountPaise = Math.round(parseFloat(partialAmount) * 100);
      await apiClient.patch(`/admin/refunds/${actionRefundId}/process`, body);
      setActionRefundId(null);
      setActionType(null);
      setPartialAmount('');
      setActionNotes('');
      fetchRefunds();
    } catch { /* ignore */ } finally { setProcessing(false); }
  };

  const openAction = (id: string, type: 'approve' | 'reject' | 'partial') => {
    const refund = refunds.find(r => r.id === id);
    setActionRefundId(id);
    setActionType(type);
    setPartialAmount(refund ? formatINR(refund.amountPaise).replace(/[^0-9]/g, '') : '');
    setActionNotes('');
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Refund Management</h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta.total} {meta.total === 1 ? 'refund' : 'refunds'} total
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {REFUND_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                statusFilter === s
                  ? 'bg-brand-600 text-white shadow-soft'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              )}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchRefunds()}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
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
          <p className="mt-1 text-sm text-ink-400">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {refunds.map((refund) => (
            <div key={refund.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-ink-500">#{refund.id.slice(0, 8).toUpperCase()}</span>
                    <span className="text-lg font-bold text-ink-900">{formatINR(refund.amountPaise)}</span>
                    <span className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      STATUS_STYLES[refund.status] || 'bg-ink-100 text-ink-600'
                    )}>
                      {refund.status}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
                    <Link href={`/admin/orders/${refund.orderId}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                      #{refund.order.orderNumber} <ExternalLink className="h-3 w-3" />
                    </Link>
                    <span className="font-medium text-ink-700">
                      {refund.buyer.displayName || refund.buyer.username}
                    </span>
                    {refund.reason && <span className="text-ink-600">{refund.reason}</span>}
                    <span>
                      {new Date(refund.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {refund.status === 'PENDING' && (
                    <>
                      <Button variant="brand" size="sm" onClick={() => openAction(refund.id, 'approve')}>
                        <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openAction(refund.id, 'partial')}>
                        <Percent className="mr-1 h-3.5 w-3.5" /> Partial
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openAction(refund.id, 'reject')}>
                        <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}
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

      {/* Action Dialog */}
      <Dialog open={!!actionRefundId} onClose={() => setActionRefundId(null)}>
        <DialogHeader>Refund {actionType ? actionType.charAt(0).toUpperCase() + actionType.slice(1) : ''}</DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              {actionType === 'approve' && 'This will mark the refund as approved and initiate the refund process.'}
              {actionType === 'reject' && 'This will reject the refund request.'}
              {actionType === 'partial' && 'Approve a partial refund amount.'}
            </p>
            {actionType === 'partial' && (
              <div>
                <label className="text-sm font-medium text-ink-700 mb-1 block">Amount (in rupees)</label>
                <Input
                  type="number"
                  min="0"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-ink-700 mb-1 block">Notes (optional)</label>
              <Input
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Add a note..."
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setActionRefundId(null)}>Cancel</Button>
          <Button
            variant={actionType === 'reject' ? 'destructive' : 'brand'}
            onClick={handleProcessRefund}
            disabled={processing || (actionType === 'partial' && (!partialAmount || parseFloat(partialAmount) <= 0))}
          >
            {processing ? 'Processing...' : `Confirm ${actionType ? actionType.charAt(0).toUpperCase() + actionType.slice(1) : ''}`}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
