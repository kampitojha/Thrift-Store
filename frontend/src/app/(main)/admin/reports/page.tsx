'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Flag,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  XCircle,
  ArrowUp,
  Loader2,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

type Report = {
  id: string;
  reason: string;
  description?: string;
  type: string;
  status: string;
  createdAt: string;
  reporter: {
    id: string;
    username: string;
    displayName?: string | null;
  };
  targetType: string;
  targetId: string;
  targetTitle?: string | null;
};

type ReportsResponse = {
  data: Report[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const REPORT_STATUSES = ['ALL', 'PENDING', 'REVIEWING', 'ACTIONED', 'DISMISSED'] as const;

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  REVIEWING: 'bg-blue-100 text-blue-800',
  ACTIONED: 'bg-emerald-100 text-emerald-800',
  DISMISSED: 'bg-ink-100 text-ink-600',
};

const TYPE_STYLES: Record<string, string> = {
  PRODUCT: 'bg-violet-100 text-violet-800',
  USER: 'bg-blue-100 text-blue-800',
  REVIEW: 'bg-orange-100 text-orange-800',
  MESSAGE: 'bg-pink-100 text-pink-800',
};

export default function AdminReportsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [reports, setReports] = useState<Report[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState('');

  const fetchReports = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await apiClient.get<ReportsResponse>(`/admin/reports?${params}`);
      setReports(res.data ?? []);
      setMeta(res.meta);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    fetchReports();
  }, [user, router, fetchReports]);

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id);
    try {
      await apiClient.patch(`/admin/reports/${id}/${action}`, { note: actionNote.trim() || undefined });
      setExpandedId(null);
      setActionNote('');
      await fetchReports(meta.page);
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Reports Management</h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta.total} {meta.total === 1 ? 'report' : 'reports'} total
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {REPORT_STATUSES.map((s) => (
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
        <Button variant="outline" size="sm" onClick={() => fetchReports()}>
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
      ) : reports.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Shield className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No reports found</p>
          <p className="mt-1 text-sm text-ink-400">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isOpen = expandedId === report.id;
            const canAct = ['PENDING', 'REVIEWING'].includes(report.status);
            return (
              <div key={report.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-ink-900">{report.reason}</span>
                      <span className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        STATUS_STYLES[report.status] || 'bg-ink-100 text-ink-600'
                      )}>
                        {report.status}
                      </span>
                      <span className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        TYPE_STYLES[report.type] || 'bg-ink-100 text-ink-600'
                      )}>
                        {report.type}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
                      <span className="font-medium text-ink-700">
                        Reported by: {report.reporter.displayName || report.reporter.username}
                      </span>
                      {report.targetTitle && (
                        <span className="text-ink-600">
                          {report.targetType}: {report.targetTitle}
                        </span>
                      )}
                      <span>
                        {new Date(report.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                    {report.description && (
                      <p className="mt-2 text-sm text-ink-600 line-clamp-2">{report.description}</p>
                    )}
                  </div>
                  {canAct && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(isOpen ? null : report.id)}
                    >
                      {isOpen ? 'Cancel' : 'Take Action'}
                    </Button>
                  )}
                </div>

                {isOpen && canAct && (
                  <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50 p-4">
                    <Textarea
                      placeholder="Optional note for this action..."
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      className="mb-3 min-h-[60px]"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={() => handleAction(report.id, 'action')}
                        disabled={actionLoading === report.id}
                      >
                        {actionLoading === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                        Action
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(report.id, 'dismiss')}
                        disabled={actionLoading === report.id}
                      >
                        {actionLoading === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="mr-1 h-4 w-4" />}
                        Dismiss
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAction(report.id, 'escalate')}
                        disabled={actionLoading === report.id}
                      >
                        {actionLoading === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="mr-1 h-4 w-4" />}
                        Escalate
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
          <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => fetchReports(meta.page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-ink-500">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => fetchReports(meta.page + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
