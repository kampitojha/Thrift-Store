'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, RefreshCw, ChevronLeft, ChevronRight, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';

type ReturnItem = {
  id: string;
  orderNumber: string;
  status: string;
  itemCount: number;
  reason?: string;
  createdAt: string;
  buyer: {
    id: string;
    username: string;
    displayName?: string | null;
  };
  order: {
    id: string;
    orderNumber: string;
  };
  items: Array<{
    id: string;
    title: string;
    quantity: number;
  }>;
};

type ReturnsResponse = {
  data: ReturnItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const RETURN_STATUSES = ['ALL', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'] as const;

const STATUS_STYLES: Record<string, string> = {
  RETURN_REQUESTED: 'bg-amber-100 text-amber-800',
  RETURNED: 'bg-blue-100 text-blue-800',
  REFUNDED: 'bg-emerald-100 text-emerald-800',
};

export default function AdminReturnsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionReturnId, setActionReturnId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchReturns = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await apiClient.get<ReturnsResponse>(`/admin/returns?${params}`);
      setReturns(res.data);
      setMeta(res.meta);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    fetchReturns();
  }, [user, router, fetchReturns]);

  const handleProcessReturn = async () => {
    if (!actionReturnId || !actionType) return;
    setProcessing(true);
    try {
      await apiClient.patch(`/admin/returns/${actionReturnId}/process`, {
        action: actionType,
        notes: actionNotes || undefined,
      });
      setActionReturnId(null);
      setActionType(null);
      setActionNotes('');
      fetchReturns();
    } catch { /* ignore */ } finally { setProcessing(false); }
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Returns Management</h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta.total} {meta.total === 1 ? 'return' : 'returns'} total
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {RETURN_STATUSES.map((s) => (
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
              {s === 'ALL' ? 'All' : s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchReturns()}>
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
      ) : returns.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <RotateCcw className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No returns found</p>
          <p className="mt-1 text-sm text-ink-400">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map((ret) => (
            <div key={ret.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/orders/${ret.order.id}`} className="font-mono text-sm font-semibold text-brand-700 hover:underline inline-flex items-center gap-1">
                      #{ret.order.orderNumber} <ExternalLink className="h-3 w-3" />
                    </Link>
                    <span className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      STATUS_STYLES[ret.status] || 'bg-ink-100 text-ink-600'
                    )}>
                      {ret.status.replace(/_/g, ' ')}
                    </span>
                    <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs text-ink-500">
                      {ret.itemCount} {ret.itemCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
                    <span className="font-medium text-ink-700">
                      {ret.buyer.displayName || ret.buyer.username}
                    </span>
                    {ret.reason && <span className="text-ink-600">{ret.reason}</span>}
                    <span>
                      {new Date(ret.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                  {ret.items && ret.items.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ret.items.map((item) => (
                        <span key={item.id} className="rounded-lg bg-ink-50 px-2 py-1 text-xs text-ink-600">
                          {item.title} ×{item.quantity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {ret.status === 'RETURN_REQUESTED' && (
                    <>
                      <Button variant="brand" size="sm" onClick={() => { setActionReturnId(ret.id); setActionType('approve'); setActionNotes(''); }}>
                        <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => { setActionReturnId(ret.id); setActionType('reject'); setActionNotes(''); }}>
                        <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  <Link href={`/admin/orders/${ret.order.id}`}>
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
          <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => fetchReturns(meta.page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-ink-500">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => fetchReturns(meta.page + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={!!actionReturnId} onClose={() => setActionReturnId(null)}>
        <DialogHeader>Return {actionType ? actionType.charAt(0).toUpperCase() + actionType.slice(1) : ''}</DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              {actionType === 'approve' && 'This will approve the return request.'}
              {actionType === 'reject' && 'This will reject the return request.'}
            </p>
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
          <Button variant="outline" onClick={() => setActionReturnId(null)}>Cancel</Button>
          <Button
            variant={actionType === 'reject' ? 'destructive' : 'brand'}
            onClick={handleProcessReturn}
            disabled={processing}
          >
            {processing ? 'Processing...' : `Confirm ${actionType ? actionType.charAt(0).toUpperCase() + actionType.slice(1) : ''}`}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
