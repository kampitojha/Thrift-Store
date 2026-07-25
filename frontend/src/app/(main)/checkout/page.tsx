'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api';
import { formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Address = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
};

type PaymentOption = 'RAZORPAY' | 'UPI' | 'WALLET' | 'COD';

const PAYMENT_METHODS: { value: PaymentOption; label: string; desc: string }[] = [
  { value: 'RAZORPAY', label: 'Card / UPI / Net Banking', desc: 'Pay via Razorpay (cards, UPI, net banking)' },
  { value: 'UPI', label: 'UPI (Direct)', desc: 'Pay directly using any UPI app' },
  { value: 'WALLET', label: 'Wallet Balance', desc: 'Use your Reloom wallet' },
  { value: 'COD', label: 'Cash on Delivery', desc: 'Pay when you receive' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { items, subtotalPaise, fetchCart } = useCartStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentOption>('RAZORPAY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    fullName: '', phone: '', line1: '', line2: '',
    city: '', state: '', postalCode: '',
  });

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchCart();
    apiClient.get<Address[]>('/users/me/addresses').then(setAddresses).catch(() => {});
  }, [user, router, fetchCart]);

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = await apiClient.post<Address>('/users/me/addresses', addressForm);
    setAddresses((prev) => [...prev, addr]);
    setSelectedAddress(addr.id);
    setShowAddressForm(false);
  };

  const placeOrder = async () => {
    if (!selectedAddress) { setError('Select a shipping address'); return; }
    setLoading(true);
    setError(null);
    try {
      const order = await apiClient.post<{ id: string; totalPaise: number; orderNumber: string }>('/orders', {
        shippingAddressId: selectedAddress,
        notes: '',
      });
      await processPayment(order);
    } catch (e: any) {
      setError(e.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (order: { id: string; totalPaise: number; orderNumber: string }) => {
    if (paymentMethod === 'COD' || paymentMethod === 'WALLET') {
      const provider = paymentMethod === 'WALLET' ? 'WALLET' : 'COD';
      await apiClient.post('/payments/intent', { orderId: order.id, provider });
      router.push(`/orders/${order.id}?success=1`);
      return;
    }

    // Razorpay / UPI
    const intent = await apiClient.post<{
      razorpayOrderId: string;
      razorpayKeyId: string;
      amountPaise: number;
      currency: string;
      orderId: string;
    }>('/payments/intent', { orderId: order.id, provider: 'RAZORPAY' });

    const options = {
      key: intent.razorpayKeyId,
      amount: intent.amountPaise,
      currency: intent.currency || 'INR',
      name: 'Reloom',
      description: `Order ${order.orderNumber}`,
      order_id: intent.razorpayOrderId,
      prefill: { email: user?.email, contact: '' },
      theme: { color: '#0f172a' },
      handler: async (response: any) => {
        try {
          await apiClient.post(`/payments/${order.id}/verify`, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          router.push(`/orders/${order.id}?success=1`);
        } catch {
          setError('Payment verification failed. Contact support.');
        }
      },
      modal: {
        ondismiss: () => setLoading(false),
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', (resp: any) => {
      setError(resp.error?.description || 'Payment failed');
    });
    rzp.open();
  };

  const totalPaise = subtotalPaise;

  if (!user) return null;

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Checkout</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
          {/* Shipping Address */}
          <section>
            <h2 className="font-semibold text-ink-900">Shipping address</h2>
            {addresses.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {addresses.map((a) => (
                  <li key={a.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-100 p-4 hover:bg-ink-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddress === a.id}
                        onChange={() => setSelectedAddress(a.id)}
                        className="mt-1 accent-brand-600"
                      />
                      <div>
                        <p className="font-medium text-ink-900">{a.fullName}</p>
                        <p className="text-sm text-ink-500">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                        <p className="text-sm text-ink-500">{a.city}, {a.state} — {a.postalCode}</p>
                        <p className="text-sm text-ink-400">{a.phone}</p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-400">No addresses saved.</p>
            )}
            <button
              type="button"
              className="mt-3 text-sm font-medium text-brand-700 hover:underline"
              onClick={() => setShowAddressForm(!showAddressForm)}
            >
              {showAddressForm ? 'Cancel' : '+ Add new address'}
            </button>
            {showAddressForm && (
              <form onSubmit={saveAddress} className="mt-4 space-y-3 rounded-xl border border-ink-100 bg-ink-50 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required placeholder="Full name" className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={addressForm.fullName} onChange={(e) => setAddressForm((f) => ({ ...f, fullName: e.target.value }))} />
                  <input required placeholder="Phone" className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={addressForm.phone} onChange={(e) => setAddressForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <input required placeholder="Address line 1" className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={addressForm.line1} onChange={(e) => setAddressForm((f) => ({ ...f, line1: e.target.value }))} />
                <input placeholder="Address line 2 (optional)" className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={addressForm.line2} onChange={(e) => setAddressForm((f) => ({ ...f, line2: e.target.value }))} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <input required placeholder="City" className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={addressForm.city} onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))} />
                  <input required placeholder="State" className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={addressForm.state} onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))} />
                  <input required placeholder="PIN code" className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={addressForm.postalCode} onChange={(e) => setAddressForm((f) => ({ ...f, postalCode: e.target.value }))} />
                </div>
                <Button type="submit" variant="brand" size="sm">Save address</Button>
              </form>
            )}
          </section>

          {/* Payment Method */}
          <section>
            <h2 className="font-semibold text-ink-900">Payment method</h2>
            <ul className="mt-3 space-y-2">
              {PAYMENT_METHODS.map((pm) => (
                <li key={pm.value}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-100 p-4 hover:bg-ink-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === pm.value}
                      onChange={() => setPaymentMethod(pm.value)}
                      className="mt-1 accent-brand-600"
                    />
                    <div>
                      <p className="font-medium text-ink-900">{pm.label}</p>
                      <p className="text-sm text-ink-500">{pm.desc}</p>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-semibold text-ink-900">Order summary</h2>
            <ul className="mt-4 space-y-3">
              {items.slice(0, 4).map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span className="truncate text-ink-600">{item.product.title} x{item.quantity}</span>
                  <span className="font-medium">{formatINR(item.pricePaise * item.quantity)}</span>
                </li>
              ))}
              {items.length > 4 && (
                <li className="text-xs text-ink-400">+{items.length - 4} more items</li>
              )}
            </ul>
            <div className="mt-4 border-t border-ink-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-ink-500">Subtotal</span>
                <span className="font-medium">{formatINR(subtotalPaise)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-ink-500">Shipping</span>
                <span className="text-ink-400">Calculated later</span>
              </div>
              <div className="mt-4 flex justify-between border-t border-ink-100 pt-4 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold">{formatINR(totalPaise)}</span>
              </div>
            </div>
            {paymentMethod === 'WALLET' && (
              <p className="mt-3 text-xs text-amber-700">Amount will be debited from your Reloom wallet.</p>
            )}
            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <Button
              variant="brand"
              className="mt-5 w-full"
              size="lg"
              disabled={loading || items.length === 0}
              onClick={placeOrder}
            >
              {loading ? 'Processing…' : paymentMethod === 'COD' ? 'Place order (COD)' : `Pay ${formatINR(totalPaise)}`}
            </Button>
            <p className="mt-3 text-center text-xs text-ink-400">
              Secure payments powered by Razorpay
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
