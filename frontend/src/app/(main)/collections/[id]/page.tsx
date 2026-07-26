'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Folder, Plus, Trash2, GripVertical, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api';
import { formatINR } from '@/lib/utils';
import { cn } from '@/lib/utils';

type CollectionDetail = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  coverUrl?: string | null;
  isPublic: boolean;
  createdAt: string;
  user: { id: string; username: string; displayName?: string | null; avatarUrl?: string | null };
  items: Array<{
    id: string;
    sortOrder: number;
    product: {
      id: string;
      title: string;
      pricePaise: number;
      status: string;
      slug: string;
    };
  }>;
  _count: { items: number };
};

export default function CollectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const collectionId = params.id as string;
  const user = useAuthStore((s) => s.user);
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    apiClient
      .get<CollectionDetail>(`/collections/${collectionId}`)
      .then(setCollection)
      .catch(() => router.push('/collections'))
      .finally(() => setLoading(false));
  }, [user, router, collectionId]);

  const removeItem = async (productId: string) => {
    try {
      await apiClient.delete(`/collections/${collectionId}/items/${productId}`);
      setCollection((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((i) => i.product.id !== productId),
          _count: { items: prev._count.items - 1 },
        };
      });
    } catch {}
  };

  if (!user) return null;

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/collections" className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {loading ? (
          <Skeleton className="h-8 w-48" />
        ) : collection ? (
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">{collection.name}</h1>
            <p className="mt-1 text-sm text-ink-500">
              {collection._count.items} item{collection._count.items !== 1 ? 's' : ''}
              {collection.description && ` · ${collection.description}`}
            </p>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      ) : !collection || collection.items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Folder className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No items in this collection</p>
          <p className="mt-2 text-sm text-ink-500">Browse products and add them to this collection.</p>
          <Link href="/browse">
            <Button variant="brand" className="mt-6">Browse items</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {collection.items.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-2xl border border-ink-100 bg-white">
              <Link href={`/products/${item.product.slug}`} className="block aspect-square bg-ink-50">
                <div className="flex h-full items-center justify-center">
                  <Package className="h-8 w-8 text-ink-300" />
                </div>
              </Link>
              <div className="p-3">
                <Link href={`/products/${item.product.slug}`}>
                  <p className="truncate text-sm font-medium text-ink-900 hover:text-brand-700">{item.product.title}</p>
                </Link>
                <p className="mt-0.5 text-sm font-semibold text-brand-700">{formatINR(item.product.pricePaise)}</p>
              </div>
              <button
                onClick={() => removeItem(item.product.id)}
                className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 text-ink-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
