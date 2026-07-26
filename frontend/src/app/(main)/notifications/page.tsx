'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ArrowLeft, Package, Heart, MessageCircle, Tag, AlertCircle, Star, CreditCard, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient, PaginationMeta } from '@/lib/api';
import { connectSocket, onNotification } from '@/lib/socket';
import { cn } from '@/lib/utils';

type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
  imageUrl?: string | null;
  isRead: boolean;
  createdAt: string;
};

const ICON_MAP: Record<string, React.ElementType> = {
  ORDER_UPDATE: Package,
  SHIPPING_UPDATE: Package,
  PRICE_DROP: Tag,
  WISHLIST_ALERT: Heart,
  PROMOTION: Tag,
  RECOMMENDATION: Star,
  RESTOCK: Package,
  MESSAGE: MessageCircle,
  PAYMENT: CreditCard,
  SYSTEM: AlertCircle,
  FOLLOW: Heart,
  REVIEW: Star,
  PAYOUT: CreditCard,
};

const TYPE_LABELS: Record<string, string> = {
  ORDER_UPDATE: 'Orders',
  PRICE_DROP: 'Price drops',
  MESSAGE: 'Messages',
  FOLLOW: 'Follows',
  REVIEW: 'Reviews',
  SYSTEM: 'System',
  PAYOUT: 'Payouts',
};

export default function NotificationsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async (type?: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const qs = type ? `?type=${type}` : '';
      const res = await apiClient.get<{ data: Notification[]; meta: PaginationMeta & { unread?: number } }>(`/notifications${qs}`);
      setNotifications(res.data);
      setMeta(res.meta);
      setUnreadCount(res.meta.unread ?? 0);
    } catch { setNotifications([]); } finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    try { connectSocket(); } catch {}
    fetchNotifications();

    const unsubNotif = onNotification((data: any) => {
      if (data?.notification) {
        setNotifications((prev) => [data.notification, ...prev]);
        setUnreadCount((c) => c + 1);
      }
    });

    return () => { unsubNotif(); };
  }, [user, router, fetchNotifications]);

  useEffect(() => {
    fetchNotifications(filter || undefined);
  }, [filter, fetchNotifications]);

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiClient.patch('/notifications/read', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ } finally { setMarkingAll(false); }
  };

  const markRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch { /* ignore */ }
  };

  if (!user) return null;

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Notifications</h1>
            <p className="mt-1 text-sm text-ink-500">
              {meta ? `${meta.total} notification${meta.total !== 1 ? 's' : ''}` : 'Stay updated'}
              {unreadCount > 0 && ` · ${unreadCount} unread`}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} disabled={markingAll}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('')}
          className={cn(
            'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition',
            !filter ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
          )}
        >
          All
        </button>
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition',
              filter === key ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Bell className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No notifications yet</p>
          <p className="mt-2 text-sm text-ink-500">
            You&apos;ll receive notifications about your orders, wishlist, and more.
          </p>
          <Link href="/browse">
            <Button variant="brand" className="mt-6">Browse marketplace</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = ICON_MAP[n.type] || Bell;
            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  'group w-full rounded-2xl border p-4 text-left transition',
                  n.isRead
                    ? 'border-ink-100 bg-white hover:bg-ink-50'
                    : 'border-brand-200 bg-brand-50/50 hover:bg-brand-50',
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    n.isRead ? 'bg-ink-100 text-ink-500' : 'bg-brand-100 text-brand-700',
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm', n.isRead ? 'text-ink-700' : 'font-medium text-ink-900')}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 text-xs text-ink-400">
                          {new Date(n.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                        <button
                          onClick={(e) => deleteNotification(n.id, e)}
                          className="shrink-0 rounded-full p-1 text-ink-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {n.body && (
                      <p className="mt-1 text-sm text-ink-500 line-clamp-2">{n.body}</p>
                    )}
                  </div>
                  {!n.isRead && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
