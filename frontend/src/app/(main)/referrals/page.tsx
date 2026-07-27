'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Users, Gift, Share2, Copy, Check, TrendingUp, UserPlus, Clock, Zap } from 'lucide-react';

type ReferralDashboard = {
  code: string | null;
  referrals: Array<{
    id: string; status: string; rewardPaise: number; rewardPoints: number; createdAt: string;
    referee: { id: string; username: string; displayName: string | null; avatarUrl: string | null; createdAt: string };
  }>;
  stats: { totalReferrals: number; completed: number; pending: number; conversionRate: number; totalRewardPaise: number; totalRewardPoints: number };
};

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  const fetchData = () => {
    setLoading(true);
    apiClient.get<ReferralDashboard>('/growth/referrals/dashboard')
      .then(setData)
      .catch(() => setError('Failed to load referral data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const copyCode = async () => {
    if (!data?.code) return;
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = data.code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareVia = (platform: string) => {
    if (!data?.code) return;
    const text = `Join me on Thrift Store - the best thrift marketplace! Use my referral code: ${data.code}`;
    const url = `${window.location.origin}/sign-up?ref=${data.code}`;
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(text)}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank', 'noopener,noreferrer');
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  const referralLink = data?.code ? `${window.location.origin}/sign-up?ref=${data.code}` : '';

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
            <Users className="h-6 w-6 text-brand-600" /> Refer & Earn
          </h1>
          <p className="mt-1 text-sm text-ink-500">Invite friends and earn rewards together</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Referrals', value: data?.stats.totalReferrals || 0, icon: Users, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Completed', value: data?.stats.completed || 0, icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Conversion Rate', value: `${data?.stats.conversionRate || 0}%`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Rewards Earned', value: `₹${((data?.stats.totalRewardPaise || 0) / 100).toFixed(0)}`, icon: Gift, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{card.label}</p>
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', card.bg)}>
                <card.icon className={cn('h-4 w-4', card.color)} />
              </div>
            </div>
            <p className={cn('mt-2 text-2xl font-bold', card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Referral Code */}
      {data?.code && (
        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4"><Gift className="h-3.5 w-3.5" /> Your Referral Code</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-ink-50 px-5 py-3">
              <span className="font-mono text-2xl font-bold tracking-wider text-brand-600 select-all">{data.code}</span>
              <Button variant="ghost" size="icon" onClick={copyCode} aria-label={copied ? 'Copied' : 'Copy referral code'}>
                {copied ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
              </Button>
            </div>
            <div className="text-sm text-ink-500">or share via:</div>
            {['whatsapp', 'telegram', 'facebook', 'pinterest'].map((platform) => (
              <Button key={platform} variant="outline" size="sm" onClick={() => shareVia(platform)} className="capitalize">
                <Share2 className="h-4 w-4 mr-1.5" /> {platform}
              </Button>
            ))}
          </div>
          {referralLink && (
            <div className="mt-3">
              <p className="text-xs text-ink-400 mb-1">Referral link:</p>
              <code className="text-sm text-ink-600 bg-ink-50 px-3 py-1.5 rounded-lg break-all select-all">{referralLink}</code>
            </div>
          )}
        </section>
      )}

      {/* How It Works */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4"><Zap className="h-3.5 w-3.5" /> How It Works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { step: '1', title: 'Share Your Code', desc: 'Share your unique referral code with friends', icon: Share2 },
            { step: '2', title: 'They Sign Up', desc: 'Your friend signs up using your referral code', icon: UserPlus },
            { step: '3', title: 'Earn Rewards', desc: 'Get ₹50 and 200 loyalty points when they make their first purchase', icon: Gift },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 mb-3">
                <item.icon className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-ink-900">{item.title}</p>
              <p className="mt-1 text-xs text-ink-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Referral List */}
      {data?.referrals && data.referrals.length > 0 && (
        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4"><Clock className="h-3.5 w-3.5" /> Referral History</h2>
          <div className="space-y-2">
            {data.referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between py-2 border-b border-ink-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-ink-600">
                    {(ref.referee.displayName || ref.referee.username || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{ref.referee.displayName || ref.referee.username}</p>
                    <p className="text-xs text-ink-400">Joined {new Date(ref.referee.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <Badge variant={ref.status === 'completed' ? 'success' : 'outline'}>{ref.status === 'completed' ? `+₹${(ref.rewardPaise / 100).toFixed(0)}` : 'Pending'}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state when no referrals */}
      {(!data?.referrals || data.referrals.length === 0) && (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Users className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No referrals yet</p>
          <p className="text-sm text-ink-500">Share your referral code to start earning rewards</p>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8" role="status" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-4"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div>
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6" role="alert">
      <div className="text-center">
        <Users className="mx-auto h-12 w-12 text-amber-400" />
        <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Retry</Button>
      </div>
    </div>
  );
}
