'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export function WishlistButton({
  productId,
  initialWishlisted = false,
  className,
  variant = 'default',
}: {
  productId: string;
  initialWishlisted?: boolean;
  className?: string;
  variant?: 'default' | 'compact';
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { router.push('/sign-in'); return; }
    setLoading(true);
    try {
      const res = await apiClient.post<{ wishlisted: boolean }>(`/wishlist/${productId}/toggle`);
      setWishlisted(res.wishlisted);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full transition',
          wishlisted ? 'text-red-500' : 'text-ink-400 hover:text-red-400',
          className,
        )}
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart className={cn('h-5 w-5', wishlisted && 'fill-current')} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full border transition',
        wishlisted
          ? 'border-red-200 bg-red-50 text-red-500'
          : 'border-ink-200 text-ink-400 hover:border-ink-300 hover:text-ink-600',
        className,
      )}
      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart className={cn('h-5 w-5', wishlisted && 'fill-current')} />
    </button>
  );
}
