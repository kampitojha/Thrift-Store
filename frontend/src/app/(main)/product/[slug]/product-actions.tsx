'use client';

import { useState } from 'react';
import { Heart, MessageCircle, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';

export function ProductActions({ productId, isDemo }: { productId: string; slug: string; isDemo?: boolean }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const addItem = useCartStore((s) => s.addItem);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const addToCart = async () => {
    if (!user) {
      router.push('/sign-in');
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      await addItem(productId, 1);
      setMsg('Added to bag');
    } catch {
      setMsg('Could not add — try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          variant="brand"
          className="flex-1"
          disabled={loading || isDemo}
          onClick={addToCart}
          title={isDemo ? 'Sign in to purchase this item' : undefined}
        >
          <ShoppingBag className="h-4 w-4" />
          {loading ? 'Adding…' : isDemo ? 'Sign in to purchase' : 'Add to bag'}
        </Button>
        <Button size="lg" variant="outline" className="flex-1" onClick={() => router.push('/messages')}>
          <MessageCircle className="h-4 w-4" />
          Message seller
        </Button>
        <Button size="lg" variant="ghost" className="sm:w-auto" aria-label="Wishlist">
          <Heart className="h-4 w-4" />
        </Button>
      </div>
      {msg && <p className="text-sm text-brand-700">{msg}</p>}
    </div>
  );
}
