'use client';

import { useState, useEffect } from 'react';
import { Star, ThumbsUp, User, BadgeCheck, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient, PaginationMeta } from '@/lib/api';
import { cn } from '@/lib/utils';

type Review = {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  mediaUrls?: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  author: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    isVerified: boolean;
  };
};

type Props = {
  productId: string;
};

export function ReviewsList({ productId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ data: Review[]; meta: PaginationMeta }>(`/reviews/product/${productId}`, { revalidate: 60 })
      .then((res) => {
        setReviews(res.data);
        setMeta(res.meta);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const ratingCounts = [0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) ratingCounts[r.rating - 1]++;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40 rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 p-8 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-ink-300" />
        <p className="mt-3 font-medium text-ink-800">No reviews yet</p>
        <p className="mt-1 text-sm text-ink-500">Be the first to review this item.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Rating Summary */}
      <div className="mb-6 flex flex-wrap items-start gap-8">
        <div className="text-center">
          <p className="text-4xl font-bold text-ink-900">{avgRating}</p>
          <div className="mt-1 flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  'h-4 w-4',
                  star <= Math.round(Number(avgRating))
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-ink-200',
                )}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-500">{meta?.total || reviews.length} reviews</p>
        </div>

        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingCounts[star - 1];
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-8 text-xs font-medium text-ink-500">{star}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs text-ink-400">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Cards */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-2xl border border-ink-100 bg-white p-5 transition hover:shadow-soft"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-ink-200 text-sm font-semibold text-ink-600">
                  {review.author.avatarUrl ? (
                    <img src={review.author.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-ink-900">{review.author.username}</span>
                    {review.author.isVerified && (
                      <BadgeCheck className="h-3.5 w-3.5 text-brand-600" />
                    )}
                    {review.isVerifiedPurchase && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Verified purchase
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          'h-3 w-3',
                          star <= review.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-ink-200',
                        )}
                      />
                    ))}
                    <span className="ml-1 text-[11px] text-ink-400">
                      {new Date(review.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {review.title && (
              <p className="mt-3 text-sm font-medium text-ink-900">{review.title}</p>
            )}
            {review.body && (
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{review.body}</p>
            )}

            {review.mediaUrls && review.mediaUrls.length > 0 && (
              <div className="mt-3 flex gap-2">
                {review.mediaUrls.slice(0, 4).map((url, i) => (
                  <div key={i} className="h-16 w-16 overflow-hidden rounded-lg bg-ink-100">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-4 border-t border-ink-50 pt-3">
              <button
                onClick={async () => {
                  try {
                    await apiClient.post(`/reviews/${review.id}/helpful`);
                    setReviews((prev) =>
                      prev.map((r) =>
                        r.id === review.id ? { ...r, helpfulCount: r.helpfulCount + 1 } : r,
                      ),
                    );
                  } catch { /* ignore */ }
                }}
                className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-brand-700"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                Helpful ({review.helpfulCount})
              </button>
            </div>
          </div>
        ))}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => {}}>
            Load more reviews
          </Button>
        </div>
      )}
    </div>
  );
}
