'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TrendingUp, Users, ShoppingCart, DollarSign, BarChart3, RefreshCcw, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

type GrowthMetrics = {
  users: { current: number; previous: number; growth: number };
  orders: { current: number; previous: number; growth: number };
  revenue: { current: number; previous: number; growth: number };
  sellers: { current: number; previous: number; growth: number };
};

type RetentionMetrics = {
  totalUsers: number; activeUsers: number; activeRate: number; returningUsers: number; retentionRate: number;
  cohorts: Array<{ period: string; users: number; active: number; retention: number }>;
};

type FunnelData = {
  funnel: Array<{ stage: string; count: number; dropOff: number }>;
  conversion: number;
};

export default function AdminGrowthPage() {
  const [growth, setGrowth] = useState<GrowthMetrics | null>(null);
  const [retention, setRetention] = useState<RetentionMetrics | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      apiClient.get<GrowthMetrics>('/growth/analytics/growth'),
      apiClient.get<RetentionMetrics>('/growth/analytics/retention?days=90'),
      apiClient.get<FunnelData>('/growth/analytics/funnel'),
    ])
      .then(([g, r, f]) => { setGrowth(g); setRetention(r); setFunnel(f); })
      .catch(() => setError('Failed to load growth data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-brand-600" /> Growth Analytics
          </h1>
          <p className="mt-1 text-sm text-ink-500">Platform growth, retention, and conversion metrics</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}><RefreshCcw className="mr-1.5 h-4 w-4" /> Refresh</Button>
      </div>

      {/* Growth Metrics */}
      {growth && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'New Users', current: growth.users.current, prev: growth.users.previous, growth: growth.users.growth, icon: Users, format: (v: number) => v.toLocaleString('en-IN') },
            { label: 'Orders', current: growth.orders.current, prev: growth.orders.previous, growth: growth.orders.growth, icon: ShoppingCart, format: (v: number) => v.toLocaleString('en-IN') },
            { label: 'Revenue', current: growth.revenue.current, prev: growth.revenue.previous, growth: growth.revenue.growth, icon: DollarSign, format: (v: number) => `₹${(v / 100).toLocaleString('en-IN')}` },
            { label: 'New Sellers', current: growth.sellers.current, prev: growth.sellers.previous, growth: growth.sellers.growth, icon: Users, format: (v: number) => v.toLocaleString('en-IN') },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{card.label}</p>
                <card.icon className="h-4 w-4 text-ink-300" />
              </div>
              <p className="text-2xl font-bold text-ink-900">{card.format(card.current)}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {card.growth > 0 ? <ArrowUp className="h-3.5 w-3.5 text-emerald-500" /> : <ArrowDown className="h-3.5 w-3.5 text-red-500" />}
                <span className={cn('text-xs font-medium', card.growth > 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {Math.abs(card.growth).toFixed(1)}%
                </span>
                <span className="text-xs text-ink-400">vs previous period</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Retention */}
      {retention && (
        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4"><Users className="h-3.5 w-3.5" /> Retention</h2>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div><p className="text-xs text-ink-400">Total Users</p><p className="text-xl font-bold text-ink-900">{retention.totalUsers.toLocaleString('en-IN')}</p></div>
            <div><p className="text-xs text-ink-400">Active (7d)</p><p className="text-xl font-bold text-emerald-600">{retention.activeUsers.toLocaleString('en-IN')} <span className="text-sm font-normal text-ink-400">({retention.activeRate}%)</span></p></div>
            <div><p className="text-xs text-ink-400">Retention Rate</p><p className="text-xl font-bold text-brand-600">{retention.retentionRate}%</p></div>
          </div>
          {retention.cohorts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-ink-400 mb-2">Weekly Cohorts</p>
              <div className="space-y-1">
                {retention.cohorts.slice(0, 8).map((c) => (
                  <div key={c.period} className="flex items-center gap-3">
                    <span className="text-xs text-ink-500 w-20">{c.period}</span>
                    <div className="flex-1 h-5 rounded bg-ink-50 overflow-hidden">
                      <div className="h-full rounded bg-brand-500 transition-all" style={{ width: `${c.retention}%` }} />
                    </div>
                    <span className="text-xs font-medium text-ink-600 w-12 text-right">{c.retention}%</span>
                    <span className="text-xs text-ink-400 w-16 text-right">{c.active}/{c.users}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Funnel */}
      {funnel && (
        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4"><BarChart3 className="h-3.5 w-3.5" /> Conversion Funnel</h2>
          <div className="space-y-2">
            {funnel.funnel.map((stage, i) => (
              <div key={stage.stage} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32">
                  <span className={cn('w-2 h-2 rounded-full', i === 0 ? 'bg-brand-500' : stage.dropOff > 50 ? 'bg-red-400' : 'bg-emerald-400')} />
                  <span className="text-sm font-medium text-ink-700">{stage.stage}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-6 rounded-lg bg-ink-50 overflow-hidden">
                      <div className="h-full rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 transition-all" style={{ width: `${funnel.funnel[0].count > 0 ? (stage.count / funnel.funnel[0].count) * 100 : 0}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-ink-900 w-24 text-right">{stage.count.toLocaleString('en-IN')}</span>
                    {i > 0 && <span className="text-xs text-red-500 w-16 text-right">-{stage.dropOff}%</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-ink-100">
            <p className="text-sm text-ink-500">Overall conversion: <span className="font-bold text-brand-600">{funnel.conversion}%</span></p>
          </div>
        </section>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-8" role="status" aria-busy="true">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-4"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6" role="alert">
      <div className="text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
        <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Retry</Button>
      </div>
    </div>
  );
}
