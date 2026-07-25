'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Package, Truck, CreditCard, MapPin, CheckCircle, Clock, AlertCircle,
  ChevronRight, ChevronDown, ChevronUp, MessageCircle, Shield,
  RotateCcw, XCircle, Download, Star,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  totalPaise: number;
  subtotalPaise: number;
  shippingPaise: number;
  discountPaise: number;
  taxPaise: number;
  platformFeePaise: number;
  createdAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unitPricePaise: number;
    totalPaise: number;
    thumbnailUrl?: string;
    productId?: string;
    sellerId?: string;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    method: string;
    status: string;
    amountPaise: number;
  }>;
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  timeline: Array<{
    id: string;
    status: string;
    note?: string;
    createdAt: string;
  }>;
  shipment?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
    status?: string;
  } | null;
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  PENDING: { color: 'bg-amber-100 text-amber-800', icon: Clock, label: 'Pending' },
  CONFIRMED: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Confirmed' },
  PROCESSING: { color: 'bg-indigo-100 text-indigo-800', icon: Package, label: 'Processing' },
  SHIPPED: { color: 'bg-purple-100 text-purple-800', icon: Truck, label: 'Shipped' },
  DELIVERED: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle, label: 'Delivered' },
  CANCELLED: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
  REFUNDED: { color: 'bg-ink-100 text-ink-600', icon: RotateCcw, label: 'Refunded' },
  RETURNED: { color: 'bg-orange-100 text-orange-800', icon: RotateCcw, label: 'Returned' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { color: 'bg-ink-100 text-ink-600', icon: Package, label: status };
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const success = searchParams.get('success');
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    apiClient.get<OrderDetail>(`/orders/${id}`)
      .then(setOrder)
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [id, user, router]);

  const cancelOrder = async () => {
    setActionLoading('CANCEL');
    try {
      await apiClient.post(`/orders/buyer/${id}/cancel`, { reason: 'Cancelled by buyer' });
      setOrder((prev) => prev ? { ...prev, status: 'CANCELLED', cancelledAt: new Date().toISOString() } : prev);
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const reorder = async () => {
    setActionLoading('REORDER');
    try {
      await apiClient.post(`/orders/${id}/reorder`, {});
      router.push('/cart');
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="container-page py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-lg bg-ink-100" />
          <div className="h-32 rounded-2xl bg-ink-100" />
          <div className="h-48 rounded-2xl bg-ink-100" />
        </div>
      </div>
    );
  }

  if (!order) return null;

  const statusCfg = getStatusConfig(order.status);
  const StatusIcon = statusCfg.icon;
  const canCancel = ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status);
  const canReview = order.status === 'DELIVERED';
  const canReturn = order.status === 'DELIVERED';
  const canRaiseDispute = !['CANCELLED', 'REFUNDED', 'RETURNED'].includes(order.status);
  const canBuyAgain = !['CANCELLED'].includes(order.status);

  return (
    <div className="container-page max-w-3xl py-10">
      {success && (
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-2 font-display text-xl font-semibold text-emerald-900">Payment successful!</h2>
          <p className="mt-1 text-sm text-emerald-700">Your order has been placed.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/orders" className="rounded-full p-2 text-ink-400 hover:bg-ink-100">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Order</p>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
          </div>
        </div>
        <span className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold', statusCfg.color)}>
          <StatusIcon className="h-3.5 w-3.5" />
          {statusCfg.label}
        </span>
      </div>

      {/* Actions Bar */}
      <div className="mt-6 flex flex-wrap gap-3">
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={cancelOrder}
            disabled={actionLoading === 'CANCEL'}
          >
            {actionLoading === 'CANCEL' ? 'Cancelling…' : 'Cancel order'}
          </Button>
        )}
        {canBuyAgain && (
          <Button variant="outline" size="sm" onClick={reorder} disabled={actionLoading === 'REORDER'}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {actionLoading === 'REORDER' ? 'Adding…' : 'Buy again'}
          </Button>
        )}
        {order.shipment?.trackingUrl && (
          <a href={order.shipment.trackingUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <Truck className="mr-2 h-4 w-4" />
              Track shipment
            </Button>
          </a>
        )}
        <Link href={`/messages?order=${order.id}`}>
          <Button variant="ghost" size="sm">
            <MessageCircle className="mr-2 h-4 w-4" />
            Contact seller
          </Button>
        </Link>
      </div>

      {/* Items */}
      <div className="mt-8 space-y-4">
        <h2 className="font-semibold text-ink-900">Items</h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
            <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-ink-100">
              {item.thumbnailUrl && (
                <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={item.productId ? `/product/${item.productId}` : '#'} className="font-medium text-ink-900 hover:underline">
                {item.title}
              </Link>
              <p className="mt-1 text-sm text-ink-500">Qty {item.quantity} × {formatINR(item.unitPricePaise)}</p>
              <p className="mt-1 text-sm font-semibold">{formatINR(item.totalPaise)}</p>
              <div className="mt-2 flex gap-2">
                {canReview && (
                  <Link href={`/reviews/create?productId=${item.productId || ''}&orderId=${order.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs">
                      <Star className="mr-1.5 h-3.5 w-3.5" />
                      Review
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shipment Tracking */}
      {order.shipment && (
        <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink-900">
              <Truck className="mr-2 inline h-4 w-4 text-ink-500" />
              Shipping
            </h3>
            {order.shipment.trackingNumber && (
              <span className="text-xs text-ink-400">#{order.shipment.trackingNumber}</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-600">
            <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium">
              {order.shipment.carrier || 'Standard'}
            </span>
            {order.shipment.estimatedDelivery && (
              <span>Est. delivery {new Date(order.shipment.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            )}
            {order.shipment.status && (
              <span className="text-ink-400">· {order.shipment.status}</span>
            )}
          </div>
        </div>
      )}

      {/* Payment Info */}
      <div className="mt-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <h3 className="font-semibold text-ink-900">
          <CreditCard className="mr-2 inline h-4 w-4 text-ink-500" />
          Payment
        </h3>
        {order.payments.map((p) => (
          <div key={p.id} className="mt-3 flex items-center justify-between text-sm">
            <span className="text-ink-500">{p.provider} ({p.method})</span>
            <span className={cn('font-medium', p.status === 'CAPTURED' ? 'text-emerald-700' : 'text-ink-500')}>
              {p.status} — {formatINR(p.amountPaise)}
            </span>
          </div>
        ))}
        <div className="mt-3 space-y-1.5 border-t border-ink-100 pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-500">Subtotal</span>
            <span className="font-medium">{formatINR(order.subtotalPaise)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-500">Shipping</span>
            <span className="font-medium">{order.shippingPaise > 0 ? formatINR(order.shippingPaise) : 'Free'}</span>
          </div>
          {order.discountPaise > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount</span>
              <span>-{formatINR(order.discountPaise)}</span>
            </div>
          )}
          {order.taxPaise > 0 && (
            <div className="flex justify-between">
              <span className="text-ink-500">Tax</span>
              <span className="font-medium">{formatINR(order.taxPaise)}</span>
            </div>
          )}
          {order.platformFeePaise > 0 && (
            <div className="flex justify-between">
              <span className="text-ink-500">Platform fee</span>
              <span className="font-medium">{formatINR(order.platformFeePaise)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatINR(order.totalPaise)}</span>
          </div>
        </div>
        {order.payments.every((p) => p.status === 'FAILED') && order.status === 'PENDING' && (
          <div className="mt-4 flex gap-3 border-t border-ink-100 pt-4">
            <Link href={`/checkout?retryOrder=${order.id}`}>
              <Button variant="brand" size="sm">
                <CreditCard className="mr-1.5 h-4 w-4" />
                Retry payment
              </Button>
            </Link>
            <Link href={`/checkout?retryOrder=${order.id}&method=cod`}>
              <Button variant="outline" size="sm">Try COD</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Shipping Address */}
      {order.shippingAddress && (
        <div className="mt-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h3 className="font-semibold text-ink-900">
            <MapPin className="mr-2 inline h-4 w-4 text-ink-500" />
            Shipping to
          </h3>
          <div className="mt-3 space-y-1 text-sm">
            <p className="font-medium text-ink-900">{order.shippingAddress.fullName}</p>
            <p className="text-ink-500">{order.shippingAddress.line1}</p>
            {order.shippingAddress.line2 && <p className="text-ink-500">{order.shippingAddress.line2}</p>}
            <p className="text-ink-500">{order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.postalCode}</p>
            <p className="text-ink-400">{order.shippingAddress.phone}</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="mt-4 rounded-2xl border border-ink-100 bg-white shadow-soft">
        <button
          onClick={() => setTimelineExpanded(!timelineExpanded)}
          className="flex w-full items-center justify-between p-6"
        >
          <h3 className="font-semibold text-ink-900">
            <Clock className="mr-2 inline h-4 w-4 text-ink-500" />
            Timeline
          </h3>
          {timelineExpanded ? <ChevronUp className="h-4 w-4 text-ink-400" /> : <ChevronDown className="h-4 w-4 text-ink-400" />}
        </button>
        {timelineExpanded && (
          <div className="px-6 pb-6">
            <div className="relative ml-2 space-y-5">
              <div className="absolute bottom-0 left-[7px] top-0 w-0.5 bg-ink-200" />
              {order.timeline.map((t, i) => {
                const cfg = getStatusConfig(t.status);
                const TIcon = cfg.icon;
                return (
                  <div key={t.id} className="relative flex items-start gap-4">
                    <div className={cn(
                      'relative z-10 flex h-4 w-4 items-center justify-center rounded-full',
                      i === 0 ? 'bg-brand-600' : 'bg-ink-200',
                    )}>
                      {i === 0 && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    <div className="min-w-0 flex-1 -mt-0.5">
                      <p className={cn('text-sm font-medium', i === 0 ? 'text-ink-900' : 'text-ink-500')}>
                        {t.status.replace(/_/g, ' ')}
                      </p>
                      {t.note && <p className="text-xs text-ink-400">{t.note}</p>}
                      <p className="text-xs text-ink-300">
                        {new Date(t.createdAt).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Support */}
      <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-brand-600" />
          <div>
            <p className="font-medium text-ink-900">Need help with this order?</p>
            <p className="text-sm text-ink-500">Contact the seller or report an issue.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/messages?order=${order.id}`}>
            <Button variant="outline" size="sm">
              <MessageCircle className="mr-2 h-4 w-4" />
              Contact seller
            </Button>
          </Link>
          {canReturn && (
            <Link href="/returns">
              <Button variant="outline" size="sm">
                <RotateCcw className="mr-2 h-4 w-4" />
                Request return
              </Button>
            </Link>
          )}
          {canRaiseDispute && (
            <Link href={`/orders/${order.id}/dispute`}>
              <Button variant="outline" size="sm">
                <Shield className="mr-2 h-4 w-4" />
                Raise dispute
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link href="/orders">
          <Button variant="ghost">← Back to orders</Button>
        </Link>
      </div>
    </div>
  );
}
