'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Loader2, ChevronLeft, ChevronRight, UserPlus, Calendar } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Follower = {
  id: string; createdAt: string;
  user: { id: string; username: string; displayName?: string; avatarUrl?: string; isVerified?: boolean };
};

export default function FollowersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchFollowers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      const res = await apiClient.get<{ data: Follower[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(`/sellers/followers?${params}`);
      setFollowers(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load followers');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchFollowers();
  }, [user, fetchFollowers, router]);

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Followers</h1>
          <p className="text-sm text-ink-500">{total} follower{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 animate-pulse">
              <div className="h-12 w-12 rounded-full bg-ink-100" />
              <div className="flex-1 space-y-2"><div className="h-4 w-40 rounded bg-ink-100" /><div className="h-3 w-24 rounded bg-ink-100" /></div>
            </div>
          ))}
        </div>
      ) : followers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-16 text-center">
          <Heart className="mx-auto h-12 w-12 text-ink-300" />
          <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">No followers yet</h3>
          <p className="mt-2 text-sm text-ink-500">When users follow your store, they&apos;ll appear here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {followers.map((f) => (
              <div key={f.id} className="rounded-2xl border border-ink-100 bg-white p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-ink-100 flex items-center justify-center text-base font-semibold text-ink-600 shrink-0">
                  {f.user.username?.slice(0, 2).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-ink-900 truncate">{f.user.displayName || f.user.username}</span>
                    {f.user.isVerified && <Badge variant="brand" className="text-[9px] px-1 py-0">✓</Badge>}
                  </div>
                  <p className="text-xs text-ink-500">@{f.user.username}</p>
                  <p className="text-xs text-ink-400 mt-0.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Followed {new Date(f.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-ink-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
