'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Package, Truck, CheckCircle, XCircle, Clock, AlertTriangle, FileText, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

type OrderItem = {
  id: string; quantity: number; unitPricePaise: number;
  product: { id: string; title: string; slug: string; images: string[]; variantLabel?: string };
};

type TimelineEntry = {
  id: string; status: string; note?: string; createdAt: string;
  createdBy?: { id: string; username: string };
};

type InvoiceData = {
  invoiceNumber: string; createdAt: string; totalPaise: number; subtotalPaise: number; taxPaise: number; shippingPaise: number;
  seller: { storeName: string; storeAddress?: string; gstin?: string };
  buyer: { username: string; displayName?: string; email: string };
  items: Array<{ title: string; quantity: number; unitPricePaise: number; totalPaise: number }>;
};

type OrderDetail = {
  id: string; orderNumber: string; status: string; totalPaise: number; subtotalPaise: number; taxPaise: number; shippingPaise: number;
  notes?: string; couponCode?: string; discountPaise?: number; createdAt: string; updatedAt: string;
  buyer: { id: string; username: string; displayName?: string; email?: string; avatarUrl?: string; phone?: string };
  shippingAddress?: { line1: string; line2?: string; city: string; state: string; pincode: string; phone: string };
  billingAddress?: { line1: string; line2?: string; city: string; state: string; pincode: string };
  items: OrderItem[];
};

const STATUS_ACTIONS: Record<string, { label: string; action: string; icon: React.ElementType; color: string }[]> = {
  PLACED: [
    { label: 'Accept order', action: 'accept', icon: CheckCircle, color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Reject order', action: 'reject', icon: XCircle, color: 'bg-red-600 hover:bg-red-700' },
  ],
  CONFIRMED: [
    { label: 'Mark as preparing', action: 'prepare', icon: Clock, color: 'bg-indigo-600 hover:bg-indigo-700' },
  ],
  PACKED: [
    { label: 'Mark as shipped', action: 'ship', icon: Truck, color: 'bg-purple-600 hover:bg-purple-700' },
  ],
  SHIPPED: [
    { label: 'Mark as delivered', action: 'deliver', icon: Package, color: 'bg-emerald-600 hover:bg-emerald-700' },
  ],
};

const TIMELINE_ICONS: Record<string, React.ElementType> = {
  PLACED: Package, CONFIRMED: CheckCircle, PACKED: Clock, SHIPPED: Truck, DELIVERED: CheckCircle, CANCELLED: XCircle, RETURN_REQUESTED: AlertTriangle,
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-amber-100 text-amber-800', CONFIRMED: 'bg-blue-100 text-blue-800',
  PACKED: 'bg-indigo-100 text-indigo-800', SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800', CANCELLED: 'bg-red-100 text-red-800',
  RETURN_REQUESTED: 'bg-orange-100 text-orange-800', REFUNDED: 'bg-ink-100 text-ink-600',
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);
  const [showTimelineInput, setShowTimelineInput] = useState(false);
  const [timelineNote, setTimelineNote] = useState('');
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [orderNote, setOrderNote] = useState('');

  const orderId = params?.id as string;

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    if (!orderId) return;

    Promise.all([
      apiClient.get<OrderDetail>(`/orders/${orderId}`),
      apiClient.get<TimelineEntry[]>(`/orders/${orderId}/timeline`),
    ]).then(([o, t]) => {
      setOrder(o);
      setTimeline(t);
    }).catch((e) => {
      setError(e instanceof ApiError ? e.message : 'Failed to load order');
    }).finally(() => setLoading(false));
  }, [user, orderId, router]);

  const handleAction = async (action: string) => {
    if (action === 'reject') { setShowRejectDialog(true); return; }
    if (action === 'cancel') { setShowCancelDialog(true); return; }
    setActionLoading(action);
    try {
      await apiClient.post(`/orders/${orderId}/${action}`, {});
      const [o, t] = await Promise.all([
        apiClient.get<OrderDetail>(`/orders/${orderId}`),
        apiClient.get<TimelineEntry[]>(`/orders/${orderId}/timeline`),
      ]);
      setOrder(o);
      setTimeline(t);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : `Failed to ${action} order`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    setActionLoading('reject');
    try {
      await apiClient.post(`/orders/${orderId}/reject`, { reason: rejectReason });
      const [o, t] = await Promise.all([
        apiClient.get<OrderDetail>(`/orders/${orderId}`),
        apiClient.get<TimelineEntry[]>(`/orders/${orderId}/timeline`),
      ]);
      setOrder(o);
      setTimeline(t);
      setShowRejectDialog(false);
      setRejectReason('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to reject order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    setActionLoading('cancel');
    try {
      await apiClient.post(`/orders/${orderId}/cancel`, { reason: cancelReason });
      const [o, t] = await Promise.all([
        apiClient.get<OrderDetail>(`/orders/${orderId}`),
        apiClient.get<TimelineEntry[]>(`/orders/${orderId}/timeline`),
      ]);
      setOrder(o);
      setTimeline(t);
      setShowCancelDialog(false);
      setCancelReason('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to cancel order');
    } finally {
      setActionLoading(null);
    }
  };

  const addTimelineNote = async () => {
    if (!timelineNote.trim()) return;
    try {
      await apiClient.post(`/orders/${orderId}/timeline`, { note: timelineNote });
      setTimeline(await apiClient.get<TimelineEntry[]>(`/orders/${orderId}/timeline`));
      setTimelineNote('');
      setShowTimelineInput(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to add note');
    }
  };

  const loadInvoice = async () => {
    if (invoice) { setShowInvoice(true); return; }
    try {
      const inv = await apiClient.get<InvoiceData>(`/orders/${orderId}/invoice`);
      setInvoice(inv);
      setShowInvoice(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load invoice');
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-ink-100" />
          <div className="h-40 rounded-2xl bg-ink-100" />
          <div className="h-60 rounded-2xl bg-ink-100" />
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="p-6 lg:p-8">
        <Link href="/seller/orders" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-700 mb-6"><ArrowLeft className="h-4 w-4" />Back to orders</Link>
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-16 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-300" />
          <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">Order not found</h3>
          <p className="mt-2 text-sm text-ink-500">{error}</p>
          <Link href="/seller/orders"><Button variant="brand" className="mt-6">View all orders</Button></Link>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const actions = STATUS_ACTIONS[order.status] || [];
  const canCancel = !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/seller/orders" className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold text-ink-900">{order.orderNumber}</h1>
              <span className={cn('rounded-full px-3 py-0.5 text-xs font-medium', ORDER_STATUS_COLORS[order.status] || 'bg-ink-100 text-ink-600')}>
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-ink-500">Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button key={a.action} variant={a.action === 'reject' ? 'outline' : 'default'}
              onClick={() => handleAction(a.action)} disabled={actionLoading === a.action}
              className={a.action !== 'reject' ? a.color : ''}>
              {actionLoading === a.action ? <Loader2 className="h-4 w-4 animate-spin" /> : <a.icon className="h-4 w-4" />}
              {a.label}
            </Button>
          ))}
          {canCancel && (
            <Button variant="outline" onClick={() => setShowCancelDialog(true)} disabled={actionLoading === 'cancel'}
              className="border-red-200 text-red-700 hover:bg-red-50">
              {actionLoading === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel order
            </Button>
          )}
          <Button variant="outline" onClick={loadInvoice}><FileText className="h-4 w-4" />Invoice</Button>
        </div>
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-ink-100 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Items ({order.items.length})</h2>
            <div className="divide-y divide-ink-50">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="h-16 w-16 rounded-xl bg-ink-100 overflow-hidden shrink-0">
                    {item.product.images?.[0] ? (
                      <img src={item.product.images[0]} alt={item.product.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-ink-300"><Package className="h-6 w-6" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.product.slug}`} className="font-medium text-ink-900 hover:text-brand-700 truncate block">{item.product.title}</Link>
                    {item.product.variantLabel && <p className="text-xs text-ink-500">{item.product.variantLabel}</p>}
                    <p className="text-sm text-ink-500">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-ink-900">{formatINR(item.unitPricePaise * item.quantity)}</p>
                    <p className="text-xs text-ink-500">{formatINR(item.unitPricePaise)} each</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-ink-100 pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-ink-500"><span>Subtotal</span><span>{formatINR(order.subtotalPaise)}</span></div>
              {order.shippingPaise > 0 && <div className="flex justify-between text-ink-500"><span>Shipping</span><span>{formatINR(order.shippingPaise)}</span></div>}
              {order.taxPaise > 0 && <div className="flex justify-between text-ink-500"><span>Tax</span><span>{formatINR(order.taxPaise)}</span></div>}
              {order.discountPaise && order.discountPaise > 0 && (
                <div className="flex justify-between text-emerald-600"><span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span><span>-{formatINR(order.discountPaise)}</span></div>
              )}
              <div className="flex justify-between font-semibold text-ink-900 pt-2 border-t border-ink-100"><span>Total</span><span>{formatINR(order.totalPaise)}</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-ink-900">Timeline</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowTimelineInput(!showTimelineInput)}><MessageSquare className="h-4 w-4" />Add note</Button>
            </div>
            {showTimelineInput && (
              <div className="mb-4 space-y-2">
                <Textarea value={timelineNote} onChange={(e) => setTimelineNote(e.target.value)} placeholder="Add an internal note..." rows={2} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addTimelineNote}>Add note</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowTimelineInput(false); setTimelineNote(''); }}>Cancel</Button>
                </div>
              </div>
            )}
            {timeline.length === 0 ? (
              <p className="text-sm text-ink-400 py-4 text-center">No timeline entries yet.</p>
            ) : (
              <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-0.5 before:bg-ink-100">
                {timeline.map((entry, idx) => {
                  const Icon = TIMELINE_ICONS[entry.status] || Clock;
                  return (
                    <div key={entry.id} className={cn('relative pb-6 last:pb-0', idx < timeline.length - 1 && '')}>
                      <div className={cn('absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white',
                        entry.status === 'CANCELLED' ? 'bg-red-500' : entry.status === 'DELIVERED' ? 'bg-emerald-500' : 'bg-ink-300')}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink-900">{entry.status.replace(/_/g, ' ')}</p>
                        {entry.note && <p className="text-sm text-ink-500 mt-0.5">{entry.note}</p>}
                        <p className="text-xs text-ink-400 mt-0.5">
                          {new Date(entry.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          {entry.createdBy && ` by ${entry.createdBy.username}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-ink-100 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Customer</h2>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-ink-100 flex items-center justify-center text-sm font-semibold text-ink-600">
                {order.buyer.username?.slice(0, 2).toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-medium text-ink-900">{order.buyer.displayName || order.buyer.username}</p>
                <p className="text-xs text-ink-500">@{order.buyer.username}</p>
              </div>
            </div>
            {order.buyer.email && <p className="text-sm text-ink-600">{order.buyer.email}</p>}
            {order.buyer.phone && <p className="text-sm text-ink-600">{order.buyer.phone}</p>}
            <Link href={`/profile/${order.buyer.username}`}><Button variant="ghost" size="sm" className="mt-2">View profile</Button></Link>
          </div>

          {order.shippingAddress && (
            <div className="rounded-2xl border border-ink-100 bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Shipping address</h2>
              <div className="space-y-1 text-sm text-ink-600">
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                <p className="text-ink-400">Phone: {order.shippingAddress.phone}</p>
              </div>
            </div>
          )}

          {order.billingAddress && (
            <div className="rounded-2xl border border-ink-100 bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Billing address</h2>
              <div className="space-y-1 text-sm text-ink-600">
                <p>{order.billingAddress.line1}</p>
                {order.billingAddress.line2 && <p>{order.billingAddress.line2}</p>}
                <p>{order.billingAddress.city}, {order.billingAddress.state} - {order.billingAddress.pincode}</p>
              </div>
            </div>
          )}

          {order.notes && (
            <div className="rounded-2xl border border-ink-100 bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-ink-900 mb-2">Order notes</h2>
              <p className="text-sm text-ink-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)}>
        <DialogHeader><h2 className="font-display text-lg font-semibold">Reject order</h2></DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-500 mb-3">Are you sure you want to reject this order? Please provide a reason.</p>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." rows={3} />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
          <Button onClick={handleReject} disabled={actionLoading === 'reject' || !rejectReason.trim()} className="bg-red-600 hover:bg-red-700">
            {actionLoading === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Reject order
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <DialogHeader><h2 className="font-display text-lg font-semibold">Cancel order</h2></DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-500 mb-3">Are you sure you want to cancel this order? Please provide a reason.</p>
          <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason for cancellation..." rows={3} />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Cancel</Button>
          <Button onClick={handleCancel} disabled={actionLoading === 'cancel' || !cancelReason.trim()} className="bg-red-600 hover:bg-red-700">
            {actionLoading === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Cancel order
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={showInvoice} onClose={() => setShowInvoice(false)}>
        <DialogHeader>
          <h2 className="font-display text-lg font-semibold">Invoice{invoice ? ` - ${invoice.invoiceNumber}` : ''}</h2>
        </DialogHeader>
        <DialogBody>
          {!invoice ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-ink-400" /></div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <div>
                  <p className="font-medium text-ink-900">{invoice.seller.storeName}</p>
                  {invoice.seller.storeAddress && <p className="text-ink-500">{invoice.seller.storeAddress}</p>}
                  {invoice.seller.gstin && <p className="text-ink-500">GST: {invoice.seller.gstin}</p>}
                </div>
                <div className="text-right">
                  <p className="font-medium text-ink-900">{invoice.buyer.displayName || invoice.buyer.username}</p>
                  <p className="text-ink-500">{invoice.buyer.email}</p>
                </div>
              </div>
              <div className="border-t border-ink-100 pt-3 text-sm text-ink-500">
                <p>Invoice date: {new Date(invoice.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-ink-100 text-ink-600"><th className="text-left py-2 font-medium">Item</th><th className="text-right py-2 font-medium">Qty</th><th className="text-right py-2 font-medium">Price</th><th className="text-right py-2 font-medium">Total</th></tr></thead>
                <tbody>
                  {invoice.items.map((item, i) => (
                    <tr key={i} className="border-b border-ink-50">
                      <td className="py-2 text-ink-900">{item.title}</td>
                      <td className="py-2 text-right text-ink-600">{item.quantity}</td>
                      <td className="py-2 text-right text-ink-600">{formatINR(item.unitPricePaise)}</td>
                      <td className="py-2 text-right font-medium text-ink-900">{formatINR(item.totalPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 text-sm border-t border-ink-100 pt-3">
                <div className="flex justify-between text-ink-500"><span>Subtotal</span><span>{formatINR(invoice.subtotalPaise)}</span></div>
                <div className="flex justify-between text-ink-500"><span>Shipping</span><span>{formatINR(invoice.shippingPaise)}</span></div>
                {invoice.taxPaise > 0 && <div className="flex justify-between text-ink-500"><span>Tax</span><span>{formatINR(invoice.taxPaise)}</span></div>}
                <div className="flex justify-between font-semibold text-ink-900 pt-2 border-t border-ink-100"><span>Total</span><span>{formatINR(invoice.totalPaise)}</span></div>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowInvoice(false)}>Close</Button>
        </DialogFooter>
      </Dialog>

      {showNoteDialog && (
        <Dialog open={showNoteDialog} onClose={() => setShowNoteDialog(false)}>
          <DialogHeader><h2 className="font-display text-lg font-semibold">Update order note</h2></DialogHeader>
          <DialogBody>
            <Textarea value={orderNote} onChange={(e) => setOrderNote(e.target.value)} placeholder="Add a note to this order..." rows={3} />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              try { await apiClient.patch(`/orders/${orderId}`, { notes: orderNote }); setShowNoteDialog(false); }
              catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to update note'); }
            }}>Save</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
