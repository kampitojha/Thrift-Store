'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Trash2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient, ProductLike, PaginationMeta } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';

type WishlistItem = {
  id: string;
  productId: string;
  createdAt: string;
  product: ProductLike;
};

export default function WishlistPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: WishlistItem[]; meta: PaginationMeta }>('/wishlist');
      setItems(res.data);
      setMeta(res.meta);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.push('/sign-in');
      return;
    }
    fetchWishlist();
  }, [user, router, fetchWishlist]);

  const handleRemove = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      await apiClient.post(`/wishlist/${itemId}/toggle`);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch {
      /* ignore */
    } finally {
      setRemovingId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="container-page py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Wishlist</h1>
              <p className="mt-1 text-sm text-ink-500">
                {meta ? `${meta.total} saved item${meta.total !== 1 ? 's' : ''}` : 'Items you love'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/5] rounded-2xl" />
              <Skeleton className="h-4 w-1/3 rounded-lg" />
              <Skeleton className="h-4 w-2/3 rounded-lg" />
              <Skeleton className="h-5 w-1/4 rounded-lg" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Heart className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">Your wishlist is empty</p>
          <p className="mt-2 text-sm text-ink-500">
            Save items you love by tapping the heart icon on any listing.
          </p>
          <Link href="/browse">
            <Button variant="brand" className="mt-6">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Browse marketplace
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <div key={item.id} className="group relative">
                <Link href={`/product/${item.product.slug}`} className="block">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-ink-100">
                    <img
                      src={item.product.thumbnailUrl || 'https://placehold.co/600x750/f2e8db/5d362a?text=TS'}
                      alt={item.product.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    {item.product.condition && (
                      <span className="absolute left-3 top-3 rounded-full bg-ink-900/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                        {item.product.condition.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-1 px-0.5">
                    <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink-900">
                      {item.product.title}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[15px] font-semibold tracking-tight text-ink-900">
                        {formatINR(item.product.pricePaise)}
                      </span>
                      {item.product.originalPricePaise &&
                        item.product.originalPricePaise > item.product.pricePaise && (
                          <span className="text-xs text-ink-400 line-through">
                            {formatINR(item.product.originalPricePaise)}
                          </span>
                        )}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={removingId === item.id}
                  className={cn(
                    'absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full',
                    'bg-white/90 text-ink-600 shadow-soft backdrop-blur transition',
                    'hover:bg-red-50 hover:text-red-600',
                    removingId === item.id && 'opacity-50',
                  )}
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={!meta.hasPrev}
                onClick={() => fetchWishlist()}
              >
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
