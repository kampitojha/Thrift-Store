'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  XCircle,
  ArrowUp,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

type Dispute = {
  id: string;
  reason: string;
  description?: string;
  status: string;
  raisedBy: string;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
  };
  reporter: {
    id: string;
    username: string;
    displayName?: string | null;
  };
};

type DisputesResponse = {
  data: Dispute[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const DISPUTE_STATUSES = ['ALL', 'OPEN', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CLOSED'] as const;

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  ESCALATED: 'bg-red-100 text-red-800',
  RESOLVED_BUYER: 'bg-emerald-100 text-emerald-800',
  RESOLVED_SELLER: 'bg-violet-100 text-violet-800',
  CLOSED: 'bg-ink-100 text-ink-600',
};

export default function AdminDisputesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  const fetchDisputes = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await apiClient.get<DisputesResponse>(`/admin/disputes?${params}`);
      setDisputes(res.data);
      setMeta(res.meta);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    fetchDisputes();
  }, [user, router, fetchDisputes]);

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id);
    try {
      await apiClient.patch(`/admin/disputes/${id}/${action}`, { note: resolveNote.trim() || undefined });
      setExpandedId(null);
      setResolveNote('');
      await fetchDisputes(meta.page);
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Disputes Management</h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta.total} {meta.total === 1 ? 'dispute' : 'disputes'} total
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {DISPUTE_STATUSES.map((s) => (
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
        <Button variant="outline" size="sm" onClick={() => fetchDisputes()}>
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
      ) : disputes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No disputes found</p>
          <p className="mt-1 text-sm text-ink-400">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => {
            const isOpen = expandedId === dispute.id;
            const canAct = ['OPEN', 'UNDER_REVIEW', 'ESCALATED'].includes(dispute.status);
            return (
              <div key={dispute.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-ink-900">{dispute.reason}</span>
                      <span className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        STATUS_STYLES[dispute.status] || 'bg-ink-100 text-ink-600'
                      )}>
                        {dispute.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
                      <Link href={`/admin/orders/${dispute.order.id}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                        #{dispute.order.orderNumber} <ExternalLink className="h-3 w-3" />
                      </Link>
                      <span className="font-medium text-ink-700">
                        Raised by: {dispute.reporter.displayName || dispute.reporter.username}
                      </span>
                      <span>
                        {new Date(dispute.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                    {dispute.description && (
                      <p className="mt-2 text-sm text-ink-600 line-clamp-2">{dispute.description}</p>
                    )}
                  </div>
                  {canAct && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(isOpen ? null : dispute.id)}
                    >
                      {isOpen ? 'Cancel' : 'Take Action'}
                    </Button>
                  )}
                </div>

                {isOpen && canAct && (
                  <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50 p-4">
                    <Textarea
                      placeholder="Optional note for this action..."
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                      className="mb-3 min-h-[60px]"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={() => handleAction(dispute.id, 'resolve-buyer')}
                        disabled={actionLoading === dispute.id}
                      >
                        {actionLoading === dispute.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                        Resolve for Buyer
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAction(dispute.id, 'resolve-seller')}
                        disabled={actionLoading === dispute.id}
                      >
                        {actionLoading === dispute.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                        Resolve for Seller
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(dispute.id, 'escalate')}
                        disabled={actionLoading === dispute.id}
                      >
                        {actionLoading === dispute.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="mr-1 h-4 w-4" />}
                        Escalate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(dispute.id, 'close')}
                        disabled={actionLoading === dispute.id}
                      >
                        {actionLoading === dispute.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="mr-1 h-4 w-4" />}
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => fetchDisputes(meta.page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-ink-500">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => fetchDisputes(meta.page + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
