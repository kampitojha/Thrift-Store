'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Loader2, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Eye, Star, Filter } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/tabs';

type Overview = {
  totalOrders: number; ordersLast30d: number; ordersLast7d: number;
  revenueLast30dPaise: number; viewsLast30d: number;
  conversionRate: number; averageOrderValue: number;
  rating: number; totalSales: number; totalRevenuePaise: number;
};

type RevenueDataPoint = { date: string; revenue: number; count: number };
type RevenueAnalytics = { period: string; data: RevenueDataPoint[]; totalRevenue: number; totalOrders: number };

type ProductPerf = { id: string; title: string; slug: string; images: string[]; soldCount: number; revenuePaise: number; views: number };
type TopProducts = { bestSellers: ProductPerf[]; worstPerforming: ProductPerf[] };

type CategoryPerf = { id: string; name: string; products: number; sold: number; revenue: number; active: number };

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function AnalyticsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [topProducts, setTopProducts] = useState<TopProducts | null>(null);
  const [categoryPerf, setCategoryPerf] = useState<CategoryPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('monthly');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, rev, top, cat] = await Promise.all([
        apiClient.get<Overview>('/sellers/analytics/overview'),
        apiClient.get<RevenueAnalytics>(`/sellers/analytics/revenue?period=${period}`),
        apiClient.get<TopProducts>('/sellers/analytics/top-products?limit=10'),
        apiClient.get<CategoryPerf[]>('/sellers/analytics/category-performance'),
      ]);
      setOverview(ov);
      setRevenue(rev);
      setTopProducts(top);
      setCategoryPerf(cat);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchData();
  }, [user, fetchData, router]);

  if (!user) return null;

  const maxRevenue = revenue?.data?.length ? Math.max(...revenue.data.map((d) => d.revenue), 1) : 1;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Analytics</h1>
          <p className="text-sm text-ink-500">Track your store&apos;s performance</p>
        </div>
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {loading && !overview ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-ink-100 animate-pulse" />
            ))}
          </div>
          <div className="h-80 rounded-2xl bg-ink-100 animate-pulse" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-2xl border border-ink-100 bg-white p-5">
              <div className="flex items-center gap-2 text-ink-400 mb-2"><DollarSign className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Revenue (30d)</span></div>
              <p className="font-display text-2xl font-semibold text-ink-900">{overview ? formatINR(overview.revenueLast30dPaise) : '—'}</p>
              <p className="text-xs text-ink-500 mt-1">Total: {overview ? formatINR(overview.totalRevenuePaise) : '—'}</p>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-5">
              <div className="flex items-center gap-2 text-ink-400 mb-2"><ShoppingCart className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Orders</span></div>
              <p className="font-display text-2xl font-semibold text-ink-900">{overview ? overview.ordersLast30d : '—'}</p>
              <p className="text-xs text-ink-500 mt-1">Last 7d: {overview?.ordersLast7d || 0} · Total: {overview?.totalOrders || 0}</p>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-5">
              <div className="flex items-center gap-2 text-ink-400 mb-2"><Eye className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Views (30d)</span></div>
              <p className="font-display text-2xl font-semibold text-ink-900">{overview ? overview.viewsLast30d.toLocaleString() : '—'}</p>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-5">
              <div className="flex items-center gap-2 text-ink-400 mb-2"><TrendingUp className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Conversion</span></div>
              <p className="font-display text-2xl font-semibold text-ink-900">{overview ? `${overview.conversionRate.toFixed(1)}%` : '—'}</p>
              <p className="text-xs text-ink-500 mt-1">Avg order: {overview ? formatINR(overview.averageOrderValue) : '—'}</p>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-5">
              <div className="flex items-center gap-2 text-ink-400 mb-2"><Star className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Rating</span></div>
              <p className="font-display text-2xl font-semibold text-ink-900">{overview ? overview.rating.toFixed(1) : '—'}</p>
              <p className="text-xs text-ink-500 mt-1">{overview?.totalSales || 0} total sales</p>
            </div>
          </div>

          <Tabs value={activeTab} onChange={setActiveTab}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <TabList>
                <Tab value="overview">Revenue</Tab>
                <Tab value="products">Products</Tab>
                <Tab value="categories">Categories</Tab>
              </TabList>
              <Select options={PERIODS} value={period} onChange={(e) => setPeriod(e.target.value)} className="w-36" />
            </div>

            <TabPanel value="overview">
              <div className="rounded-2xl border border-ink-100 bg-white p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-lg font-semibold text-ink-900">Revenue Trend ({period})</h2>
                  <p className="text-sm text-ink-500">Total: {revenue ? formatINR(revenue.totalRevenue) : '—'} · {revenue?.totalOrders || 0} orders</p>
                </div>
                {revenue?.data?.length ? (
                  <div className="space-y-2">
                    {revenue.data.map((point) => (
                      <div key={point.date} className="flex items-center gap-3">
                        <span className="text-xs text-ink-500 w-24 shrink-0">{new Date(point.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                        <div className="flex-1 h-8 bg-ink-50 rounded-lg overflow-hidden flex">
                          <div className="h-full bg-brand-500 rounded-lg transition-all duration-500" style={{ width: `${(point.revenue / maxRevenue) * 100}%` }} />
                        </div>
                        <span className="text-xs text-ink-700 w-20 text-right font-medium">{formatINR(point.revenue)}</span>
                        <span className="text-xs text-ink-400 w-10 text-right">{point.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-400 text-center py-12">No revenue data for this period.</p>
                )}
              </div>
            </TabPanel>

            <TabPanel value="products">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-ink-100 bg-white p-6">
                  <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> Best sellers</h2>
                  {topProducts?.bestSellers?.length ? (
                    <div className="divide-y divide-ink-50">
                      {topProducts.bestSellers.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          <span className="text-lg font-bold text-ink-200 w-6">{i + 1}</span>
                          <div className="h-10 w-10 rounded-lg bg-ink-100 overflow-hidden shrink-0">
                            {p.images?.[0] ? <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-ink-100" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink-900 truncate">{p.title}</p>
                            <p className="text-xs text-ink-500">{p.soldCount} sold · {formatINR(p.revenuePaise)}</p>
                          </div>
                          <span className="text-xs text-ink-400">{p.views} views</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-400 text-center py-8">No sales data yet.</p>
                  )}
                </div>
                <div className="rounded-2xl border border-ink-100 bg-white p-6">
                  <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" /> Worst performing</h2>
                  {topProducts?.worstPerforming?.length ? (
                    <div className="divide-y divide-ink-50">
                      {topProducts.worstPerforming.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          <span className="text-lg font-bold text-ink-200 w-6">{i + 1}</span>
                          <div className="h-10 w-10 rounded-lg bg-ink-100 overflow-hidden shrink-0">
                            {p.images?.[0] ? <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-ink-100" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink-900 truncate">{p.title}</p>
                            <p className="text-xs text-ink-500">{p.soldCount} sold · {formatINR(p.revenuePaise)}</p>
                          </div>
                          <span className="text-xs text-ink-400">{p.views} views</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-400 text-center py-8">No data available.</p>
                  )}
                </div>
              </div>
            </TabPanel>

            <TabPanel value="categories">
              <div className="rounded-2xl border border-ink-100 bg-white overflow-hidden">
                {categoryPerf.length === 0 ? (
                  <p className="text-sm text-ink-400 text-center py-12">No category data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/50">
                          <th className="text-left px-4 py-3 font-medium text-ink-600">Category</th>
                          <th className="text-right px-4 py-3 font-medium text-ink-600">Products</th>
                          <th className="text-right px-4 py-3 font-medium text-ink-600">Sold</th>
                          <th className="text-right px-4 py-3 font-medium text-ink-600">Revenue</th>
                          <th className="text-right px-4 py-3 font-medium text-ink-600">Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryPerf.map((c) => (
                          <tr key={c.id} className="border-b border-ink-50 hover:bg-ink-50/50 transition">
                            <td className="px-4 py-3 font-medium text-ink-900">{c.name}</td>
                            <td className="px-4 py-3 text-right text-ink-700">{c.products}</td>
                            <td className="px-4 py-3 text-right text-ink-700">{c.sold}</td>
                            <td className="px-4 py-3 text-right font-medium text-ink-900">{formatINR(c.revenue)}</td>
                            <td className="px-4 py-3 text-right">
                              <Badge variant={c.active > 0 ? 'success' : 'default'}>{c.active}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabPanel>
          </Tabs>
        </div>
      )}
    </div>
  );
}
