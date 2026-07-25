'use client';

import { create } from 'zustand';
import { apiClient } from '@/lib/api';

type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  pricePaise: number;
  product: {
    title: string;
    slug: string;
    thumbnailUrl?: string | null;
  };
};

type CartState = {
  items: CartItem[];
  itemCount: number;
  subtotalPaise: number;
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clear: () => void;
};

export const useCartStore = create<CartState>((set) => ({
  items: [],
  itemCount: 0,
  subtotalPaise: 0,
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const cart = await apiClient.get<{
        items: CartItem[];
        itemCount: number;
        subtotalPaise: number;
      }>('/cart');
      set({
        items: cart.items,
        itemCount: cart.itemCount,
        subtotalPaise: cart.subtotalPaise,
      });
    } catch {
      /* guest / unauth */
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (productId, quantity = 1) => {
    const cart = await apiClient.post<{
      items: CartItem[];
      itemCount: number;
      subtotalPaise: number;
    }>('/cart/items', { productId, quantity });
    set({
      items: cart.items,
      itemCount: cart.itemCount,
      subtotalPaise: cart.subtotalPaise,
    });
  },

  removeItem: async (itemId) => {
    const cart = await apiClient.delete<{
      items: CartItem[];
      itemCount: number;
      subtotalPaise: number;
    }>(`/cart/items/${itemId}`);
    set({
      items: cart.items,
      itemCount: cart.itemCount,
      subtotalPaise: cart.subtotalPaise,
    });
  },

  clear: () => set({ items: [], itemCount: 0, subtotalPaise: 0 }),
}));
