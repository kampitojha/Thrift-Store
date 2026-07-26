'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  User,
  CreditCard,
  Clock,
  Loader2,
  AlertTriangle,
  Truck,
  CheckCircle,
  XCircle,
  RotateCcw,
  MapPin,
  Building2,
  Landmark,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

type OrderItem = {
  id: string;
  title: string;
  pricePaise: number;
  quantity: number;
  thumbnailUrl?: string | null;
  seller?: { username: string; storeName?: string | null };
};

type TimelineEntry = {
  status: string;
  timestamp: string;
  note?: string | null;
  actor?: string | null;
};

type Address = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type Payment = {
  id: string;
  provider: string;
  method: string;
  status: string;
  amountPaise: number;
  paidAt?: string | null;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  totalPaise: number;
  shippingPaise?: number;
  platformFeePaise?: number;
  subtotalPaise?: number;
  discountPaise?: number;
  taxPaise?: number;
  couponCode?: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  buyer: {
    id: string;
    username: string;
    displayName?: string | null;
    email?: string | null;
  };
  items: OrderItem[];
  timeline: TimelineEntry[];
  shippingAddress?: Address | null;
  billingAddress?: Address | null;
  payments?: Payment[];
};

const STATUS_STYLES: Record<string, string> = {
  PLACED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-indigo-100 text-indigo-800',
  SHIPPED: 'bg-violet-100 text-violet-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-amber-100 text-amber-800',
  REFUNDED: 'bg-rose-100 text-rose-800',
};

const TIMELINE_ICONS: Record<string, React.ReactNode> = {
  PLACED: <Clock className="h-4 w-4 text-blue-500" />,
  CONFIRMED: <CheckCircle className="h-4 w-4 text-indigo-500" />,
  SHIPPED: <Truck className="h-4 w-4 text-violet-500" />,
  DELIVERED: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  CANCELLED: <XCircle className="h-4 w-4 text-red-500" />,
  RETURNED: <RotateCcw className="h-4 w-4 text-amber-500" />,
  REFUNDED: <RotateCcw className="h-4 w-4 text-rose-500" />,
};

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const user = useAuthStore((s) => s.user);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<OrderDetail>(`/admin/orders/${orderId}`);
      setOrder(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    fetchOrder();
  }, [user, router, fetchOrder]);

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    try {
      await apiClient.patch(`/admin/orders/${orderId}/cancel`, { reason: cancelReason.trim() });
      await fetchOrder();
      setShowCancelConfirm(false);
      setCancelReason('');
    } catch { /* ignore */ } finally {
      setCancelling(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6 h-8 w-48 rounded-xl bg-ink-100 animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-48 rounded-2xl bg-ink-100 animate-pulse" />
            <div className="h-64 rounded-2xl bg-ink-100 animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-40 rounded-2xl bg-ink-100 animate-pulse" />
            <div className="h-40 rounded-2xl bg-ink-100 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 lg:p-8">
        <Link href="/admin/orders" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-700">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error || 'Order not found'}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchOrder}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const itemsTotal = order.items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-700 mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold text-ink-900">
                #{order.orderNumber}
              </h1>
              <span className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                STATUS_STYLES[order.status] || 'bg-ink-100 text-ink-600'
              )}>
                {order.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-500">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          {!['CANCELLED', 'DELIVERED', 'REFUNDED', 'RETURNED'].includes(order.status) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCancelConfirm(true)}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {showCancelConfirm && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
          <h3 className="text-sm font-semibold text-red-800 mb-2">Cancel Order</h3>
          <Textarea
            placeholder="Enter reason for cancellation..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="mb-3 min-h-[80px]"
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelOrder}
              disabled={!cancelReason.trim() || cancelling}
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowCancelConfirm(false); setCancelReason(''); }}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Package className="h-4 w-4 text-ink-400" />
              Items ({order.items.length})
            </h2>
            <div className="divide-y divide-ink-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-5 w-5 text-ink-300" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900 truncate">{item.title}</p>
                    <p className="text-xs text-ink-500">
                      Qty: {item.quantity}
                      {item.seller && <span className="ml-2">Seller: {item.seller.storeName || item.seller.username}</span>}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-ink-900">
                    {formatINR(item.pricePaise * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Clock className="h-4 w-4 text-ink-400" />
              Timeline
            </h2>
            <div className="space-y-4">
              {order.timeline.map((entry, i) => (
                <div key={i} className="flex gap-3">
                  <div className="relative flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-50">
                      {TIMELINE_ICONS[entry.status] || <Clock className="h-4 w-4 text-ink-400" />}
                    </div>
                    {i < order.timeline.length - 1 && (
                      <div className="mt-1 h-full w-px bg-ink-200" />
                    )}
                  </div>
                  <div className="pt-1">
                    <p className="text-sm font-medium text-ink-900">{entry.status}</p>
                    <p className="text-xs text-ink-500">
                      {new Date(entry.timestamp).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    {entry.note && <p className="mt-1 text-xs text-ink-600">{entry.note}</p>}
                    {entry.actor && <p className="text-xs text-ink-400">by {entry.actor}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Buyer Info */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <User className="h-4 w-4 text-ink-400" />
              Buyer
            </h2>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-ink-900">{order.buyer.displayName || order.buyer.username}</p>
              {order.buyer.email && (
                <p className="text-xs text-ink-500">{order.buyer.email}</p>
              )}
              <p className="text-xs text-ink-400">@{order.buyer.username}</p>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
                <MapPin className="h-4 w-4 text-ink-400" />
                Shipping Address
              </h2>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-ink-900">{order.shippingAddress.fullName}</p>
                <p className="text-ink-600">{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p className="text-ink-600">{order.shippingAddress.line2}</p>}
                <p className="text-ink-600">
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                </p>
                <p className="text-ink-500">{order.shippingAddress.country}</p>
                <p className="text-ink-500">Phone: {order.shippingAddress.phone}</p>
              </div>
            </div>
          )}

          {/* Billing Address (if different from shipping) */}
          {order.billingAddress && order.billingAddress.id !== order.shippingAddress?.id && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Building2 className="h-4 w-4 text-ink-400" />
                Billing Address
              </h2>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-ink-900">{order.billingAddress.fullName}</p>
                <p className="text-ink-600">{order.billingAddress.line1}</p>
                {order.billingAddress.line2 && <p className="text-ink-600">{order.billingAddress.line2}</p>}
                <p className="text-ink-600">
                  {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postalCode}
                </p>
                <p className="text-ink-500">{order.billingAddress.country}</p>
                <p className="text-ink-500">Phone: {order.billingAddress.phone}</p>
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <CreditCard className="h-4 w-4 text-ink-400" />
              Price Breakdown
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>Items subtotal</span>
                <span>{formatINR(itemsTotal)}</span>
              </div>
              {order.shippingPaise ? (
                <div className="flex justify-between text-ink-600">
                  <span>Shipping</span>
                  <span>{formatINR(order.shippingPaise)}</span>
                </div>
              ) : null}
              {order.platformFeePaise ? (
                <div className="flex justify-between text-ink-600">
                  <span>Platform fee</span>
                  <span>{formatINR(order.platformFeePaise)}</span>
                </div>
              ) : null}
              <div className="border-t border-ink-100 pt-2 flex justify-between font-semibold text-ink-900">
                <span>Total</span>
                <span>{formatINR(order.totalPaise)}</span>
              </div>
              {order.discountPaise ? (
                <div className="flex justify-between text-ink-600">
                  <span>Discount</span>
                  <span className="text-emerald-600">-{formatINR(order.discountPaise)}</span>
                </div>
              ) : null}
              {order.taxPaise ? (
                <div className="flex justify-between text-ink-600">
                  <span>Tax</span>
                  <span>{formatINR(order.taxPaise)}</span>
                </div>
              ) : null}
              {order.couponCode && (
                <div className="flex justify-between text-ink-600">
                  <span>Coupon</span>
                  <Badge variant="outline" className="text-xs">{order.couponCode}</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Payment Info */}
          {order.payments && order.payments.length > 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Landmark className="h-4 w-4 text-ink-400" />
                Payment
              </h2>
              <div className="space-y-3">
                {order.payments.map((p) => (
                  <div key={p.id} className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-500">Method</span>
                      <span className="font-medium text-ink-900 capitalize">{p.method.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-500">Provider</span>
                      <span className="text-ink-700 capitalize">{p.provider}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-500">Amount</span>
                      <span className="font-semibold text-ink-900">{formatINR(p.amountPaise)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-500">Status</span>
                      <Badge variant={p.status === 'COMPLETED' ? 'success' : p.status === 'FAILED' ? 'outline' : 'outline'}>
                        {p.status}
                      </Badge>
                    </div>
                    {p.paidAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-ink-500">Paid at</span>
                        <span className="text-ink-600 text-xs">{new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order Dates */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Clock className="h-4 w-4 text-ink-400" />
              Dates
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-500">Created</span>
                <span className="text-ink-700">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Updated</span>
                <span className="text-ink-700">{new Date(order.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              {order.confirmedAt && (
                <div className="flex justify-between">
                  <span className="text-ink-500">Confirmed</span>
                  <span className="text-ink-700">{new Date(order.confirmedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
              {order.shippedAt && (
                <div className="flex justify-between">
                  <span className="text-ink-500">Shipped</span>
                  <span className="text-ink-700">{new Date(order.shippedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex justify-between">
                  <span className="text-ink-500">Delivered</span>
                  <span className="text-ink-700">{new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
              {order.cancelledAt && (
                <div className="flex justify-between">
                  <span className="text-ink-500">Cancelled</span>
                  <span className="text-red-600">{new Date(order.cancelledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
