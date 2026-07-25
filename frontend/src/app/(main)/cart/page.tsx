'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api';
import { formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, Heart, Trash2, Minus, Plus, ArrowLeft, Shield, Truck } from 'lucide-react';

export default function CartPage() {
  const user = useAuthStore((s) => s.user);
  const { items, subtotalPaise, fetchCart, updateItem, removeItem, loading } = useCartStore();
  const [savedItems, setSavedItems] = useState<Array<{ id: string; title: string; pricePaise: number; slug: string; thumbnailUrl?: string }>>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchCart();
  }, [user, fetchCart]);

  const handleDecrease = async (itemId: string, currentQty: number) => {
    await updateItem(itemId, currentQty - 1);
  };

  const handleIncrease = async (itemId: string, currentQty: number) => {
    await updateItem(itemId, currentQty + 1);
  };

  const handleMoveToWishlist = async (productId: string, cartItemId: string) => {
    try {
      await apiClient.post(`/wishlist/${productId}/toggle`);
      await removeItem(cartItemId);
    } catch { /* ignore */ }
  };

  const handleRemove = async (itemId: string) => {
    setRemovingId(itemId);
    await removeItem(itemId);
    setRemovingId(null);
  };

  if (!user) {
    return (
      <div className="container-page py-24 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-ink-300" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Your bag</h1>
        <p className="mt-2 text-ink-500">Sign in to view your cart.</p>
        <Link href="/sign-in" className="mt-6 inline-block">
          <Button variant="brand">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="rounded-full p-2 text-ink-400 hover:bg-ink-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Your bag</h1>
          <p className="mt-1 text-sm text-ink-500">
            {loading ? 'Loading…' : items.length === 0 ? 'Your bag is empty' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 && savedItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">Your bag is empty</p>
          <p className="mt-2 text-sm text-ink-500">Items you add to your cart will appear here.</p>
          <Link href="/browse">
            <Button variant="brand" className="mt-6">Continue shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft transition hover:shadow-lift"
              >
                <Link href={`/product/${item.product.slug}`} className="shrink-0">
                  <div className="h-28 w-24 overflow-hidden rounded-xl bg-ink-100">
                    {item.product.thumbnailUrl && (
                      <img src={item.product.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="font-medium text-ink-900 hover:underline line-clamp-2"
                  >
                    {item.product.title}
                  </Link>
                  <p className="mt-1 text-lg font-semibold text-ink-900">{formatINR(item.pricePaise)}</p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center rounded-xl border border-ink-200">
                      <button
                        onClick={() => handleDecrease(item.id, item.quantity)}
                        className="flex h-8 w-8 items-center justify-center text-ink-500 hover:text-ink-900"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="flex h-8 w-8 items-center justify-center text-sm font-medium text-ink-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleIncrease(item.id, item.quantity)}
                        className="flex h-8 w-8 items-center justify-center text-ink-500 hover:text-ink-900"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={removingId === item.id}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                    <button
                      onClick={() => handleMoveToWishlist(item.productId, item.id)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink-500 hover:bg-ink-100"
                    >
                      <Heart className="h-3.5 w-3.5" />
                      Move to wishlist
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
                <h2 className="font-semibold text-ink-900">Order summary</h2>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-500">Subtotal</span>
                    <span className="font-medium">{formatINR(subtotalPaise)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-500">Shipping</span>
                    <span className="text-ink-400">Calculated at checkout</span>
                  </div>
                </div>
                <div className="mt-4 border-t border-ink-100 pt-4">
                  <div className="flex justify-between text-base font-semibold">
                    <span>Estimated total</span>
                    <span>{formatINR(subtotalPaise)}</span>
                  </div>
                </div>
                <Link href="/checkout">
                  <Button variant="brand" className="mt-4 w-full" size="lg" disabled={items.length === 0}>
                    Checkout · {formatINR(subtotalPaise)}
                  </Button>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="rounded-2xl border border-ink-100 bg-white p-4">
                <div className="flex items-center gap-2.5 text-sm">
                  <Shield className="h-5 w-5 shrink-0 text-brand-600" />
                  <span className="text-ink-600">Buyer protection on every order</span>
                </div>
                <div className="mt-2 flex items-center gap-2.5 text-sm">
                  <Truck className="h-5 w-5 shrink-0 text-brand-600" />
                  <span className="text-ink-600">Free shipping on orders over ₹999</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved for later */}
      {savedItems.length > 0 && (
        <div className="mt-12 border-t border-ink-100 pt-8">
          <h2 className="font-display text-xl font-semibold text-ink-900">Saved for later</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {savedItems.map((item) => (
              <Link key={item.id} href={`/product/${item.slug}`} className="group">
                <div className="aspect-[4/5] overflow-hidden rounded-xl bg-ink-100">
                  <img src={item.thumbnailUrl || 'https://placehold.co/400x500'} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
                <p className="mt-2 text-sm font-medium text-ink-900 truncate">{item.title}</p>
                <p className="text-sm font-semibold">{formatINR(item.pricePaise)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
