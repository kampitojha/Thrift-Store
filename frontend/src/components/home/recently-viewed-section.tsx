'use client';

import { ProductCard } from '@/components/product/product-card';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { Clock, Trash2 } from 'lucide-react';

export function RecentlyViewedSection() {
  const { items, clearHistory } = useRecentlyViewed();

  if (items.length === 0) return null;

  return (
    <section className="container-page py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900">
            <Clock className="mr-2 inline h-5 w-5 text-ink-400" />
            Recently viewed
          </h2>
          <p className="mt-1 text-sm text-ink-500">Pick up where you left off</p>
        </div>
        <button
          onClick={clearHistory}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink-500 hover:bg-ink-100 hover:text-ink-700"
          aria-label="Clear recently viewed"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.slice(0, 10).map((item) => (
          <ProductCard
            key={item.id}
            product={{
              id: item.id,
              title: item.title,
              slug: item.slug,
              pricePaise: item.pricePaise,
              thumbnailUrl: item.thumbnailUrl,
              brandName: item.brandName,
            }}
          />
        ))}
      </div>
    </section>
  );
}
