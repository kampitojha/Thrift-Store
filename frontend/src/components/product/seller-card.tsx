'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, MessageCircle, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api';

export function SellerCard({
  seller,
}: {
  seller: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    isVerified?: boolean;
    city?: string | null;
    bio?: string | null;
    profile?: { averageRating?: number; itemsSold?: number; totalReviews?: number } | null;
    sellerProfile?: {
      storeName?: string | null;
      storeSlug?: string | null;
      verificationStatus?: string;
      rating?: number;
      totalSales?: number;
    } | null;
  } | null;
}) {
  const user = useAuthStore((s) => s.user);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  if (!seller) return null;

  const storeSlug = seller.sellerProfile?.storeSlug || seller.username;
  const storeName = seller.sellerProfile?.storeName || seller.displayName || seller.username;
  const rating = seller.sellerProfile?.rating || seller.profile?.averageRating;
  const sales = seller.sellerProfile?.totalSales ?? seller.profile?.itemsSold ?? 0;

  const toggleFollow = async () => {
    if (!user) return;
    setFollowLoading(true);
    try {
      if (following) {
        await apiClient.delete(`/sellers/store/${storeSlug}/follow`);
        setFollowing(false);
      } else {
        await apiClient.post(`/sellers/store/${storeSlug}/follow`);
        setFollowing(true);
      }
    } catch { /* ignore */ } finally { setFollowLoading(false); }
  };

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Seller</p>
      <div className="mt-3 flex items-start justify-between gap-3">
        <Link href={`/store/${storeSlug}`} className="flex items-center gap-3 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-100 text-sm font-semibold text-ink-700">
            {seller.avatarUrl ? (
              <img src={seller.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              storeName.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium text-ink-900">{storeName}</span>
              {seller.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" />}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-500">
              {rating ? <span>★ {rating.toFixed(1)}</span> : null}
              <span>{sales} sale{sales !== 1 ? 's' : ''}</span>
              {seller.city && <span>{seller.city}</span>}
            </div>
          </div>
        </Link>
        <div className="flex shrink-0 gap-1.5">
          {user && user.id !== seller.id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFollow}
              disabled={followLoading}
            >
              {following ? 'Following' : 'Follow'}
            </Button>
          )}
          <Link href={`/store/${storeSlug}`}>
            <Button variant="outline" size="sm" aria-label="Visit store">
              <Store className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
      {seller.bio && (
        <p className="mt-3 text-xs leading-relaxed text-ink-500 line-clamp-2">{seller.bio}</p>
      )}
      <Link
        href={`/store/${storeSlug}`}
        className="mt-3 block text-center text-sm font-medium text-brand-700 hover:underline"
      >
        View store
      </Link>
    </div>
  );
}
