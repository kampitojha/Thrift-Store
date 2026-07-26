'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Search, Loader2, ShoppingBag, Mail, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

type BuyerOrder = {
  id: string; orderNumber: string; status: string; totalPaise: number; createdAt: string;
  items: Array<{ id: string; quantity: number; product: { title: string } }>;
};

type Customer = {
  user: { id: string; username: string; displayName?: string; email?: string; avatarUrl?: string };
  orderCount: number; totalSpentPaise: number; lastOrderAt: string; firstOrderAt: string;
};

export default function CustomersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<BuyerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search) params.set('q', search);
      const res = await apiClient.get<{ data: Customer[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(`/sellers/customers?${params}`);
      setCustomers(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
      setTotalPages(res.meta?.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchCustomers();
  }, [user, fetchCustomers, router]);

  const viewCustomerOrders = async (c: Customer) => {
    setSelectedCustomer(c);
    setOrdersPage(1);
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '20');
      const res = await apiClient.get<{ data: BuyerOrder[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(`/sellers/customers/${c.user.id}/orders?${params}`);
      setCustomerOrders(res.data ?? []);
      setOrdersTotalPages(res.meta?.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load customer orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadMoreOrders = async () => {
    if (!selectedCustomer || ordersPage >= ordersTotalPages) return;
    const nextPage = ordersPage + 1;
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      params.set('limit', '20');
      const res = await apiClient.get<{ data: BuyerOrder[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(`/sellers/customers/${selectedCustomer.user.id}/orders?${params}`);
      setCustomerOrders((prev) => [...prev, ...(res.data ?? [])]);
      setOrdersPage(nextPage);
      setOrdersTotalPages(res.meta?.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load more orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Customers</h1>
          <p className="text-sm text-ink-500">{total} customer{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search customers..." className="pl-9 h-10" />
        </div>
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
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-16 text-center">
          <Users className="mx-auto h-12 w-12 text-ink-300" />
          <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">No customers yet</h3>
          <p className="mt-2 text-sm text-ink-500">Customers will appear here once buyers start purchasing from your store.</p>
          <Link href="/seller/inventory"><Button variant="brand" className="mt-6">View your inventory</Button></Link>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-ink-100 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/50">
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Orders</th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Total spent</th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">First order</th>
                    <th className="text-left px-4 py-3 font-medium text-ink-600">Last order</th>
                    <th className="w-20 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.user.id} className="border-b border-ink-50 hover:bg-ink-50/50 transition cursor-pointer" onClick={() => viewCustomerOrders(c)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-ink-100 flex items-center justify-center text-xs font-semibold text-ink-600">
                            {c.user.username?.slice(0, 2).toUpperCase() || '??'}
                          </div>
                          <div>
                            <span className="text-ink-900 font-medium">{c.user.displayName || c.user.username}</span>
                            {c.user.email && <p className="text-xs text-ink-400">{c.user.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-700 font-medium">{c.orderCount}</td>
                      <td className="px-4 py-3 font-medium text-ink-900">{formatINR(c.totalSpentPaise)}</td>
                      <td className="px-4 py-3 text-ink-500">{new Date(c.firstOrderAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-ink-500">{new Date(c.lastOrderAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); viewCustomerOrders(c); }}>
                          <ShoppingBag className="h-4 w-4" />
                        </Button>
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

      <Dialog open={!!selectedCustomer} onClose={() => { setSelectedCustomer(null); setCustomerOrders([]); }}>
        {selectedCustomer && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-ink-100 flex items-center justify-center text-sm font-semibold text-ink-600">
                    {selectedCustomer.user.username?.slice(0, 2).toUpperCase() || '?'}
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold">{selectedCustomer.user.displayName || selectedCustomer.user.username}</h2>
                    <p className="text-sm text-ink-500">{selectedCustomer.orderCount} orders · {formatINR(selectedCustomer.totalSpentPaise)} total</p>
                  </div>
                </div>
                {selectedCustomer.user.email && (
                  <a href={`mailto:${selectedCustomer.user.email}`} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100">
                    <Mail className="h-4 w-4" />
                  </a>
                )}
              </div>
            </DialogHeader>
            <DialogBody>
              {ordersLoading && customerOrders.length === 0 ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-ink-400" /></div>
              ) : customerOrders.length === 0 ? (
                <p className="text-center text-sm text-ink-400 py-8">No orders found.</p>
              ) : (
                <div className="divide-y divide-ink-50">
                  {customerOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between py-3">
                      <div>
                        <Link href={`/seller/orders/${o.id}`} className="font-medium text-ink-900 hover:text-brand-700">{o.orderNumber}</Link>
                        <p className="text-xs text-ink-500">{o.items.length} item{o.items.length !== 1 ? 's' : ''} · {new Date(o.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-ink-900">{formatINR(o.totalPaise)}</p>
                        <Badge variant={o.status === 'DELIVERED' ? 'success' : 'default'}>{o.status.replace(/_/g, ' ')}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {ordersTotalPages > 1 && ordersPage < ordersTotalPages && (
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm" onClick={loadMoreOrders} disabled={ordersLoading}>
                    {ordersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Load more orders
                  </Button>
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelectedCustomer(null); setCustomerOrders([]); }}>Close</Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  );
}
