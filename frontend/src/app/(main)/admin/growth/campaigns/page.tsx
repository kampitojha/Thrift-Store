'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Megaphone, Plus, RefreshCcw, AlertTriangle, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';

type Campaign = {
  id: string; name: string; type: string; status: string; progress: number;
  channel: string; segments: string[]; createdAt: string;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    apiClient.get<{ campaigns: Campaign[]; total: number }>('/growth/campaigns')
      .then((res) => setCampaigns(res.campaigns))
      .catch(() => setError('Failed to load campaigns'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  const statusColors: Record<string, string> = { pending: 'bg-amber-100 text-amber-800', completed: 'bg-emerald-100 text-emerald-800', running: 'bg-blue-100 text-blue-800', paused: 'bg-ink-100 text-ink-600', failed: 'bg-red-100 text-red-800' };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Megaphone className="h-6 w-6 text-brand-600" /> Campaigns
          </h1>
          <p className="mt-1 text-sm text-ink-500">Marketing automation campaigns</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}><RefreshCcw className="mr-1.5 h-4 w-4" /> Refresh</Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No campaigns yet</p>
          <p className="text-sm text-ink-500">Create automated campaigns to engage users</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-ink-900">{campaign.name}</h3>
                    <Badge className={cn('text-xs', statusColors[campaign.status] || 'bg-ink-100 text-ink-800')}>{campaign.status}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{campaign.channel}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-400">
                    <span>Type: {campaign.type}</span>
                    {campaign.segments?.length > 0 && <span>Segments: {campaign.segments.join(', ')}</span>}
                    <span>Created: {new Date(campaign.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              </div>
              {campaign.status === 'running' && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-ink-400 mb-1"><span>Progress</span><span>{campaign.progress}%</span></div>
                  <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${campaign.progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-8" role="status" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6" role="alert">
      <div className="text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
        <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Retry</Button>
      </div>
    </div>
  );
}
