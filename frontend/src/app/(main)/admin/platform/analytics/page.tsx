'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  CreditCard,
  Store,
  Package,
  RefreshCcw,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Percent,
  Target,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn, formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type AnalyticsData = {
  revenue: { total: number; thisMonth: number; lastMonth: number; growth: string };
  orders: { total: number; thisMonth: number; lastMonth: number; growth: string };
  users: { total: number; newToday: number; newThisMonth: number; growth: string };
  sellers: { total: number; active: number };
  products: { total: number };
  refunds: { thisMonth: number };
  payouts: { thisMonth: number };
  conversions: { rate: string; visitors: number; orders: number };
  topCategories: Array<{ name: string; productCount: number; revenuePaise: number }>;
  topSellers: Array<{ id: string; storeName: string; revenuePaise: number }>;
  period: { start: string; end: string };
};

function TrendBadge({ value, reverse }: { value: string; reverse?: boolean }) {
  const num = parseFloat(value);
  if (isNaN(num) || num === 0) {
    return <span className="text-sm text-ink-400">{value}</span>;
  }
  const isPositive = reverse ? num < 0 : num > 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-sm font-medium',
        isPositive ? 'text-emerald-600' : 'text-red-600',
      )}
    >
      <Icon className="h-4 w-4" />
      {value}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: React.ReactNode;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
        <Skeleton className="mb-3 h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-20" />
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="mb-2 flex items-center gap-2 text-ink-400">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-display text-2xl font-semibold text-ink-900">{value}</p>
      {trend && <div className="mt-1">{trend}</div>}
    </div>
  );
}

export default function AdminPlatformAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<AnalyticsData>('/admin/platform/analytics');
      setData(res);
    } catch {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-brand-600" />
            Platform Analytics
          </h1>
          {data && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
              <Clock className="h-3.5 w-3.5" />
              {new Date(data.period.start).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {' — '}
              {new Date(data.period.end).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
          <RefreshCcw className={cn('mr-1.5 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {loading && !data ? (
        <div role="status" aria-busy="true" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCard key={i} icon={null} label="" value="" loading />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <StatCard key={i} icon={null} label="" value="" loading />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchAnalytics}>
            Try Again
          </Button>
        </div>
      ) : !data ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No analytics data available</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Revenue Highlight Card */}
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-ink-400">
                  <IndianRupee className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Total Revenue</span>
                </div>
                <p className="font-display text-3xl font-bold text-ink-900">
                  {formatINR(data.revenue.total)}
                </p>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <span className="text-ink-500">This month: {formatINR(data.revenue.thisMonth)}</span>
                  <span className="text-ink-300">|</span>
                  <span className="text-ink-500">Last month: {formatINR(data.revenue.lastMonth)}</span>
                </div>
              </div>
              <div className="rounded-xl bg-ink-50 px-4 py-2">
                <TrendBadge value={data.revenue.growth} />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<ShoppingCart className="h-4 w-4" />}
              label="Total Orders"
              value={data.orders.total.toLocaleString('en-IN')}
              trend={
                <span className="flex items-center gap-1 text-xs text-ink-400">
                  This month: {data.orders.thisMonth.toLocaleString('en-IN')}
                </span>
              }
            />
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="Total Users"
              value={data.users.total.toLocaleString('en-IN')}
              trend={
                <span className="flex items-center gap-1 text-xs text-ink-400">
                  New today: {data.users.newToday}
                </span>
              }
            />
            <StatCard
              icon={<Store className="h-4 w-4" />}
              label="Active Sellers"
              value={data.sellers.active.toLocaleString('en-IN')}
              trend={
                <span className="flex items-center gap-1 text-xs text-ink-400">
                  Total: {data.sellers.total.toLocaleString('en-IN')}
                </span>
              }
            />
            <StatCard
              icon={<Package className="h-4 w-4" />}
              label="Total Products"
              value={data.products.total.toLocaleString('en-IN')}
            />
          </div>

          {/* Growth Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Revenue Growth"
              value={`${data.revenue.thisMonth.toLocaleString('en-IN')} orders`}
              trend={<TrendBadge value={data.revenue.growth} />}
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Order Growth"
              value={`${data.orders.thisMonth.toLocaleString('en-IN')} orders`}
              trend={<TrendBadge value={data.orders.growth} />}
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="User Growth"
              value={`${data.users.newThisMonth.toLocaleString('en-IN')} new this month`}
              trend={<TrendBadge value={data.users.growth} />}
            />
          </div>

          {/* Conversion + Financials */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={<Target className="h-4 w-4" />}
              label="Conversion Rate"
              value={data.conversions.rate}
              trend={
                <span className="flex items-center gap-2 text-xs text-ink-400">
                  <span>{data.conversions.visitors.toLocaleString('en-IN')} visitors</span>
                  <span className="text-ink-300">|</span>
                  <span>{data.conversions.orders.toLocaleString('en-IN')} orders</span>
                </span>
              }
            />
            <StatCard
              icon={<CreditCard className="h-4 w-4" />}
              label="Refunds This Month"
              value={formatINR(data.refunds.thisMonth)}
            />
            <StatCard
              icon={<IndianRupee className="h-4 w-4" />}
              label="Payouts This Month"
              value={formatINR(data.payouts.thisMonth)}
            />
          </div>

          {/* Top Categories Table */}
          <div className="rounded-2xl border border-ink-100 bg-white shadow-soft overflow-hidden">
            <div className="border-b border-ink-100 px-5 py-4">
              <h2 className="font-display text-base font-semibold text-ink-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-brand-600" />
                Top Categories
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500 w-12">#</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Category</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-500">Products</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-500">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data.topCategories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-sm text-ink-400">
                        No category data available
                      </td>
                    </tr>
                  ) : (
                    data.topCategories.map((cat, i) => (
                      <tr key={cat.name} className="hover:bg-ink-50/50 transition">
                        <td className="px-5 py-3 text-ink-400">{i + 1}</td>
                        <td className="px-5 py-3 font-medium text-ink-900">{cat.name}</td>
                        <td className="px-5 py-3 text-right text-ink-700">{cat.productCount}</td>
                        <td className="px-5 py-3 text-right font-medium text-ink-900">{formatINR(cat.revenuePaise)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Sellers Table */}
          <div className="rounded-2xl border border-ink-100 bg-white shadow-soft overflow-hidden">
            <div className="border-b border-ink-100 px-5 py-4">
              <h2 className="font-display text-base font-semibold text-ink-900 flex items-center gap-2">
                <Store className="h-4 w-4 text-brand-600" />
                Top Sellers
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500 w-12">#</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Store</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-500">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data.topSellers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-center text-sm text-ink-400">
                        No seller data available
                      </td>
                    </tr>
                  ) : (
                    data.topSellers.map((seller, i) => (
                      <tr key={seller.id} className="hover:bg-ink-50/50 transition">
                        <td className="px-5 py-3 text-ink-400">{i + 1}</td>
                        <td className="px-5 py-3 font-medium text-ink-900">{seller.storeName}</td>
                        <td className="px-5 py-3 text-right font-medium text-ink-900">{formatINR(seller.revenuePaise)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
