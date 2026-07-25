'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RotateCcw, Loader2, Search, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type ReturnOrder = {
  id: string; orderNumber: string; status: string; totalPaise: number; createdAt: string;
  buyer: { id: string; username: string; displayName?: string; avatarUrl?: string };
  items: Array<{ id: string; title: string; quantity: number; unitPricePaise: number; thumbnailUrl?: string }>;
  timeline: Array<{ id: string; status: string; note?: string; metadata?: any; createdAt: string }>;
};

export default function SellerReturnsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [returns, setReturns] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<ReturnOrder | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [processNote, setProcessNote] = useState('');

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      const res = await apiClient.get<{ data: ReturnOrder[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(`/returns/seller?${params}`);
      setReturns(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load returns'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchReturns();
  }, [user, fetchReturns, router]);

  const handleAction = async (id: string, action: string) => {
    setActionLoading(`${action}-${id}`);
    try {
      await apiClient.patch(`/returns/${id}/process`, { action, note: processNote || undefined });
      setSelected(null);
      setProcessNote('');
      await fetchReturns();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to process return'); }
    finally { setActionLoading(null); }
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div><h1 className="font-display text-2xl font-semibold text-ink-900">Return Requests</h1><p className="text-sm text-ink-500">{returns.length} pending</p></div>
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-ink-100 animate-pulse" />)}</div>
      ) : returns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-16 text-center">
          <RotateCcw className="mx-auto h-12 w-12 text-ink-300" />
          <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">No return requests</h3>
          <p className="mt-2 text-sm text-ink-500">Return requests from buyers will appear here.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {returns.map((r) => (
              <div key={r.id} className="rounded-2xl border border-ink-100 bg-white p-5 cursor-pointer hover:bg-ink-50/50 transition" onClick={() => { setSelected(r); setProcessNote(''); }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="rounded-xl bg-orange-50 p-3"><RotateCcw className="h-5 w-5 text-orange-600" /></div>
                    <div>
                      <div className="flex items-center gap-2"><span className="font-medium text-ink-900">{r.orderNumber}</span><Badge variant={r.status === 'RETURN_REQUESTED' ? 'default' : r.status === 'RETURNED' ? 'success' : 'outline'}>{r.status.replace(/_/g, ' ')}</Badge></div>
                      <p className="text-sm text-ink-500 mt-0.5">Buyer: {r.buyer?.displayName || r.buyer?.username || 'Unknown'}</p>
                      <p className="text-sm text-ink-600 mt-1">{r.items.map((i) => i.title).join(', ')}</p>
                      {r.timeline[0]?.note && <p className="text-xs text-ink-400 mt-1">{r.timeline[0].note}</p>}
                      <p className="text-xs text-ink-400 mt-1">{new Date(r.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0"><p className="font-semibold text-ink-900">{formatINR(r.totalPaise)}</p></div>
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
            <DialogHeader><h2 className="font-display text-lg font-semibold">Return - {selected.orderNumber}</h2></DialogHeader>
            <DialogBody>
              <div className="space-y-4">
                <div className="text-sm text-ink-600"><span className="font-medium text-ink-900">Buyer:</span> {selected.buyer?.displayName || selected.buyer?.username}</div>
                <div className="text-sm text-ink-600"><span className="font-medium text-ink-900">Items:</span> {selected.items.map((i) => `${i.title} x${i.quantity}`).join(', ')}</div>
                <div className="text-sm text-ink-600"><span className="font-medium text-ink-900">Total:</span> {formatINR(selected.totalPaise)}</div>
                {selected.timeline.map((t) => t.metadata?.reason && (
                  <div key={t.id} className="text-sm text-ink-600"><span className="font-medium text-ink-900">Reason:</span> {t.metadata.reason}</div>
                ))}
                {selected.timeline.map((t) => t.metadata?.description && (
                  <div key={t.id} className="text-sm text-ink-600"><span className="font-medium text-ink-900">Description:</span> {t.metadata.description}</div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Note (optional)</label>
                  <Textarea value={processNote} onChange={(e) => setProcessNote(e.target.value)} rows={2} placeholder="Add a note..." />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              {selected.status === 'RETURN_REQUESTED' && (
                <div className="flex gap-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction(selected.id, 'approve')} disabled={actionLoading === `approve-${selected.id}`}>
                    {actionLoading === `approve-${selected.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}Approve
                  </Button>
                  <Button className="bg-red-600 hover:bg-red-700" onClick={() => handleAction(selected.id, 'reject')} disabled={actionLoading === `reject-${selected.id}`}>
                    {actionLoading === `reject-${selected.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}Reject
                  </Button>
                </div>
              )}
              {selected.status === 'RETURNED' && (
                <Button variant="brand" onClick={() => handleAction(selected.id, 'complete')} disabled={actionLoading === `complete-${selected.id}`}>
                  {actionLoading === `complete-${selected.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Complete & Refund
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  );
}
