'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, CreditCard, Wallet, Truck, Package, ChevronRight, Shield,
  Loader2, Plus, CheckCircle, Tag,
} from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Address = {
  id: string; label?: string; fullName: string; phone: string;
  line1: string; line2?: string; city: string; state: string;
  postalCode: string; country: string; isDefault: boolean;
};

type CheckoutPreview = {
  subtotalPaise: number; shippingPaise: number; taxPaise: number;
  discountPaise: number; platformFeePaise: number; totalPaise: number;
  couponApplied?: boolean; validationErrors?: string[];
  estimatedDelivery?: { minDays: number; maxDays: number };
};

const PAYMENT_METHODS = [
  { value: 'RAZORPAY', label: 'Credit/Debit Card, UPI & Net Banking', icon: CreditCard, desc: 'Pay via Razorpay' },
  { value: 'WALLET', label: 'Wallet Balance', icon: Wallet, desc: 'Pay using your Reloom wallet' },
  { value: 'COD', label: 'Cash on Delivery', icon: Truck, desc: 'Pay when you receive' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { items, subtotalPaise, fetchCart } = useCartStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPaise: number } | null>(null);
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'address' | 'payment' | 'review'>('address');

  const computePreview = useCallback(async () => {
    if (!selectedAddressId) return;
    try {
      const res = await apiClient.post<{ preview: CheckoutPreview }>('/checkout/preview', {
        shippingAddressId: selectedAddressId,
        couponCode: appliedCoupon?.code || undefined,
      });
      setPreview(res.preview);
    } catch { /* ignore */ }
  }, [selectedAddressId, appliedCoupon]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    const init = async () => {
      try {
        const [addrRes, initRes] = await Promise.all([
          apiClient.get<Address[]>('/addresses'),
          apiClient.get<{ preview: CheckoutPreview }>('/checkout/init'),
        ]);
        setAddresses(addrRes);
        setPreview(initRes.preview);
        const def = addrRes.find((a) => a.isDefault) || addrRes[0];
        if (def) setSelectedAddressId(def.id);
      } catch { setError('Failed to initialize checkout'); }
      finally { setLoading(false); }
    };
    init();
  }, [user, router]);

  useEffect(() => {
    if (selectedAddressId) computePreview();
  }, [selectedAddressId, appliedCoupon, computePreview]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setError(null);
    try {
      const res = await apiClient.post<{ coupon: { code: string; discountPaise: number }; preview: CheckoutPreview }>('/checkout/apply-coupon', { code: couponCode.trim() });
      setAppliedCoupon(res.coupon);
      setPreview(res.preview);
      setCouponCode('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Invalid coupon');
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    computePreview();
  };

  const placeOrder = async () => {
    if (!selectedAddressId) { setError('Please select a shipping address'); return; }
    setPlacing(true);
    setError(null);
    try {
      const { orderId } = await apiClient.post<{ orderId: string; orderNumber: string; totalPaise: number }>('/checkout/place', {
        shippingAddressId: selectedAddressId,
        couponCode: appliedCoupon?.code || undefined,
        paymentProvider: paymentMethod,
      });

      if (paymentMethod === 'COD' || paymentMethod === 'WALLET') {
        await apiClient.post('/payments/intent', { orderId, provider: paymentMethod });
        fetchCart();
        router.push(`/orders/${orderId}?success=1`);
        return;
      }

      const intent = await apiClient.post<{
        razorpayOrderId: string; razorpayKeyId: string; amountPaise: number;
        currency: string; orderId: string;
      }>('/payments/intent', { orderId, provider: 'RAZORPAY' });

      const rz = new (window as any).Razorpay({
        key: intent.razorpayKeyId,
        amount: intent.amountPaise,
        currency: intent.currency,
        name: 'Reloom',
        order_id: intent.razorpayOrderId,
        handler: async (response: any) => {
          await apiClient.post(`/payments/${intent.orderId}/verify`, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          fetchCart();
          router.push(`/orders/${intent.orderId}?success=1`);
        },
        modal: { ondismiss: () => setPlacing(false) },
        prefill: { contact: '', email: user?.email || '' },
        theme: { color: '#7c3aed' },
      });
      rz.open();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to place order');
      setPlacing(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="container-page py-10">
        <div className="animate-pulse space-y-6 max-w-5xl mx-auto">
          <div className="h-8 w-48 rounded-lg bg-ink-100" />
          <div className="h-40 rounded-2xl bg-ink-100" />
          <div className="h-64 rounded-2xl bg-ink-100" />
        </div>
      </div>
    );
  }

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Checkout</h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-ink-400">
          <span className={cn(step === 'address' ? 'text-brand-600 font-medium' : '')}>Address</span>
          <ChevronRight className="h-3 w-3" />
          <span className={cn(step === 'payment' ? 'text-brand-600 font-medium' : '')}>Payment</span>
          <ChevronRight className="h-3 w-3" />
          <span className={cn(step === 'review' ? 'text-brand-600 font-medium' : '')}>Review</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          {/* Address Selection */}
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-ink-900"><MapPin className="mr-2 inline h-4 w-4 text-ink-400" />Shipping Address</h2>
              <Link href="/addresses" className="text-sm text-brand-600 hover:underline">Manage</Link>
            </div>
            {addresses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink-200 p-6 text-center">
                <p className="text-sm text-ink-500">No addresses saved</p>
                <Link href="/addresses"><Button variant="brand" size="sm" className="mt-3"><Plus className="h-4 w-4 mr-1" />Add address</Button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <label key={addr.id} className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition',
                    selectedAddressId === addr.id ? 'border-brand-300 bg-brand-50/30' : 'border-ink-100 hover:border-ink-200',
                  )}>
                    <input type="radio" name="address" value={addr.id} checked={selectedAddressId === addr.id}
                      onChange={(e) => { setSelectedAddressId(e.target.value); setStep('payment'); }}
                      className="mt-1 h-4 w-4 shrink-0 accent-brand-600" />
                    <div className="min-w-0 text-sm">
                      <p className="font-medium text-ink-900">{addr.fullName}</p>
                      <p className="text-ink-500">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                      <p className="text-ink-500">{addr.city}, {addr.state} - {addr.postalCode}</p>
                      <p className="text-ink-400">{addr.phone}</p>
                      {addr.label && <span className="mt-1 inline-block rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-600">{addr.label}</span>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Coupon */}
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-semibold text-ink-900 mb-4"><Tag className="mr-2 inline h-4 w-4 text-ink-400" />Coupon</h2>
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-800">{appliedCoupon.code}</span>
                  <span className="text-sm text-emerald-600">-{formatINR(appliedCoupon.discountPaise)}</span>
                </div>
                <button onClick={removeCoupon} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code" className="flex-1 uppercase" />
                <Button variant="outline" onClick={applyCoupon} disabled={!couponCode.trim()}>Apply</Button>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-semibold text-ink-900 mb-4"><CreditCard className="mr-2 inline h-4 w-4 text-ink-400" />Payment Method</h2>
            <div className="space-y-3">
              {PAYMENT_METHODS.map((pm) => (
                <label key={pm.value} className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition',
                  paymentMethod === pm.value ? 'border-brand-300 bg-brand-50/30' : 'border-ink-100 hover:border-ink-200',
                )}>
                  <input type="radio" name="payment" value={pm.value} checked={paymentMethod === pm.value}
                    onChange={(e) => { setPaymentMethod(e.target.value); setStep('review'); }}
                    className="h-4 w-4 shrink-0 accent-brand-600" />
                  <pm.icon className="h-5 w-5 text-ink-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-ink-900">{pm.label}</p>
                    <p className="text-xs text-ink-500">{pm.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-semibold text-ink-900 mb-4">Order Summary</h2>

            {items.length > 0 && (
              <div className="space-y-2 mb-4">
                {items.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                      {item.product.thumbnailUrl && <img src={item.product.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-ink-700">{item.product.title}</p>
                      <p className="text-ink-400">Qty {item.quantity}</p>
                    </div>
                    <p className="font-medium">{formatINR(item.pricePaise * item.quantity)}</p>
                  </div>
                ))}
                {items.length > 4 && <p className="text-xs text-ink-400">+{items.length - 4} more items</p>}
              </div>
            )}

            <div className="space-y-2 border-t border-ink-100 pt-4 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</span>
                <span>{formatINR(preview?.subtotalPaise || subtotalPaise)}</span>
              </div>
              {preview && preview.shippingPaise > 0 ? (
                <div className="flex justify-between text-ink-600">
                  <span>Shipping</span>
                  <span>{formatINR(preview.shippingPaise)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-emerald-600">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
              )}
              {preview && preview.platformFeePaise > 0 && (
                <div className="flex justify-between text-ink-500">
                  <span>Platform fee</span>
                  <span>{formatINR(preview.platformFeePaise)}</span>
                </div>
              )}
              {preview && preview.discountPaise > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span>-{formatINR(preview.discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-400 text-xs">
                <span>Tax</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold text-ink-900">
                <span>Total</span>
                <span>{formatINR(preview?.totalPaise || 0)}</span>
              </div>
            </div>

            {preview?.estimatedDelivery && (
              <div className="mt-4 rounded-xl bg-ink-50 p-3 text-xs text-ink-600">
                <Truck className="mr-1 inline h-3 w-3" />
                Est. delivery: {preview.estimatedDelivery.minDays}-{preview.estimatedDelivery.maxDays} business days
              </div>
            )}

            <Button
              variant="brand"
              className="mt-4 w-full"
              onClick={placeOrder}
              disabled={placing || !selectedAddressId}
              size="lg"
            >
              {placing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {paymentMethod === 'COD' ? 'Place COD Order' :
               paymentMethod === 'WALLET' ? 'Pay with Wallet' :
               `Pay ${formatINR(preview?.totalPaise || 0)}`}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-400">
              <Shield className="h-3 w-3" />
              <span>Secure checkout · 7-day returns</span>
            </div>

            {preview?.validationErrors && preview.validationErrors.length > 0 && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                {preview.validationErrors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
