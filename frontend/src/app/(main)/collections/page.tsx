'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Folder, Eye, EyeOff, MoreVertical, Trash2, Edit, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient, PaginationMeta } from '@/lib/api';
import { cn } from '@/lib/utils';

type Collection = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  coverUrl?: string | null;
  isPublic: boolean;
  createdAt: string;
  _count: { items: number };
};

export default function CollectionsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchCollections();
  }, [user, router]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: Collection[]; meta: PaginationMeta }>('/collections');
      setCollections(res.data);
    } catch { setCollections([]); } finally { setLoading(false); }
  };

  const createCollection = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const col = await apiClient.post<Collection>('/collections', {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      });
      setCollections((prev) => [col, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
    } catch { /* ignore */ } finally { setCreating(false); }
  };

  const deleteCollection = async (id: string) => {
    if (!confirm('Delete this collection?')) return;
    try {
      await apiClient.delete(`/collections/${id}`);
      setCollections((prev) => prev.filter((c) => c.id !== id));
    } catch {}
    setMenuId(null);
  };

  const togglePublic = async (id: string) => {
    try {
      const updated = await apiClient.patch<Collection>(`/collections/${id}/toggle-public`);
      setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, isPublic: updated.isPublic } : c)));
    } catch {}
    setMenuId(null);
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
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">My Collections</h1>
            <p className="mt-1 text-sm text-ink-500">{collections.length} collection{collections.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button variant="brand" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New
        </Button>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="mb-6 rounded-2xl border border-ink-200 bg-white p-6 shadow-lg">
          <h3 className="font-display text-lg font-semibold text-ink-900">Create collection</h3>
          <div className="mt-4 space-y-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Collection name"
              autoFocus
            />
            <Textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setNewName(''); setNewDesc(''); }}>
                Cancel
              </Button>
              <Button variant="brand" size="sm" onClick={createCollection} disabled={!newName.trim() || creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Folder className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No collections yet</p>
          <p className="mt-2 text-sm text-ink-500">Create collections to organize your favorite items.</p>
          <Button variant="brand" className="mt-6" onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create collection
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={`/collections/${col.id}`}
              className="group relative overflow-hidden rounded-2xl border border-ink-100 bg-white transition hover:shadow-soft"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center">
                {col.coverUrl ? (
                  <img src={col.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Folder className="h-10 w-10 text-brand-300" />
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <p className="truncate font-medium text-ink-900">{col.name}</p>
                  {col.isPublic ? (
                    <Eye className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ink-500">{col._count.items} item{col._count.items !== 1 ? 's' : ''}</p>
              </div>
              <div className="absolute right-2 top-2">
                <button
                  onClick={(e) => { e.preventDefault(); setMenuId(menuId === col.id ? null : col.id); }}
                  className="rounded-full bg-white/80 p-1.5 text-ink-400 opacity-0 transition group-hover:opacity-100 hover:bg-white hover:text-ink-700"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuId === col.id && (
                  <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-xl border border-ink-100 bg-white py-1 shadow-lg">
                    <button onClick={() => togglePublic(col.id)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
                      {col.isPublic ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {col.isPublic ? 'Make private' : 'Make public'}
                    </button>
                    <button onClick={() => deleteCollection(col.id)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
