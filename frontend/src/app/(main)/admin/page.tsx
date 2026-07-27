'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  IndianRupee,
  TrendingUp,
  Users,
  Store,
  Package,
  ShoppingCart,
  RefreshCcw,
  AlertTriangle,
  FileText,
  Clock,
  ArrowUpRight,
  UserPlus,
  Tag,
  ChevronRight,
  Activity,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn, formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type DashboardData = {
  revenue: {
    gmv: number;
    gmvToday: number;
    gmvMonth: number;
    commission: number;
  };
  users: {
    total: number;
    active: number;
    newToday: number;
    newThisMonth: number;
  };
  sellers: {
    total: number;
    pending: number;
    verified: number;
  };
  products: {
    total: number;
    pending: number;
    newToday: number;
    active: number;
  };
  orders: {
    total: number;
    today: number;
    pending: number;
    cancelled: number;
  };
  pending: {
    refunds: number;
    payouts: number;
    disputes: number;
    reports: number;
    tickets: number;
  };
  topCategories: Array<{ id: string; name: string; slug: string; _count: { products: number } }>;
  topSellers: Array<{ id: string; storeName: string; storeSlug: string; totalSales: number; rating: number; userId: string; _count: { payouts: number } }>;
  recentUsers: Array<{ id: string; username: string; displayName?: string; avatarUrl?: string; role: string; createdAt: string }>;
};

function DashboardSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isHydrated) return;
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return;

    apiClient
      .get<DashboardData>('/admin/dashboard')
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load dashboard');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, isHydrated]);

  if (loading || !isHydrated) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">Failed to load dashboard</p>
          <p className="mt-1 text-sm text-ink-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const gmv = Number(data.revenue.gmv) || 0;
  const gmvToday = Number(data.revenue.gmvToday) || 0;
  const gmvMonth = Number(data.revenue.gmvMonth) || 0;
  const commission = Number(data.revenue.commission) || 0;

  const revenueCards = [
    {
      label: 'Total GMV',
      value: formatINR(gmv),
      sub: 'All time',
      icon: IndianRupee,
      color: 'bg-brand-50 text-brand-700',
      iconBg: 'bg-brand-100',
    },
    {
      label: 'Today',
      value: formatINR(gmvToday),
      sub: 'Revenue today',
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-700',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'This Month',
      value: formatINR(gmvMonth),
      sub: 'This month',
      icon: Activity,
      color: 'bg-blue-50 text-blue-700',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Commission',
      value: formatINR(commission),
      sub: 'Platform earnings',
      icon: Tag,
      color: 'bg-amber-50 text-amber-700',
      iconBg: 'bg-amber-100',
    },
  ];

  const userCards = [
    { label: 'Total Users', value: data.users.total.toLocaleString('en-IN'), icon: Users },
    { label: 'Active', value: data.users.active.toLocaleString('en-IN'), icon: Activity },
    { label: 'New Today', value: data.users.newToday.toLocaleString('en-IN'), icon: UserPlus },
    { label: 'New This Month', value: data.users.newThisMonth.toLocaleString('en-IN'), icon: TrendingUp },
  ];

  const sellerCards = [
    { label: 'Total Sellers', value: data.sellers.total, icon: Store, link: '/admin/sellers' },
    { label: 'Pending Verification', value: data.sellers.pending, icon: Clock, link: '/admin/sellers', highlight: true },
    { label: 'Verified', value: data.sellers.verified, icon: ShieldCheck, link: '/admin/sellers' },
  ];

  const productCards = [
    { label: 'Total Products', value: data.products.total, icon: Package, link: '/admin/products' },
    { label: 'Pending Review', value: data.products.pending, icon: Clock, link: '/admin/products', highlight: true },
    { label: 'Active', value: data.products.active, icon: Tag, link: '/admin/products' },
  ];

  const orderCards = [
    { label: 'Total Orders', value: data.orders.total, icon: ShoppingCart, link: '/admin/orders' },
    { label: 'Today', value: data.orders.today, icon: TrendingUp, link: '/admin/orders' },
    { label: 'Pending', value: data.orders.pending, icon: Clock, link: '/admin/orders', highlight: true },
    { label: 'Cancelled', value: data.orders.cancelled, icon: RefreshCcw, link: '/admin/orders' },
  ];

  const actionItems = [
    { label: 'Refund Requests', value: data.pending.refunds, href: '/admin/refunds', icon: RefreshCcw },
    { label: 'Pending Payouts', value: data.pending.payouts, href: '/admin/payouts', icon: IndianRupee },
    { label: 'Open Disputes', value: data.pending.disputes, href: '/admin/disputes', icon: ShieldCheck },
    { label: 'Reports', value: data.pending.reports, href: '/admin/reports', icon: FileText },
    { label: 'Support Tickets', value: data.pending.tickets, href: '/admin/audit', icon: AlertTriangle },
  ];

  const totalPendingActions = actionItems.reduce((sum, a) => sum + a.value, 0);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Overview of platform health and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/finance">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4" />
              Finance
            </Button>
          </Link>
        </div>
      </div>

      {/* Revenue Cards */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <IndianRupee className="h-3.5 w-3.5" />
          Revenue
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {revenueCards.map((card) => (
            <div
              key={card.label}
              className={cn(
                'rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:shadow-lift',
              )}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-ink-900">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">{card.sub}</p>
                </div>
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', card.iconBg)}>
                  <card.icon className={cn('h-5 w-5', card.color.replace('bg-', 'text-').split(' ')[1] || 'text-brand-600')} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* User Stats */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <Users className="h-3.5 w-3.5" />
          Users
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {userCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
                  {card.label}
                </p>
                <card.icon className="h-4 w-4 text-ink-300" />
              </div>
              <p className="mt-2 text-2xl font-bold text-ink-900">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Seller & Product Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
              <Store className="h-3.5 w-3.5" />
              Sellers
            </h2>
            <Link href="/admin/sellers" className="text-xs font-medium text-brand-600 hover:underline flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {sellerCards.map((card) => (
              <Link
                key={card.label}
                href={card.link}
                className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:shadow-lift hover:border-brand-200"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
                  {card.label}
                </p>
                <div className="mt-2 flex items-end justify-between">
                  <p className={cn('text-2xl font-bold', card.highlight ? 'text-amber-600' : 'text-ink-900')}>
                    {card.value}
                  </p>
                  <ArrowUpRight className="h-4 w-4 text-ink-300" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
              <Package className="h-3.5 w-3.5" />
              Products
            </h2>
            <Link href="/admin/products" className="text-xs font-medium text-brand-600 hover:underline flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {productCards.map((card) => (
              <Link
                key={card.label}
                href={card.link}
                className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:shadow-lift hover:border-brand-200"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
                  {card.label}
                </p>
                <div className="mt-2 flex items-end justify-between">
                  <p className={cn('text-2xl font-bold', card.highlight ? 'text-amber-600' : 'text-ink-900')}>
                    {card.value}
                  </p>
                  <ArrowUpRight className="h-4 w-4 text-ink-300" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Order Stats */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
            <ShoppingCart className="h-3.5 w-3.5" />
            Orders
          </h2>
          <Link href="/admin/orders" className="text-xs font-medium text-brand-600 hover:underline flex items-center gap-1">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {orderCards.map((card) => (
            <Link
              key={card.label}
              href={card.link}
              className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:shadow-lift hover:border-brand-200"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
                  {card.label}
                </p>
                <card.icon className="h-4 w-4 text-ink-300" />
              </div>
              <div className="mt-2 flex items-end justify-between">
                <p className={cn('text-2xl font-bold', card.highlight ? 'text-amber-600' : 'text-ink-900')}>
                  {card.value}
                </p>
                <ArrowUpRight className="h-4 w-4 text-ink-300" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Pending Actions */}
      {totalPendingActions > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
            <Clock className="h-3.5 w-3.5" />
            Pending Actions
            <Badge variant="brand">{totalPendingActions}</Badge>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {actionItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft transition hover:shadow-lift hover:border-brand-200"
              >
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  item.value > 0 ? 'bg-amber-100' : 'bg-ink-50',
                )}>
                  <item.icon className={cn('h-5 w-5', item.value > 0 ? 'text-amber-600' : 'text-ink-400')} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-ink-500">{item.label}</p>
                  <p className={cn('text-lg font-bold', item.value > 0 ? 'text-amber-600' : 'text-ink-900')}>
                    {item.value}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bottom 3-column section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Categories */}
        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-ink-900">Top Categories</h3>
          </div>
          {data.topCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">No category data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topCategories.slice(0, 6).map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-xs font-semibold text-ink-500">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">{cat.name}</p>
                    <p className="text-xs text-ink-400">
                      {cat._count.products} products
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top Sellers */}
        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-ink-900">Top Sellers</h3>
            <Link href="/admin/sellers" className="text-xs font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {data.topSellers.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">No seller data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topSellers.slice(0, 6).map((seller, i) => (
                <div key={seller.id} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-xs font-semibold text-ink-500">
                    {i + 1}
                  </span>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-200 text-xs font-semibold text-ink-600">
                    {seller.storeName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">{seller.storeName}</p>
                    <p className="text-xs text-ink-400">{seller.totalSales} sales</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Users */}
        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-ink-900">Recent Users</h3>
            <Link href="/admin/users" className="text-xs font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {data.recentUsers.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">No users yet</p>
          ) : (
            <div className="space-y-3">
              {data.recentUsers.slice(0, 6).map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-200 text-xs font-semibold text-ink-600">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      u.username.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">
                      {u.displayName || u.username}
                    </p>
                    <p className="text-xs text-ink-400">@{u.username}</p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        u.role === 'SUPER_ADMIN'
                          ? 'brand'
                          : u.role === 'ADMIN'
                            ? 'outline'
                            : u.role === 'SELLER'
                              ? 'success'
                              : 'default'
                      }
                    >
                      {u.role.toLowerCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
