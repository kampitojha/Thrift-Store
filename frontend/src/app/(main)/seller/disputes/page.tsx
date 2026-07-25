'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Loader2, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

type Dispute = {
  id: string; reason: string; description?: string; status: string; resolution?: string; createdAt: string;
  order: { id: string; orderNumber: string; totalPaise: number; status: string };
  raisedBy: { id: string; username: string; displayName?: string; avatarUrl?: string };
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800', UNDER_REVIEW: 'bg-amber-100 text-amber-800',
  RESOLVED_BUYER: 'bg-emerald-100 text-emerald-800', RESOLVED_SELLER: 'bg-blue-100 text-blue-800',
  CLOSED: 'bg-ink-100 text-ink-600', ESCALATED: 'bg-purple-100 text-purple-800',
};

export default function SellerDisputesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      const res = await apiClient.get<{ data: Dispute[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(`/disputes/seller?${params}`);
      setDisputes(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load disputes'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchDisputes();
  }, [user, fetchDisputes, router]);

  const handleAction = async (id: string, action: string) => {
    setActionLoading(`${action}-${id}`);
    try {
      await apiClient.patch(`/disputes/${id}/resolve`, { action, resolution: resolution || undefined });
      setSelected(null);
      setResolution('');
      await fetchDisputes();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to resolve dispute'); }
    finally { setActionLoading(null); }
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div><h1 className="font-display text-2xl font-semibold text-ink-900">Disputes</h1><p className="text-sm text-ink-500">{disputes.length} open</p></div>
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-ink-100 animate-pulse" />)}</div>
      ) : disputes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-16 text-center">
          <Shield className="mx-auto h-12 w-12 text-ink-300" />
          <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">No disputes</h3>
          <p className="mt-2 text-sm text-ink-500">Disputes raised by buyers will appear here.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {disputes.map((d) => (
              <div key={d.id} className="rounded-2xl border border-ink-100 bg-white p-5 cursor-pointer hover:bg-ink-50/50 transition" onClick={() => { setSelected(d); setResolution(''); }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn('rounded-xl p-3', d.status === 'OPEN' ? 'bg-red-50' : 'bg-amber-50')}><Shield className={cn('h-5 w-5', d.status === 'OPEN' ? 'text-red-600' : 'text-amber-600')} /></div>
                    <div>
                      <div className="flex items-center gap-2"><span className="font-medium text-ink-900">Order {d.order.orderNumber}</span><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_COLORS[d.status])}>{d.status.replace(/_/g, ' ')}</span></div>
                      <p className="text-sm text-ink-600 mt-0.5">Buyer: {d.raisedBy?.displayName || d.raisedBy?.username || 'Unknown'}</p>
                      <p className="text-sm text-ink-500 mt-0.5">Reason: {d.reason}</p>
                      {d.description && <p className="text-xs text-ink-400 mt-0.5 line-clamp-2">{d.description}</p>}
                      <p className="text-xs text-ink-400 mt-1">{new Date(d.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-ink-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button></div>
            </div>
          )}
        </>
      )}

      <Dialog open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <DialogHeader><h2 className="font-display text-lg font-semibold">Dispute - Order {selected.order.orderNumber}</h2></DialogHeader>
            <DialogBody>
              <div className="space-y-4">
                <div className="text-sm"><span className="font-medium text-ink-900">Reason:</span> <span className="text-ink-600">{selected.reason}</span></div>
                {selected.description && <div className="text-sm"><span className="font-medium text-ink-900">Description:</span> <p className="text-ink-600 mt-1">{selected.description}</p></div>}
                <div className="text-sm"><span className="font-medium text-ink-900">Status:</span> <Badge variant={selected.status === 'CLOSED' ? 'success' : 'default'}>{selected.status.replace(/_/g, ' ')}</Badge></div>
                {selected.resolution && <div className="text-sm"><span className="font-medium text-ink-900">Resolution:</span> <span className="text-ink-600">{selected.resolution}</span></div>}
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Your response</label>
                  <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} placeholder="Describe your resolution..." />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              {['OPEN', 'UNDER_REVIEW'].includes(selected.status) && (
                <div className="flex gap-2">
                  <Button variant="brand" onClick={() => handleAction(selected.id, 'resolve_buyer')} disabled={actionLoading === `resolve_buyer-${selected.id}`} className="bg-emerald-600 hover:bg-emerald-700">
                    {actionLoading === `resolve_buyer-${selected.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Resolve for buyer
                  </Button>
                  <Button variant="brand" onClick={() => handleAction(selected.id, 'resolve_seller')} disabled={actionLoading === `resolve_seller-${selected.id}`} className="bg-blue-600 hover:bg-blue-700">
                    Resolve in my favor
                  </Button>
                  <Button variant="outline" onClick={() => handleAction(selected.id, 'escalate')} disabled={actionLoading === `escalate-${selected.id}`} className="border-purple-200 text-purple-700">
                    Escalate
                  </Button>
                </div>
              )}
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  );
}
