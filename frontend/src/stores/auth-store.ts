'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api';

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  role: string;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  setHydrated: (v: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (payload: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  }) => void;
  refreshMe: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isHydrated: false,
      setHydrated: (v) => set({ isHydrated: v }),

      setSession: ({ user, accessToken, refreshToken }) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('reloom_access_token', accessToken);
          localStorage.setItem('reloom_refresh_token', refreshToken);
        }
        set({ user, accessToken, refreshToken });
      },

      login: async (email, password) => {
        const res = await apiClient.post<{
          user: AuthUser;
          accessToken: string;
          refreshToken: string;
        }>('/auth/login', { email, password }, { token: null });
        get().setSession(res);
      },

      register: async (data) => {
        const res = await apiClient.post<{
          user: AuthUser;
          accessToken: string;
          refreshToken: string;
        }>('/auth/register', data, { token: null });
        get().setSession(res);
      },

      logout: async () => {
        const { accessToken, refreshToken } = get();
        try {
          if (accessToken) {
            await apiClient.post('/auth/logout', { refreshToken }, { token: accessToken });
          }
        } catch {
          /* ignore */
        }
        if (typeof window !== 'undefined') {
          localStorage.removeItem('reloom_access_token');
          localStorage.removeItem('reloom_refresh_token');
        }
        set({ user: null, accessToken: null, refreshToken: null });
      },

      refreshMe: async () => {
        const token = get().accessToken;
        if (!token) return;
        try {
          const me = await apiClient.get<AuthUser>('/auth/me', { token });
          set({ user: me });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: 'reloom-auth',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken && typeof window !== 'undefined') {
          localStorage.setItem('reloom_access_token', state.accessToken);
        }
        state?.setHydrated(true);
      },
    },
  ),
);
