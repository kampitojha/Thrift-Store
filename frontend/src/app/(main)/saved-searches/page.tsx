'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Bell, BellOff, Trash2, Plus, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient, PaginationMeta } from '@/lib/api';
import { cn } from '@/lib/utils';

type SavedSearch = {
  id: string;
  query: string;
  filters?: Record<string, unknown> | null;
  alertOn: boolean;
  createdAt: string;
};

export default function SavedSearchesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newQuery, setNewQuery] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchSearches();
  }, [user, router]);

  const fetchSearches = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: SavedSearch[]; meta: PaginationMeta }>('/saved-searches');
      setSearches(res.data);
    } catch { setSearches([]); } finally { setLoading(false); }
  };

  const createSearch = async () => {
    if (!newQuery.trim()) return;
    setCreating(true);
    try {
      const s = await apiClient.post<SavedSearch>('/saved-searches', { query: newQuery.trim() });
      setSearches((prev) => [s, ...prev]);
      setShowCreate(false);
      setNewQuery('');
    } catch { /* ignore */ } finally { setCreating(false); }
  };

  const toggleAlert = async (id: string) => {
    try {
      const updated = await apiClient.patch<SavedSearch>(`/saved-searches/${id}/toggle-alert`);
      setSearches((prev) => prev.map((s) => (s.id === id ? { ...s, alertOn: updated.alertOn } : s)));
    } catch {}
  };

  const deleteSearch = async (id: string) => {
    if (!confirm('Delete this saved search?')) return;
    try {
      await apiClient.delete(`/saved-searches/${id}`);
      setSearches((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  };

  if (!user) return null;

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Saved Searches</h1>
            <p className="mt-1 text-sm text-ink-500">{searches.length} saved search{searches.length !== 1 ? 'es' : ''}</p>
          </div>
        </div>
        <Button variant="brand" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New
        </Button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-2xl border border-ink-200 bg-white p-6 shadow-lg">
          <h3 className="font-display text-lg font-semibold text-ink-900">Save a search</h3>
          <div className="mt-4 flex gap-2">
            <Input
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createSearch(); }}
              placeholder="e.g. Nike sneakers under ₹2000"
              autoFocus
              className="flex-1"
            />
            <Button variant="brand" size="sm" onClick={createSearch} disabled={!newQuery.trim() || creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setShowCreate(false); setNewQuery(''); }}>
            Cancel
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : searches.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Search className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No saved searches</p>
          <p className="mt-2 text-sm text-ink-500">Save a search to get notified when new items match.</p>
          <Button variant="brand" className="mt-6" onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Save a search
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {searches.map((s) => (
            <div key={s.id} className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 transition hover:bg-ink-50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <Search className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{s.query}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  Saved {new Date(s.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Link href={`/browse?q=${encodeURIComponent(s.query)}`}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
                <button
                  onClick={() => toggleAlert(s.id)}
                  className={cn(
                    'rounded-full p-2 transition',
                    s.alertOn ? 'bg-brand-100 text-brand-700' : 'text-ink-400 hover:bg-ink-100',
                  )}
                  title={s.alertOn ? 'Disable alerts' : 'Enable alerts'}
                >
                  {s.alertOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => deleteSearch(s.id)}
                  className="rounded-full p-2 text-ink-400 transition hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
