'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ShoppingCart, Loader2, Eye, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type Order = {
  id: string; orderNumber: string; status: string; totalPaise: number; createdAt: string;
  buyer: { id: string; username: string; displayName?: string; avatarUrl?: string };
  items: Array<{ id: string; quantity: number; product: { title: string; slug: string } }>;
  shippingAddress?: { city: string; state: string };
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURN_REQUESTED', label: 'Return requested' },
];

const ORDER_COLORS: Record<string, string> = {
  PLACED: 'bg-amber-100 text-amber-800', CONFIRMED: 'bg-blue-100 text-blue-800',
  PACKED: 'bg-indigo-100 text-indigo-800', SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800', CANCELLED: 'bg-red-100 text-red-800',
  RETURN_REQUESTED: 'bg-orange-100 text-orange-800', REFUNDED: 'bg-ink-100 text-ink-600',
};

export default function OrdersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('q', search);
      const res = await apiClient.get<{ data: Order[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(`/orders/seller?${params}`);
      setOrders(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
      setTotalPages(res.meta?.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchOrders();
  }, [user, fetchOrders, router]);

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Orders</h1>
          <p className="text-sm text-ink-500">{total} order{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search orders..." className="pl-9 h-10" />
        </div>
        <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} />
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-ink-100" />
              <div className="flex-1 space-y-2"><div className="h-4 w-40 rounded bg-ink-100" /><div className="h-3 w-24 rounded bg-ink-100" /></div>
              <div className="h-4 w-20 rounded bg-ink-100" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-16 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-ink-300" />
          <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">No orders yet</h3>
          <p className="mt-2 text-sm text-ink-500">Orders will appear here once buyers start purchasing.</p>
          <Link href="/seller/inventory"><Button variant="brand" className="mt-6">View your inventory</Button></Link>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-ink-100 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/50">
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Order</th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Buyer</th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Items</th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Total</th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Date</th>
                    <th className="w-20 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-ink-50 hover:bg-ink-50/50 transition">
                      <td className="px-4 py-3 font-medium text-ink-900">{o.orderNumber}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-ink-100 flex items-center justify-center text-xs font-semibold text-ink-600">
                            {o.buyer?.username?.slice(0, 2).toUpperCase() || '??'}
                          </div>
                          <span className="text-ink-700">{o.buyer?.username || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-500">{o.items?.length || 0} item{(o.items?.length || 0) !== 1 ? 's' : ''}</td>
                      <td className="px-4 py-3 font-medium text-ink-900">{formatINR(o.totalPaise)}</td>
                      <td className="px-4 py-3"><span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium', ORDER_COLORS[o.status] || 'bg-ink-100 text-ink-600')}>{o.status.replace(/_/g, ' ')}</span></td>
                      <td className="px-4 py-3 text-ink-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Link href={`/seller/orders/${o.id}`} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700 inline-block"><Eye className="h-4 w-4" /></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-ink-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
