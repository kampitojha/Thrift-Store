'use client';

import { useEffect } from 'react';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';

export function RecentlyViewedTracker({
  product,
}: {
  product: {
    id: string;
    slug: string;
    title: string;
    pricePaise: number;
    thumbnailUrl?: string | null;
    brandName?: string | null;
  };
}) {
  const { addItem } = useRecentlyViewed();

  useEffect(() => {
    addItem({
      id: product.id,
      slug: product.slug,
      title: product.title,
      pricePaise: product.pricePaise,
      thumbnailUrl: product.thumbnailUrl,
      brandName: product.brandName,
    });
  }, [product.id, product.slug, product.title, product.pricePaise, product.thumbnailUrl, product.brandName, addItem]);

  return null;
}
