'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Package, TrendingUp, DollarSign, Star, Eye, Clock, ShoppingBag, Users, Store, Wallet,
  BarChart3, Heart, MessageSquare, Bell, AlertTriangle, RefreshCw, ArrowUpRight, Loader2, CheckCircle2, XCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type DashboardData = {
  store: { storeName: string; storeSlug: string; totalSales: number; rating: number; storeDescription?: string };
  wallet: { balancePaise: string; heldPaise: string } | null;
  viewsLast30d: number;
  revenuePaise: string;
  totalSales: number;
  rating: number;
  recentOrders: Array<{ id: string; orderNumber: string; status: string; totalPaise: number; createdAt: string; buyer?: { username: string; avatarUrl?: string }; items?: Array<{ id: string; quantity: number }> }>;
  productsByStatus: Array<{ status: string; _count: number }>;
  ordersByStatus: Array<{ status: string; _count: number; _sum: { totalPaise: number | null } }>;
  analytics?: { totalOrders: number; ordersLast30d: number; ordersLast7d: number; revenueLast30dPaise: number; viewsLast30d: number; conversionRate: string; averageOrderValue: number };
  inventoryAlerts?: { lowStock: Array<{ id: string; title: string; quantity: number; pricePaise: number; thumbnailUrl: string | null }>; outOfStockCount: number; reservedCount: number };
  followersCount?: number;
  reviewsCount?: number;
  unreadMessages?: number;
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800', DRAFT: 'bg-ink-100 text-ink-600', PENDING_REVIEW: 'bg-amber-100 text-amber-800',
  RESERVED: 'bg-blue-100 text-blue-800', SOLD: 'bg-violet-100 text-violet-800', ARCHIVED: 'bg-ink-100 text-ink-500', REJECTED: 'bg-red-100 text-red-800',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-amber-100 text-amber-800', CONFIRMED: 'bg-blue-100 text-blue-800', PACKED: 'bg-indigo-100 text-indigo-800',
  SHIPPED: 'bg-purple-100 text-purple-800', DELIVERED: 'bg-emerald-100 text-emerald-800', CANCELLED: 'bg-red-100 text-red-800', REFUNDED: 'bg-ink-100 text-ink-600',
};

export default function SellerDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    Promise.all([
      apiClient.get<DashboardData>('/sellers/dashboard'),
      apiClient.get<any>('/sellers/analytics/overview').catch(() => null),
      apiClient.get<any>('/sellers/inventory/alerts').catch(() => null),
    ]).then(([dash, analytics, alerts]) => {
      setData({ ...dash, analytics, inventoryAlerts: alerts });
      setLoading(false);
    }).catch((e) => { setError(e.message); setLoading(false); });
  }, [user, router]);

  if (!user) return null;

  const totalProducts = data?.productsByStatus?.reduce((s, p) => s + p._count, 0) ?? 0;
  const activeProducts = data?.productsByStatus?.find((p) => p.status === 'ACTIVE')?._count ?? 0;
  const draftProducts = data?.productsByStatus?.find((p) => p.status === 'DRAFT')?._count ?? 0;
  const pendingOrders = data?.ordersByStatus?.find((o) => o.status === 'PLACED')?._count ?? 0;
  const deliveredOrders = data?.ordersByStatus?.find((o) => o.status === 'DELIVERED')?._count ?? 0;
  const cancelledOrders = data?.ordersByStatus?.find((o) => o.status === 'CANCELLED')?._count ?? 0;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-ink-400" /></div>;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Seller hub</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{data?.store?.storeName || 'Dashboard'}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {data?.store?.storeSlug && (
              <Link href={`/store/${data.store.storeSlug}`} className="text-brand-700 hover:underline inline-flex items-center gap-1">
                /store/{data.store.storeSlug} <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/seller/reports"><Button variant="outline" size="sm"><BarChart3 className="mr-2 h-4 w-4" />Reports</Button></Link>
          <Link href="/seller/settings"><Button variant="outline" size="sm"><Store className="mr-2 h-4 w-4" />Store settings</Button></Link>
          <Link href="/sell"><Button variant="brand"><Plus className="mr-2 h-4 w-4" />New listing</Button></Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-medium text-amber-900">Become a seller to unlock the dashboard</p>
          <p className="mt-1 text-sm text-amber-800">{error}</p>
          <Link href="/seller/onboarding"><Button size="sm" className="mt-4">Create your store</Button></Link>
        </div>
      )}

      {data && (
        <>
          {/* Score card */}
          {data.analytics && (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard icon={DollarSign} label="Revenue (30d)" value={formatINR(data.analytics.revenueLast30dPaise)} sub={`${data.analytics.totalOrders} total orders`} color="emerald" />
              <StatCard icon={ShoppingBag} label="Orders (30d)" value={String(data.analytics.ordersLast30d)} sub={`${data.analytics.ordersLast7d} this week`} color="blue" />
              <StatCard icon={Eye} label="Views (30d)" value={String(data.analytics.viewsLast30d)} sub={`${data.analytics.conversionRate}% conversion`} color="violet" />
              <StatCard icon={TrendingUp} label="Avg order value" value={formatINR(data.analytics.averageOrderValue)} sub="Per order" color="amber" />
              <StatCard icon={Star} label="Rating" value={(data.rating || 0).toFixed(1)} sub={`${data.totalSales || 0} sales`} color="brand" />
            </div>
          )}

          {/* Quick actions row */}
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <QuickAction href="/seller/inventory" icon={Package} label="Inventory" sub={`${activeProducts} active · ${draftProducts} drafts`} />
            <QuickAction href="/seller/orders" icon={ShoppingBag} label="Orders" sub={`${pendingOrders} pending · ${deliveredOrders} delivered`} />
            <QuickAction href="/seller/analytics" icon={BarChart3} label="Analytics" sub="Revenue, traffic, insights" />
            <QuickAction href="/seller/payouts" icon={Wallet} label="Payouts" sub={data.wallet ? `${formatINR(Number(data.wallet.balancePaise))} available` : 'Set up payouts'} />
          </div>

          {/* Inventory alerts */}
          {data.inventoryAlerts && (data.inventoryAlerts.lowStock.length > 0 || data.inventoryAlerts.outOfStockCount > 0) && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-900 font-medium mb-2"><AlertTriangle className="h-4 w-4" />Inventory alerts</div>
              <div className="flex flex-wrap gap-4 text-sm text-amber-800">
                {data.inventoryAlerts.lowStock.length > 0 && <span>{data.inventoryAlerts.lowStock.length} low stock items</span>}
                {data.inventoryAlerts.outOfStockCount > 0 && <span>{data.inventoryAlerts.outOfStockCount} out of stock</span>}
                {data.inventoryAlerts.reservedCount > 0 && <span>{data.inventoryAlerts.reservedCount} reserved</span>}
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Inventory by Status */}
            <div className="rounded-2xl border border-ink-100 bg-white p-6">
              <h2 className="font-semibold mb-4">Inventory by status</h2>
              <div className="space-y-3">
                {data.productsByStatus.map((p) => {
                  const maxCount = Math.max(...data.productsByStatus.map((x) => x._count), 1);
                  return (
                    <div key={p.status}>
                      <div className="flex items-center justify-between text-sm">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[p.status])}>{p.status.replace(/_/g, ' ')}</span>
                        <span className="font-medium text-ink-900">{p._count}</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full rounded-full bg-ink-100"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(p._count / maxCount) * 100}%` }} /></div>
                    </div>
                  );
                })}
                {data.productsByStatus.length === 0 && <p className="text-sm text-ink-400 py-4">No products yet.</p>}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="rounded-2xl border border-ink-100 bg-white p-6">
              <h2 className="font-semibold mb-4">Recent orders</h2>
              <div className="space-y-2">
                {data.recentOrders.slice(0, 8).map((o) => (
                  <Link key={o.id} href={`/seller/orders/${o.id}`} className="flex items-center justify-between rounded-xl bg-ink-50/50 px-4 py-3 hover:bg-ink-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-600">
                        {o.buyer?.username?.slice(0, 2).toUpperCase() || '??'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink-900">{o.orderNumber}</p>
                        <p className="text-xs text-ink-500">{o.buyer?.username || 'Unknown'} · {formatINR(o.totalPaise)}</p>
                      </div>
                    </div>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium', ORDER_STATUS_COLORS[o.status] || 'bg-ink-100 text-ink-600')}>{o.status}</span>
                  </Link>
                ))}
                {data.recentOrders.length === 0 && (
                  <div className="py-8 text-center text-sm text-ink-500">No orders yet</div>
                )}
              </div>
              <Link href="/seller/orders" className="mt-4 block text-sm font-medium text-brand-700 hover:underline">View all orders →</Link>
            </div>

            {/* Revenue by Status */}
            <div className="rounded-2xl border border-ink-100 bg-white p-6">
              <h2 className="font-semibold mb-4">Revenue by status</h2>
              {data.ordersByStatus.filter((o) => o._sum.totalPaise).map((o) => {
                const amounts = data.ordersByStatus.filter((x) => x._sum.totalPaise).map((x) => x._sum.totalPaise!);
                const maxAmount = Math.max(...amounts, 1);
                return (
                  <div key={o.status} className="mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', ORDER_STATUS_COLORS[o.status])}>{o.status}</span>
                      <span className="font-medium text-ink-900">{formatINR(o._sum.totalPaise || 0)}</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full rounded-full bg-ink-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${((o._sum.totalPaise || 0) / maxAmount) * 100}%` }} /></div>
                    <p className="text-right text-xs text-ink-400">{o._count} order{o._count !== 1 ? 's' : ''}</p>
                  </div>
                );
              })}
              {!data.ordersByStatus.some((o) => o._sum.totalPaise) && <p className="py-8 text-center text-sm text-ink-400">No revenue data yet.</p>}
            </div>

            {/* Wallet */}
            <div className="rounded-2xl border border-ink-100 bg-white p-6">
              <h2 className="font-semibold mb-4">Wallet</h2>
              {data.wallet ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-white">
                    <p className="text-xs font-medium uppercase tracking-wider text-white/80">Available balance</p>
                    <p className="mt-2 text-3xl font-bold">{formatINR(Number(data.wallet.balancePaise))}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm"><span className="text-ink-500">On hold</span><span className="font-medium text-ink-900">{formatINR(Number(data.wallet.heldPaise))}</span></div>
                  <Link href="/seller/payouts"><Button variant="brand" size="sm" className="w-full">Request payout</Button></Link>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-ink-500">No wallet yet. Earnings will appear here once you make a sale.</div>
              )}
            </div>
          </div>

          {/* Store URL share */}
          <div className="mt-8 rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center">
            <Store className="mx-auto h-8 w-8 text-ink-300" />
            <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">Share your store</h3>
            <p className="mt-2 text-sm text-ink-500 mb-4">Copy your store link and share it with the world.</p>
            {data?.store?.storeSlug && (
              <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
                <input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/store/${data.store.storeSlug}`}
                  className="flex-1 rounded-xl border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm text-ink-600"
                  onClick={(e) => (e.target as HTMLInputElement).select()} />
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/store/${data.store.storeSlug}`)}>Copy</Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = { emerald: 'bg-emerald-50 text-emerald-700', blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', violet: 'bg-violet-50 text-violet-700', brand: 'bg-brand-50 text-brand-700' };
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 transition hover:shadow-lift">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</p>
        <div className={cn('rounded-xl p-2', colorMap[color] || colorMap.brand)}><Icon className="h-4 w-4" /></div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-900">{value}</p>
      <p className="mt-1 text-xs text-ink-500">{sub}</p>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, sub }: { href: string; icon: any; label: string; sub: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 transition hover:shadow-lift">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50"><Icon className="h-6 w-6 text-brand-700" /></div>
      <div className="min-w-0"><p className="font-medium text-ink-900 truncate">{label}</p><p className="text-sm text-ink-500 truncate">{sub}</p></div>
    </Link>
  );
}
