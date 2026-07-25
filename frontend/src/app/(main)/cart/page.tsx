'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function CartPage() {
  const user = useAuthStore((s) => s.user);
  const { items, subtotalPaise, fetchCart, removeItem, loading } = useCartStore();

  useEffect(() => {
    if (user) fetchCart();
  }, [user, fetchCart]);

  if (!user) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">Your bag</h1>
        <p className="mt-2 text-ink-500">Sign in to view your cart.</p>
        <Link href="/sign-in" className="mt-6 inline-block">
          <Button variant="brand">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Your bag</h1>
      {loading && <p className="mt-4 text-sm text-ink-500">Loading…</p>}

      {!loading && items.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-ink-200 py-20 text-center">
          <p className="text-ink-600">Your bag is empty</p>
          <Link href="/browse" className="mt-4 inline-block text-sm font-medium text-brand-700">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-3">
          <ul className="space-y-4 lg:col-span-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft"
              >
                <div className="h-24 w-20 shrink-0 rounded-xl bg-ink-100" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="font-medium text-ink-900 hover:underline"
                  >
                    {item.product.title}
                  </Link>
                  <p className="mt-1 text-sm font-semibold">{formatINR(item.pricePaise)}</p>
                  <p className="text-xs text-ink-400">Qty {item.quantity}</p>
                  <button
                    type="button"
                    className="mt-2 text-xs text-red-600 hover:underline"
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="h-fit rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-semibold text-ink-900">Order summary</h2>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-ink-500">Subtotal</span>
              <span className="font-medium">{formatINR(subtotalPaise)}</span>
            </div>
            <p className="mt-2 text-xs text-ink-400">Shipping calculated at checkout</p>
            <Link href="/checkout" className="mt-6 block">
              <Button variant="brand" className="w-full">
                Checkout
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
