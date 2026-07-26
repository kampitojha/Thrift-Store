'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Award, ChevronRight, Gift, Heart, Medal, Star, TrendingUp, Zap, Store, ShoppingBag, Share2, MessageSquare, Clock } from 'lucide-react';

type LoyaltyData = {
  points: number; coins: number; level: number; badges: string[];
  nextLevelXp: number; progress: number;
  recentTransactions: Array<{ id: string; points: number; reason: string; createdAt: string }>;
};

type Reward = { id: string; name: string; description: string; pointsCost: number; type: string; value: number };

const BADGE_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  first_purchase: { label: 'First Purchase', icon: <ShoppingBag className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  collector: { label: 'Collector', icon: <Heart className="h-4 w-4" />, color: 'bg-pink-100 text-pink-800 border-pink-200' },
  power_shopper: { label: 'Power Shopper', icon: <Zap className="h-4 w-4" />, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  reviewer: { label: 'Reviewer', icon: <MessageSquare className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  social_butterfly: { label: 'Social Butterfly', icon: <Share2 className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  trendsetter: { label: 'Trendsetter', icon: <Star className="h-4 w-4" />, color: 'bg-rose-100 text-rose-800 border-rose-200' },
  top_seller: { label: 'Top Seller', icon: <Medal className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  referral_star: { label: 'Referral Star', icon: <Award className="h-4 w-4" />, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  loyal_customer: { label: 'Loyal Customer', icon: <Heart className="h-4 w-4" />, color: 'bg-red-100 text-red-800 border-red-200' },
};

const LEVEL_NAMES = ['Newcomer', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite', 'Legend', 'Mythic', 'Transcendent'];

export default function LoyaltyPage() {
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      apiClient.get<LoyaltyData>('/growth/loyalty'),
      apiClient.get<Reward[]>('/growth/loyalty/rewards'),
    ])
      .then(([loyalty, rewardsData]) => { setData(loyalty); setRewards(rewardsData); })
      .catch(() => setError('Failed to load loyalty data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const redeemReward = async (reward: Reward) => {
    setRedeeming(reward.id);
    try {
      const res = await apiClient.post<{ success: boolean; error?: string }>('/growth/loyalty/redeem', { points: reward.pointsCost, rewardType: reward.type, reference: reward.id });
      if (res.success) { setToast({ message: `Redeemed ${reward.name}!` }); fetchData(); }
      else setToast({ message: res.error || 'Failed to redeem', error: true });
    } catch { setToast({ message: 'Failed to redeem reward', error: true }); }
    finally { setRedeeming(null); }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  const levelName = LEVEL_NAMES[Math.min((data?.level || 1) - 1, LEVEL_NAMES.length - 1)];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-up" role="alert">
          <div className={cn('flex items-center gap-2.5 rounded-2xl border px-5 py-3 shadow-lift', toast.error ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50')}>
            <span className={cn('text-sm font-medium', toast.error ? 'text-red-800' : 'text-emerald-800')}>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Award className="h-6 w-6 text-brand-600" /> Loyalty Program
          </h1>
          <p className="mt-1 text-sm text-ink-500">Earn points, level up, and unlock rewards</p>
        </div>
      </div>

      {/* Level & Points Card */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 p-6 text-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-white/20 text-white border-white/30 text-xs">{levelName}</Badge>
              <Badge className="bg-white/20 text-white border-white/30 text-xs">Level {data?.level || 1}</Badge>
            </div>
            <p className="text-4xl font-bold mt-2">{data?.points?.toLocaleString() || 0}</p>
            <p className="text-sm text-white/70 mt-1">Total Points</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{data?.coins || 0}</p>
            <p className="text-sm text-white/70">Coins</p>
          </div>
        </div>
        {data && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>Level {data.level}</span>
              <span>Next level: {data.nextLevelXp.toLocaleString()} XP</span>
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${data.progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Badges */}
      {data && data.badges?.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4"><Medal className="h-3.5 w-3.5" /> Badges Earned</h2>
          <div className="flex flex-wrap gap-2">
            {data.badges.map((b) => {
              const badgeDef = BADGE_MAP[b] || { label: b, icon: <Award className="h-4 w-4" />, color: 'bg-ink-100 text-ink-800 border-ink-200' };
              return (
                <Badge key={b} variant="outline" className={cn('flex items-center gap-1.5 px-3 py-1.5', badgeDef.color)}>
                  {badgeDef.icon} {badgeDef.label}
                </Badge>
              );
            })}
          </div>
        </section>
      )}

      {/* Earn Points Guide */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4"><Zap className="h-3.5 w-3.5" /> How to Earn Points</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { action: 'signup', label: 'Sign Up', points: 100 },
            { action: 'first_purchase', label: 'First Purchase', points: 500 },
            { action: 'purchase', label: 'Each Purchase', points: 100 },
            { action: 'review', label: 'Write a Review', points: 50 },
            { action: 'daily_login', label: 'Daily Login', points: 10 },
            { action: 'refer_friend', label: 'Refer a Friend', points: 200 },
            { action: 'social_share', label: 'Share a Product', points: 20 },
            { action: 'complete_profile', label: 'Complete Profile', points: 50 },
          ].map((item) => (
            <div key={item.action} className="flex items-center justify-between rounded-xl border border-ink-100 p-3">
              <span className="text-sm text-ink-700">{item.label}</span>
              <Badge variant="brand">+{item.points} pts</Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Rewards Store */}
      {rewards.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4"><Gift className="h-3.5 w-3.5" /> Rewards Store</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((reward) => (
              <div key={reward.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-ink-500">{reward.pointsCost.toLocaleString()} points</Badge>
                </div>
                <h3 className="font-semibold text-ink-900">{reward.name}</h3>
                <p className="mt-1 text-sm text-ink-500">{reward.description}</p>
                <Button
                  variant={data && data.points >= reward.pointsCost ? 'brand' : 'outline'}
                  size="sm"
                  className="mt-3 w-full"
                  disabled={!data || data.points < reward.pointsCost || redeeming === reward.id}
                  onClick={() => redeemReward(reward)}
                >
                  {redeeming === reward.id ? 'Redeeming...' : data && data.points >= reward.pointsCost ? 'Redeem' : `Need ${reward.pointsCost - (data?.points || 0)} more`}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {data && data.recentTransactions?.length > 0 && (
        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4"><Clock className="h-3.5 w-3.5" /> Recent Activity</h2>
          <div className="space-y-2">
            {data.recentTransactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-ink-50 last:border-0">
                <div>
                  <p className="text-sm text-ink-700">{tx.reason}</p>
                  <p className="text-xs text-ink-400">{new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <Badge variant={tx.points > 0 ? 'brand' : 'default'}>{tx.points > 0 ? '+' : ''}{tx.points} pts</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8" role="status" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6" role="alert">
      <div className="text-center">
        <Award className="mx-auto h-12 w-12 text-amber-400" />
        <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Retry</Button>
      </div>
    </div>
  );
}
