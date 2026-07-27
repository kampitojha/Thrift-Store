'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCcw,
  Info,
  Shield,
  Database,
  HardDrive,
  Server,
  CreditCard,
  Mail,
  Clock,
  CheckCheck,
  Filter,
} from 'lucide-react';

type NotificationData = {
  data: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    severity: string;
    category: string;
    read: boolean;
    link: string | null;
    createdAt: string;
    readAt: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
  byCategory: Array<{ category: string; _count: { id: number } }>;
};

type Severity = 'info' | 'warning' | 'error' | 'critical';

const CATEGORIES = ['system', 'payment', 'queue', 'database', 'storage', 'security'] as const;

const severityConfig: Record<Severity, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: 'text-blue-600' },
  warning: { icon: AlertTriangle, className: 'text-amber-600' },
  error: { icon: XCircle, className: 'text-red-600' },
  critical: { icon: XCircle, className: 'text-red-900' },
};

const categoryIconMap: Record<string, typeof Shield> = {
  system: Shield,
  security: Shield,
  database: Database,
  storage: HardDrive,
  queue: Server,
  payment: CreditCard,
};

function relativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string | undefined>();
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [page, setPage] = useState(1);
  const [live, setLive] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (readFilter !== 'all') params.set('read', readFilter === 'read' ? 'true' : 'false');
      params.set('page', String(page));
      params.set('limit', '20');
      const res = await apiClient.get<NotificationData>(
        `/admin/platform/notifications?${params.toString()}`
      );
      setNotifications(res);
    } catch {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [category, readFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [category, readFilter]);

  useEffect(() => {
    setLoading(true);
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [live, fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await apiClient.post('/admin/platform/notifications/read-all');
      await fetchNotifications();
    } catch {
      // silently fail
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    setMarkingIds((prev) => new Set(prev).add(id));
    try {
      await apiClient.post(`/admin/platform/notifications/${id}/read`);
      await fetchNotifications();
    } catch {
      // silently fail
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const severityColorMap: Record<string, string> = {
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
    critical: 'bg-red-200 text-red-900',
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6" aria-label="Notifications page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellRing className="h-6 w-6" aria-hidden="true" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {notifications && notifications.unreadCount > 0 && (
            <Badge variant="default" className="bg-red-500 text-white" aria-label={`${notifications.unreadCount} unread notifications`}>
              {notifications.unreadCount}
            </Badge>
          )}
          <button
            onClick={() => setLive(!live)}
            className={cn(
              'ml-2 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              live
                ? 'bg-green-100 text-green-800'
                : 'bg-muted text-muted-foreground'
            )}
            aria-label={live ? 'Live updates enabled' : 'Live updates disabled'}
          >
            <span className={cn('h-2 w-2 rounded-full', live ? 'bg-green-500 animate-pulse' : 'bg-gray-400')} />
            {live ? 'Live' : 'Paused'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            aria-label="Refresh notifications"
          >
            <RefreshCcw className="mr-1 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAll || !notifications?.unreadCount}
            aria-label="Mark all notifications as read"
          >
            {markingAll ? (
              <RefreshCcw className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-1 h-4 w-4" />
            )}
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
        <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <button
          onClick={() => setCategory(undefined)}
          className={cn(
            'rounded-full px-3 py-1 text-sm font-medium transition-colors',
            !category
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
          aria-label="Show all categories"
        >
          All
        </button>
        {CATEGORIES.map((cat) => {
          const CatIcon = categoryIconMap[cat] ?? Mail;
          const count = notifications?.byCategory.find((c) => c.category === cat)?._count.id ?? 0;
          return (
            <button
              key={cat}
              onClick={() => setCategory(category === cat ? undefined : cat)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors',
                category === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
              aria-label={`Filter by ${cat}${count > 0 ? `, ${count} notifications` : ''}`}
              aria-pressed={category === cat}
            >
              <CatIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {cat}
              {count > 0 && (
                <Badge
                  variant={category === cat ? 'outline' : 'default'}
                  className="ml-0.5 h-5 px-1.5 text-[10px]"
                >
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Read Filter */}
      <div className="flex items-center gap-2" role="group" aria-label="Filter by read status">
        {(['all', 'unread', 'read'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setReadFilter(opt)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              readFilter === opt
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label={`Show ${opt} notifications`}
            aria-pressed={readFilter === opt}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4" aria-label="Loading notifications">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 rounded-lg border p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div
          className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center"
          role="alert"
          aria-label="Error loading notifications"
        >
          <XCircle className="h-12 w-12 text-red-400" aria-hidden="true" />
          <p className="text-lg font-medium text-red-800">{error}</p>
          <Button variant="outline" onClick={fetchNotifications} aria-label="Retry loading notifications">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && notifications?.data.length === 0 && (
        <div
          className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center"
          aria-label="No notifications"
        >
          <BellOff className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <p className="text-lg font-medium text-muted-foreground">No notifications</p>
          <p className="text-sm text-muted-foreground">
            {readFilter !== 'all' || category
              ? 'Try adjusting your filters'
              : 'You are all caught up'}
          </p>
        </div>
      )}

      {/* Notification List */}
      {!loading && !error && notifications && notifications.data.length > 0 && (
        <ul className="space-y-3" aria-label="Notification list">
          {notifications.data.map((n) => {
            const sev = (n.severity as Severity) in severityConfig ? (n.severity as Severity) : 'info';
            const { icon: SevIcon, className: sevColor } = severityConfig[sev];
            const CatIcon = categoryIconMap[n.category] ?? Mail;

            return (
              <li
                key={n.id}
                className={cn(
                  'group relative rounded-lg border p-4 transition-colors hover:bg-accent/50',
                  !n.read ? 'border-l-4 border-l-primary bg-card shadow-sm' : 'bg-muted/30'
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Severity Icon */}
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <SevIcon className={cn('h-5 w-5', sevColor)} aria-hidden="true" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'truncate text-sm',
                            !n.read ? 'font-semibold' : 'font-medium text-muted-foreground'
                          )}
                        >
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                      {/* Read Indicator */}
                      {!n.read && (
                        <span
                          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-label="Unread notification"
                        />
                      )}
                    </div>

                    {/* Meta */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <Badge
                        variant="outline"
                        className={cn(
                          'inline-flex items-center gap-1 capitalize',
                          severityColorMap[sev]
                        )}
                      >
                        <SevIcon className="h-3 w-3" aria-hidden="true" />
                        {n.severity}
                      </Badge>
                      <Badge variant="outline" className="inline-flex items-center gap-1 capitalize">
                        <CatIcon className="h-3 w-3" aria-hidden="true" />
                        {n.category}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        <time dateTime={n.createdAt}>{relativeTime(n.createdAt)}</time>
                      </span>
                      {n.read && n.readAt && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <CheckCircle className="h-3 w-3" aria-hidden="true" />
                          Read {relativeTime(n.readAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mark Read Button */}
                  {!n.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleMarkRead(n.id)}
                      disabled={markingIds.has(n.id)}
                      aria-label={`Mark "${n.title}" as read`}
                    >
                      {markingIds.has(n.id) ? (
                        <RefreshCcw className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCheck className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination */}
      {!loading && !error && notifications && notifications.totalPages > 1 && (
        <nav className="flex items-center justify-between border-t pt-4" aria-label="Pagination">
          <p className="text-sm text-muted-foreground">
            Page {notifications.page} of {notifications.totalPages} ({notifications.total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(notifications.totalPages, 5) }).map((_, i) => {
                const pageNum = (() => {
                  const total = notifications.totalPages;
                  const current = notifications.page;
                  if (total <= 5) return i + 1;
                  if (current <= 3) return i + 1;
                  if (current >= total - 2) return total - 4 + i;
                  return current - 2 + i;
                })();
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(pageNum)}
                    aria-label={`Go to page ${pageNum}`}
                    aria-current={pageNum === page ? 'page' : undefined}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= notifications.totalPages}
              onClick={() => setPage((p) => Math.min(notifications.totalPages, p + 1))}
              aria-label="Next page"
            >
              Next
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
