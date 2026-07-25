'use client';

import { useState, useEffect, useCallback } from 'react';

type RecentlyViewedItem = {
  id: string;
  slug: string;
  title: string;
  pricePaise: number;
  thumbnailUrl?: string | null;
  brandName?: string | null;
  viewedAt: number;
};

const STORAGE_KEY = 'reloom_recently_viewed';
const MAX_ITEMS = 20;

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const addItem = useCallback((item: Omit<RecentlyViewedItem, 'viewedAt'>) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.id !== item.id);
      const next = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { items, addItem, clearHistory, removeItem };
}
