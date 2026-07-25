'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Search, ChevronRight, Download, RotateCcw, Calendar, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient, PaginationMeta } from '@/lib/api';
import { formatINR, cn } from '@/lib/utils';

type OrderItem = {
  id: string;
  title: string;
  quantity: number;
  unitPricePaise: number;
  thumbnailUrl?: string;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalPaise: number;
  createdAt: string;
  items: OrderItem[];
};

const STATUS_FILTERS = [
  { value: '', label: 'All orders' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'RETURNED', label: 'Returned' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-ink-100 text-ink-600',
  RETURNED: 'bg-orange-100 text-orange-800',
};

export default function OrdersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [page, setPage] = useState(1);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('q', search);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (sortBy === 'total') params.set('sortBy', 'total');
      const res = await apiClient.get<{ data: Order[]; meta: PaginationMeta }>(
        `/orders/buyer/search?${params.toString()}`,
      );
      setOrders(res.data);
      setMeta(res.meta);
    } catch { setOrders([]); } finally { setLoading(false); }
  }, [user, page, statusFilter, search, fromDate, toDate, sortBy]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchOrders();
  }, [user, router, fetchOrders]);

  if (!user) return null;

  return (
    <div className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Orders</h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta ? `${meta.total} order${meta.total !== 1 ? 's' : ''}` : 'Track and manage your purchases'}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search orders or items…"
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          options={STATUS_FILTERS}
          className="w-40"
        />
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-ink-400" />
          <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="w-36" />
          <span className="text-ink-300">–</span>
          <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="w-36" />
        </div>
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          options={[{ value: 'date', label: 'Newest' }, { value: 'total', label: 'Highest value' }]}
          className="w-36"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Package className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">
            {search || statusFilter ? 'No matching orders' : 'No orders yet'}
          </p>
          <p className="mt-2 text-sm text-ink-500">
            {search || statusFilter
              ? 'Try a different search or filter.'
              : 'When you make a purchase, your orders will appear here.'}
          </p>
          <Link href="/browse">
            <Button variant="brand" className="mt-6">Start shopping</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:shadow-lift"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-ink-900">{order.orderNumber}</span>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium', STATUS_COLORS[order.status] || 'bg-ink-100 text-ink-600')}>
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {order.items.slice(0, 4).map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                            {item.thumbnailUrl && (
                              <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-ink-700">{item.title}</p>
                            <p className="text-xs text-ink-400">Qty {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                      {order.items.length > 4 && (
                        <p className="flex items-center text-xs text-ink-400">+{order.items.length - 4} more</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink-900">{formatINR(order.totalPaise)}</p>
                      <p className="text-xs text-ink-400">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-ink-300" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button variant="ghost" size="sm" disabled={!meta.hasPrev} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-ink-500">Page {meta.page} of {meta.totalPages}</span>
              <Button variant="ghost" size="sm" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
