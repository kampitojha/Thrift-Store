'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Truck, MapPin, Calendar, Loader2, ExternalLink, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type Carrier = {
  id: string; label: string; supportedServices: string[];
  hasPickup: boolean; hasTracking: boolean; hasLabelGeneration: boolean; website: string;
};

type ShipmentInfo = {
  id: string; carrier: string | null; trackingNumber: string | null;
  trackingUrl: string | null; status: string | null; estimatedDelivery: string | null;
  shippedAt: string | null;
};

type Order = {
  id: string; orderNumber: string; status: string; totalPaise: number; createdAt: string;
  items: Array<{ id: string; title: string; quantity: number; thumbnailUrl?: string }>;
  shipments: ShipmentInfo[];
};

export default function SellerShippingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PACKED');
  const [carriers, setCarriers] = useState<Carrier[]>([]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiClient.get<{ data: Order[] }>(`/orders/seller?${params}`);
      setOrders(res.data);
    } catch { setOrders([]); } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchOrders();
    apiClient.get<Carrier[]>('/sellers/shipping/carriers').then(setCarriers).catch(() => {});
  }, [user, router, fetchOrders]);

  if (!user) return null;

  const statusOptions = [
    { value: 'PACKED', label: 'Ready to ship' },
    { value: 'SHIPPED', label: 'In transit' },
    { value: 'DELIVERED', label: 'Delivered' },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Shipping</h1>
          <p className="text-sm text-ink-500 mt-1">Manage shipments and track orders</p>
        </div>
        <div className="flex gap-3">
          <Select options={statusOptions} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44" />
          <Link href="/seller/settings?tab=shipping"><Button variant="outline" size="sm"><Truck className="mr-2 h-4 w-4" />Settings</Button></Link>
        </div>
      </div>

      {/* Carrier Overview */}
      {carriers.length > 0 && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {carriers.filter((c) => c.id !== 'manual').map((c) => (
            <div key={c.id} className="rounded-xl border border-ink-100 bg-white p-3 text-center">
              <p className="text-sm font-medium text-ink-900">{c.label}</p>
              <p className="text-[10px] text-ink-400 mt-0.5">{c.supportedServices.join(', ')}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-ink-100 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-16 text-center">
          <Package className="mx-auto h-12 w-12 text-ink-300" />
          <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">No shipments to manage</h3>
          <p className="mt-2 text-sm text-ink-500">Orders ready for shipping will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const shipment = order.shipments?.[0];
            return (
              <Link key={order.id} href={`/seller/orders/${order.id}`} className="block rounded-2xl border border-ink-100 bg-white p-4 hover:shadow-soft transition">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink-900">{order.orderNumber}</span>
                      <Badge className={statusFilter === 'SHIPPED' ? 'bg-purple-100 text-purple-800' : statusFilter === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}>
                        {statusFilter}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink-500">
                      <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                      <span>{formatINR(order.totalPaise)}</span>
                      <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    {shipment && (
                      <div className="mt-2 flex items-center gap-3 text-xs text-ink-400">
                        <Truck className="h-3 w-3" />
                        <span>{shipment.carrier || 'Manual'}</span>
                        {shipment.trackingNumber && <span>#{shipment.trackingNumber}</span>}
                        {shipment.estimatedDelivery && (
                          <span>Est. {new Date(shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-ink-300 shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
