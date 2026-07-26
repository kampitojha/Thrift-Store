'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Beaker, Plus, RefreshCcw, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';

type Experiment = {
  id: string; key: string; name: string; description: string | null;
  enabled: boolean; createdAt: string;
  metric?: string; hypothesis?: string;
  variants?: Array<{ name: string; config: Record<string, unknown>; trafficPct: number }>;
};

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    apiClient.get<Experiment[]>('/growth/experiments')
      .then(setExperiments)
      .catch(() => setError('Failed to load experiments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const toggleExperiment = async (key: string, currentEnabled: boolean) => {
    setToggling(key);
    try {
      await apiClient.patch(`/growth/experiments/${key}/toggle`, { enabled: !currentEnabled });
      setExperiments((prev) => prev.map((e) => e.key === key ? { ...e, enabled: !currentEnabled } : e));
    } catch { setError('Failed to toggle experiment'); }
    finally { setToggling(null); }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Beaker className="h-6 w-6 text-brand-600" /> A/B Experiments
          </h1>
          <p className="mt-1 text-sm text-ink-500">Run experiments to optimize the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}><RefreshCcw className="mr-1.5 h-4 w-4" /> Refresh</Button>
      </div>

      {experiments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Beaker className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No experiments running</p>
          <p className="text-sm text-ink-500">Create your first A/B test to optimize the platform</p>
        </div>
      ) : (
        <div className="space-y-4">
          {experiments.map((exp) => (
            <div key={exp.id} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-ink-900">{exp.name}</h3>
                    <Badge variant={exp.enabled ? 'success' : 'outline'}>{exp.enabled ? 'Active' : 'Paused'}</Badge>
                  </div>
                  {exp.description && <p className="text-sm text-ink-500 mb-2">{exp.description}</p>}
                  {exp.metric && <p className="text-xs text-ink-400 mb-2">Metric: <span className="font-medium text-ink-600">{exp.metric}</span></p>}
                  {exp.hypothesis && <p className="text-xs text-ink-400 italic">"{exp.hypothesis}"</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExperiment(exp.key, exp.enabled)}
                  disabled={toggling === exp.key}
                  aria-label={exp.enabled ? 'Pause experiment' : 'Activate experiment'}
                >
                  {exp.enabled ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-ink-300" />}
                </Button>
              </div>
              {exp.variants && exp.variants.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {exp.variants.map((v) => (
                    <Badge key={v.name} variant="outline" className="text-xs">
                      {v.name}: {v.trafficPct}%
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-3 text-xs text-ink-400">
                Created {new Date(exp.createdAt).toLocaleDateString('en-IN')}
              </div>
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
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
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
