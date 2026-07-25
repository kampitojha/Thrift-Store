'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, Loader2, Store, User, Save, Shield, LogOut, Bell, Eye, Trash2, Smartphone, ChevronRight, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

type ProfileData = {
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  socialLinks?: Record<string, string>;
};

type StoreData = {
  storeName?: string;
  storeDescription?: string;
  storeLogoUrl?: string;
  storeBannerUrl?: string;
  isVacationMode?: boolean;
  vacationMessage?: string;
  policies?: Record<string, unknown>;
};

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);

  const [activeTab, setActiveTab] = useState<'profile' | 'store' | 'account'>('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profile, setProfile] = useState<ProfileData>({});
  const [store, setStore] = useState<StoreData>({});
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeSlug, setStoreSlug] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    setProfile({
      displayName: user.displayName || '',
      avatarUrl: user.avatarUrl || '',
      city: '',
      state: '',
      country: '',
      bio: '',
    });
    fetchStoreData();
  }, [user, router]);

  const fetchStoreData = async () => {
    setStoreLoading(true);
    try {
      const dash = await apiClient.get<{ store: { storeName: string; storeSlug: string; storeDescription?: string; storeLogoUrl?: string; storeBannerUrl?: string; isVacationMode?: boolean; vacationMessage?: string; policies?: Record<string, unknown> } }>('/sellers/dashboard');
      const s = dash.store;
      setStore({
        storeName: s.storeName || '',
        storeDescription: s.storeDescription || '',
        storeLogoUrl: s.storeLogoUrl || '',
        storeBannerUrl: s.storeBannerUrl || '',
        isVacationMode: s.isVacationMode || false,
        vacationMessage: s.vacationMessage || '',
        policies: s.policies || {},
      });
      setStoreSlug(s.storeSlug);
    } catch {
      // not a seller yet
    } finally {
      setStoreLoading(false);
    }
  };

  const handleUpload = async (file: File, type: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/v1/uploads/file', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('reloom_access_token')}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json.data?.url || json.url;
    } catch (e) {
      setMessage({ type: 'error', text: `Upload failed: ${(e as Error).message}` });
      return null;
    }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await handleUpload(file, 'avatar');
    if (url) setProfile((p) => ({ ...p, avatarUrl: url }));
  };

  const onCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await handleUpload(file, 'cover');
    if (url) setProfile((p) => ({ ...p, coverUrl: url }));
  };

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await handleUpload(file, 'logo');
    if (url) setStore((s) => ({ ...s, storeLogoUrl: url }));
  };

  const onBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await handleUpload(file, 'banner');
    if (url) setStore((s) => ({ ...s, storeBannerUrl: url }));
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.patch('/users/me/profile', {
        displayName: profile.displayName || undefined,
        bio: profile.bio || undefined,
        avatarUrl: profile.avatarUrl || undefined,
        coverUrl: profile.coverUrl || undefined,
        city: profile.city || undefined,
        state: profile.state || undefined,
        country: profile.country || undefined,
        socialLinks: undefined,
      });
      await refreshMe();
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof ApiError ? e.message : 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const saveStore = async () => {
    if (!storeSlug) {
      try {
        await apiClient.post('/sellers/store', {
          storeName: store.storeName || user?.displayName || user?.username || 'My Store',
        });
        await fetchStoreData();
      } catch (e) {
        setMessage({ type: 'error', text: e instanceof ApiError ? e.message : 'Failed to create store' });
        return;
      }
    }
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.patch('/sellers/store', {
        storeName: store.storeName || undefined,
        storeDescription: store.storeDescription || undefined,
        storeLogoUrl: store.storeLogoUrl || undefined,
        storeBannerUrl: store.storeBannerUrl || undefined,
        isVacationMode: store.isVacationMode,
        vacationMessage: store.vacationMessage || undefined,
      });
      setMessage({ type: 'success', text: 'Store updated successfully' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof ApiError ? e.message : 'Failed to save store' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'store' as const, label: 'Store', icon: Store },
    { id: 'account' as const, label: 'Account', icon: Shield },
  ];

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Settings</h1>
        <p className="mt-1 text-sm text-ink-500">Manage your profile, store, and account preferences.</p>
      </div>

      {message && (
        <div
          className={cn(
            'mb-6 rounded-2xl px-4 py-3 text-sm font-medium',
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800',
          )}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Tabs sidebar */}
        <nav className="flex shrink-0 gap-1 lg:w-48 lg:flex-col">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                activeTab === tab.id
                  ? 'bg-brand-50 text-brand-800'
                  : 'text-ink-600 hover:bg-ink-50',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {activeTab === 'profile' && (
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-xl font-semibold">Profile</h2>
                <p className="mt-1 text-sm text-ink-500">This information appears on your public profile.</p>
              </div>

              {/* Avatar */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-400">Avatar</label>
                <div className="mt-3 flex items-center gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-full bg-ink-200">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-ink-500">
                        {(profile.displayName || user.username).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100"
                      aria-label="Change avatar"
                    >
                      <Camera className="h-5 w-5 text-white" />
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" onChange={onAvatarChange} className="hidden" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()}>
                    Upload photo
                  </Button>
                </div>
              </div>

              {/* Cover */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-400">Cover image</label>
                <div className="mt-3">
                  <div className="relative h-32 overflow-hidden rounded-2xl bg-ink-100 sm:h-40">
                    {profile.coverUrl && (
                      <img src={profile.coverUrl} alt="" className="h-full w-full object-cover" />
                    )}
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition hover:opacity-100"
                      aria-label="Change cover"
                    >
                      <Camera className="h-6 w-6 text-white" />
                    </button>
                    <input ref={coverInputRef} type="file" accept="image/*" onChange={onCoverChange} className="hidden" />
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400">Display name</label>
                <Input
                  value={profile.displayName || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
                  placeholder="Your display name"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400">Bio</label>
                <Textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell buyers about yourself..."
                  rows={4}
                />
              </div>

              {/* Location */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400">City</label>
                  <Input
                    value={profile.city || ''}
                    onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                    placeholder="Mumbai"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400">State</label>
                  <Input
                    value={profile.state || ''}
                    onChange={(e) => setProfile((p) => ({ ...p, state: e.target.value }))}
                    placeholder="Maharashtra"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400">Country</label>
                  <Input
                    value={profile.country || ''}
                    onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
                    placeholder="India"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="brand" onClick={saveProfile} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save profile
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'store' && (
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-xl font-semibold">Store settings</h2>
                <p className="mt-1 text-sm text-ink-500">Customize your storefront and selling preferences.</p>
              </div>

              {storeLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
                </div>
              ) : (
                <>
                  {/* Store Logo */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-400">Store logo</label>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-ink-200">
                        {store.storeLogoUrl ? (
                          <img src={store.storeLogoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Store className="h-8 w-8 text-ink-400" />
                          </div>
                        )}
                        <button
                          onClick={() => logoInputRef.current?.click()}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100"
                          aria-label="Change logo"
                        >
                          <Camera className="h-5 w-5 text-white" />
                        </button>
                        <input ref={logoInputRef} type="file" accept="image/*" onChange={onLogoChange} className="hidden" />
                      </div>
                      <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                        Upload logo
                      </Button>
                    </div>
                  </div>

                  {/* Store Banner */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-400">Store banner</label>
                    <div className="mt-3">
                      <div className="relative h-32 overflow-hidden rounded-2xl bg-ink-100 sm:h-40">
                        {store.storeBannerUrl && (
                          <img src={store.storeBannerUrl} alt="" className="h-full w-full object-cover" />
                        )}
                        <button
                          onClick={() => bannerInputRef.current?.click()}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition hover:opacity-100"
                          aria-label="Change banner"
                        >
                          <Camera className="h-6 w-6 text-white" />
                        </button>
                        <input ref={bannerInputRef} type="file" accept="image/*" onChange={onBannerChange} className="hidden" />
                      </div>
                    </div>
                  </div>

                  {/* Store Name */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400">Store name</label>
                    <Input
                      value={store.storeName || ''}
                      onChange={(e) => setStore((s) => ({ ...s, storeName: e.target.value }))}
                      placeholder="My thrift store"
                    />
                  </div>

                  {/* Store Description */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400">Store description</label>
                    <Textarea
                      value={store.storeDescription || ''}
                      onChange={(e) => setStore((s) => ({ ...s, storeDescription: e.target.value }))}
                      placeholder="Tell shoppers what makes your store special..."
                      rows={4}
                    />
                  </div>

                  {/* Vacation Mode */}
                  <div className="rounded-2xl border border-ink-100 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-ink-900">Vacation mode</p>
                        <p className="mt-1 text-sm text-ink-500">
                          Temporarily hide all your listings from search. Existing buyers can still see their purchases.
                        </p>
                      </div>
                      <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={!!store.isVacationMode}
                          onChange={(e) => setStore((s) => ({ ...s, isVacationMode: e.target.checked }))}
                          className="peer sr-only"
                        />
                        <span className="absolute inset-0 rounded-full bg-ink-300 transition peer-checked:bg-brand-600" />
                        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                      </label>
                    </div>
                    {store.isVacationMode && (
                      <div className="mt-4">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400">Vacation message</label>
                        <Input
                          value={store.vacationMessage || ''}
                          onChange={(e) => setStore((s) => ({ ...s, vacationMessage: e.target.value }))}
                          placeholder="I'm taking a break! Orders will be shipped after [date]."
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button variant="brand" onClick={saveStore} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save store settings
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-xl font-semibold">Account</h2>
                <p className="mt-1 text-sm text-ink-500">Manage your account settings.</p>
              </div>

              <div className="rounded-2xl border border-ink-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink-900">Email</p>
                    <p className="mt-1 text-sm text-ink-500">{user.email}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                    Verified
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-ink-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink-900">Username</p>
                    <p className="mt-1 text-sm text-ink-500">@{user.username}</p>
                  </div>
                </div>
              </div>

              {/* Security Links */}
              <div className="space-y-1">
                <Link href="/sessions" className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-4 hover:bg-ink-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-100"><Smartphone className="h-4 w-4 text-ink-600" /></div>
                    <div>
                      <p className="font-medium text-ink-900">Active sessions</p>
                      <p className="text-xs text-ink-500">Manage devices where you&apos;re signed in</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-400" />
                </Link>
                <Link href="/2fa" className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-4 hover:bg-ink-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-100"><KeyRound className="h-4 w-4 text-ink-600" /></div>
                    <div>
                      <p className="font-medium text-ink-900">Two-factor authentication</p>
                      <p className="text-xs text-ink-500">Add extra security to your account</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-400" />
                </Link>
                <Link href="/notifications-settings" className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-4 hover:bg-ink-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-100"><Bell className="h-4 w-4 text-ink-600" /></div>
                    <div>
                      <p className="font-medium text-ink-900">Notifications</p>
                      <p className="text-xs text-ink-500">Manage email, push, and SMS preferences</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-400" />
                </Link>
                <Link href="/privacy" className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-4 hover:bg-ink-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-100"><Eye className="h-4 w-4 text-ink-600" /></div>
                    <div>
                      <p className="font-medium text-ink-900">Privacy</p>
                      <p className="text-xs text-ink-500">Profile visibility and blocked users</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-400" />
                </Link>
                <Link href="/delete-account" className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 hover:bg-red-100 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100"><Trash2 className="h-4 w-4 text-red-700" /></div>
                    <div>
                      <p className="font-medium text-red-900">Delete account</p>
                      <p className="text-xs text-red-700">Permanently delete your account</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-red-400" />
                </Link>
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-900">Sign out</p>
                    <p className="mt-1 text-sm text-red-700">Sign out of your account on this device.</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      const { useAuthStore } = await import('@/stores/auth-store');
                      useAuthStore.getState().logout();
                      router.push('/');
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
