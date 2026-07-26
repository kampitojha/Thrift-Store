'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  RefreshCw,
  Clock,
  UserPlus,
  Store,
  ShoppingCart,
  RefreshCcw,
  Flag,
  ShieldCheck,
  Package,
  CreditCard,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

type ActivityEntry = {
  id: string;
  timestamp: string;
  userId?: string;
  username?: string;
  displayName?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  'user.create': <UserPlus className="h-4 w-4 text-emerald-600" />,
  'user.delete': <UserPlus className="h-4 w-4 text-red-600" />,
  'user.restore': <UserPlus className="h-4 w-4 text-blue-600" />,
  'seller.verify.approve': <Store className="h-4 w-4 text-emerald-600" />,
  'seller.verify.reject': <Store className="h-4 w-4 text-red-600" />,
  'order.cancel': <ShoppingCart className="h-4 w-4 text-red-600" />,
  'order.refund': <RefreshCcw className="h-4 w-4 text-amber-600" />,
  'product.approve': <Package className="h-4 w-4 text-emerald-600" />,
  'product.reject': <Package className="h-4 w-4 text-red-600" />,
  'product.hide': <Package className="h-4 w-4 text-ink-600" />,
  'product.feature': <Package className="h-4 w-4 text-brand-600" />,
  'report.action': <Flag className="h-4 w-4 text-red-600" />,
  'report.dismiss': <Flag className="h-4 w-4 text-ink-600" />,
  'dispute.resolve_buyer': <ShieldCheck className="h-4 w-4 text-emerald-600" />,
  'dispute.resolve_seller': <ShieldCheck className="h-4 w-4 text-blue-600" />,
  'dispute.escalate': <ShieldCheck className="h-4 w-4 text-amber-600" />,
  'refund.approve': <CreditCard className="h-4 w-4 text-emerald-600" />,
  'refund.reject': <CreditCard className="h-4 w-4 text-red-600" />,
};

function getActionIcon(action: string): React.ReactNode {
  return ACTION_ICONS[action] || <Activity className="h-4 w-4 text-ink-400" />;
}

function getActionColor(action: string): string {
  if (action.includes('approve') || action.includes('create') || action.includes('restore')) return 'border-l-emerald-500';
  if (action.includes('reject') || action.includes('delete') || action.includes('cancel') || action.includes('hide')) return 'border-l-red-500';
  if (action.includes('escalate')) return 'border-l-amber-500';
  if (action.includes('feature')) return 'border-l-brand-500';
  return 'border-l-ink-300';
}

export default function AdminActivityPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchActivity = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: ActivityEntry[]; meta: any }>(`/admin/activity-feed?page=${p}&limit=30`);
      setActivities(res.data);
      setTotalPages(res.meta.totalPages);
      setPage(res.meta.page);
    } catch {
      setError('Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    fetchActivity();
  }, [user, router, fetchActivity]);

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Activity className="h-6 w-6 text-brand-600" />
            Activity Feed
          </h1>
          <p className="mt-1 text-sm text-ink-500">Real-time operations feed across the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchActivity(page)}>
          <RefreshCw className="mr-1.5 h-4 w-4" />Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-red-200 py-24 text-center">
          <Activity className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchActivity()}>Retry</Button>
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Activity className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No activity yet</p>
          <p className="text-sm text-ink-500">Activity will appear here as actions happen on the platform</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {activities.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  'rounded-2xl border border-ink-100 bg-white p-4 shadow-soft border-l-4 transition hover:shadow-md',
                  getActionColor(entry.action),
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-50">
                    {getActionIcon(entry.action)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-ink-900">
                        {entry.displayName || entry.username || 'System'}
                      </span>
                      <span className="text-xs text-ink-400">{entry.action.replace(/\./g, ' · ')}</span>
                      {entry.entityType && (
                        <Badge variant="outline" className="text-[10px]">{entry.entityType}</Badge>
                      )}
                    </div>
                    {entry.entityId && (
                      <p className="mt-0.5 text-xs text-ink-400 font-mono">ID: {entry.entityId.slice(0, 12)}...</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-ink-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <span className="text-ink-300">· metadata available</span>
                      )}
                    </div>
                  </div>
                  {entry.entityId && entry.entityType && (
                    <Link
                      href={getEntityLink(entry.entityType, entry.entityId)}
                      className="shrink-0 text-xs text-brand-600 hover:underline"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchActivity(page - 1)}>Previous</Button>
              <span className="text-sm text-ink-500">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchActivity(page + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function getEntityLink(type: string, id: string): string {
  const map: Record<string, string> = {
    user: '/admin/users/',
    product: '/admin/products/',
    order: '/admin/orders/',
    seller: '/admin/sellers/',
    dispute: '/admin/disputes/',
    report: '/admin/reports/',
    refund: '/admin/refunds/',
  };
  return map[type?.toLowerCase()] ? `${map[type.toLowerCase()]}${id}` : '#';
}
