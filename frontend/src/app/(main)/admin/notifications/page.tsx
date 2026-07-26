'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Loader2,
  RefreshCw,
  Clock,
  Megaphone,
  UserCheck,
  CreditCard,
  ShoppingBag,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/tabs';

type AdminNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  user?: { id: string; username: string; displayName?: string; avatarUrl?: string };
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  SYSTEM: <Megaphone className="h-4 w-4 text-brand-600" />,
  VERIFICATION: <UserCheck className="h-4 w-4 text-emerald-600" />,
  PAYOUT: <CreditCard className="h-4 w-4 text-blue-600" />,
  ORDER_UPDATE: <ShoppingBag className="h-4 w-4 text-amber-600" />,
  REPORT: <AlertTriangle className="h-4 w-4 text-red-600" />,
  DISPUTE: <ShieldAlert className="h-4 w-4 text-violet-600" />,
};

const TYPE_STYLES: Record<string, string> = {
  SYSTEM: 'bg-brand-50 border-brand-200',
  VERIFICATION: 'bg-emerald-50 border-emerald-200',
  PAYOUT: 'bg-blue-50 border-blue-200',
  ORDER_UPDATE: 'bg-amber-50 border-amber-200',
  REPORT: 'bg-red-50 border-red-200',
  DISPUTE: 'bg-violet-50 border-violet-200',
};

export default function AdminNotificationsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: AdminNotification[]; meta: any }>('/admin/notifications');
      setNotifications(res.data ?? []);
    } catch {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    fetchNotifications();
  }, [user, router, fetchNotifications]);

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiClient.post('/admin/notifications/read', { all: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* ignore */ } finally { setMarkingAll(false); }
  };

  const markRead = async (id: string) => {
    try {
      await apiClient.post('/admin/notifications/read', { ids: [id] });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch { /* ignore */ }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filtered = activeTab === 'all' ? notifications : activeTab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications.filter((n) => n.type === activeTab.toUpperCase());

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Bell className="h-6 w-6 text-brand-600" />
            Admin Notifications
            {unreadCount > 0 && <Badge variant="brand">{unreadCount} new</Badge>}
          </h1>
          <p className="mt-1 text-sm text-ink-500">Stay informed about platform events</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchNotifications}><RefreshCw className="mr-1.5 h-4 w-4" />Refresh</Button>
          {unreadCount > 0 && (
            <Button variant="brand" size="sm" onClick={markAllRead} disabled={markingAll}>
              {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="mr-1.5 h-4 w-4" />}
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <TabList>
            <Tab value="all">All</Tab>
            <Tab value="unread">Unread ({unreadCount})</Tab>
            <Tab value="verification">Verification</Tab>
            <Tab value="payout">Payout</Tab>
            <Tab value="order_update">Orders</Tab>
            <Tab value="system">System</Tab>
          </TabList>
        </Tabs>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-red-200 py-24 text-center">
          <Bell className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchNotifications}>Retry</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Bell className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No notifications</p>
          <p className="text-sm text-ink-500">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                'rounded-2xl border p-5 transition cursor-pointer',
                notification.isRead ? 'bg-white border-ink-100' : TYPE_STYLES[notification.type] || 'bg-brand-50/30 border-brand-200',
              )}
              onClick={() => markRead(notification.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', notification.isRead ? 'bg-ink-50' : 'bg-white')}>
                    {TYPE_ICONS[notification.type] || <Bell className="h-4 w-4 text-ink-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-sm font-medium', notification.isRead ? 'text-ink-700' : 'text-ink-900')}>{notification.title}</p>
                      {!notification.isRead && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-500">{notification.body}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-ink-400">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(notification.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {notification.user && <span>from {notification.user.displayName || notification.user.username}</span>}
                      <Badge variant="outline" className="text-[10px]">{notification.type}</Badge>
                    </div>
                  </div>
                </div>
                {!notification.isRead && (
                  <button onClick={(e) => { e.stopPropagation(); markRead(notification.id); }} className="shrink-0 rounded-full p-1 text-ink-400 hover:bg-ink-100">
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
