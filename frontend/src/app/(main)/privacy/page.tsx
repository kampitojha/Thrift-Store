'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient, ApiError } from '@/lib/api';
import { Eye, EyeOff, Ban, Loader2, ChevronLeft, Save, Search } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [profileVisibility, setProfileVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [showLikes, setShowLikes] = useState(true);
  const [showSoldItems, setShowSoldItems] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [blockUsername, setBlockUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchSettings();
  }, [user, router]);

  const fetchSettings = async () => {
    try {
      const data = await apiClient.get<{
        profileVisibility: string;
        showLikes: boolean;
        showSoldItems: boolean;
        blockedUsers: string[];
      }>('/users/me/privacy-settings');
      setProfileVisibility(data.profileVisibility as 'public' | 'followers' | 'private');
      setShowLikes(data.showLikes);
      setShowSoldItems(data.showSoldItems);
      setBlockedUsers(data.blockedUsers || []);
    } catch {
      // use defaults
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.patch('/users/me/privacy-settings', {
        profileVisibility,
        showLikes,
        showSoldItems,
      });
      setMessage({ type: 'success', text: 'Privacy settings saved' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof ApiError ? e.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const blockUser = async () => {
    if (!blockUsername.trim()) return;
    try {
      await apiClient.post('/users/block', { username: blockUsername.trim() });
      setBlockedUsers((prev) => [...prev, blockUsername.trim()]);
      setBlockUsername('');
    } catch {
      setMessage({ type: 'error', text: 'Failed to block user' });
    }
  };

  const unblockUser = async (username: string) => {
    try {
      await apiClient.post('/users/unblock', { username });
      setBlockedUsers((prev) => prev.filter((u) => u !== username));
    } catch {
      setMessage({ type: 'error', text: 'Failed to unblock user' });
    }
  };

  if (!user) return null;

  return (
    <div className="container-page py-10 max-w-xl">
      <div className="mb-8">
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700 mb-4">
          <ChevronLeft className="h-4 w-4" />Back to Settings
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Privacy</h1>
        <p className="mt-1 text-sm text-ink-500">Control your profile visibility and manage blocked users.</p>
      </div>

      {message && (
        <div className={`mb-6 rounded-2xl px-4 py-3 text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
        }`}>{message.text}</div>
      )}

      <div className="space-y-6">
        {/* Profile visibility */}
        <div className="rounded-2xl border border-ink-100 bg-white p-5">
          <h3 className="font-semibold text-ink-900">Profile visibility</h3>
          <p className="mt-1 text-sm text-ink-500">Who can see your profile and listings.</p>
          <div className="mt-4 space-y-2">
            {[
              { value: 'public', label: 'Public', desc: 'Anyone can see your profile' },
              { value: 'followers', label: 'Followers only', desc: 'Only people you follow' },
              { value: 'private', label: 'Private', desc: 'Only you' },
            ].map((opt) => (
              <label key={opt.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                profileVisibility === opt.value ? 'border-brand-500 bg-brand-50' : 'border-ink-100 hover:bg-ink-50'
              }`}>
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={profileVisibility === opt.value}
                  onChange={(e) => setProfileVisibility(e.target.value as 'public' | 'followers' | 'private')}
                  className="h-4 w-4 text-brand-700"
                />
                <div>
                  <p className="text-sm font-medium text-ink-900">{opt.label}</p>
                  <p className="text-xs text-ink-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Profile content */}
        <div className="rounded-2xl border border-ink-100 bg-white p-5">
          <h3 className="font-semibold text-ink-900">Profile content</h3>
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-ink-900">Show likes & favorites</p>
                <p className="text-xs text-ink-500">Display items you&apos;ve liked on your profile</p>
              </div>
              <input type="checkbox" checked={showLikes} onChange={(e) => setShowLikes(e.target.checked)} className="h-4 w-4 rounded text-brand-700" />
            </label>
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-ink-900">Show sold items</p>
                <p className="text-xs text-ink-500">Display items you&apos;ve sold on your profile</p>
              </div>
              <input type="checkbox" checked={showSoldItems} onChange={(e) => setShowSoldItems(e.target.checked)} className="h-4 w-4 rounded text-brand-700" />
            </label>
          </div>
        </div>

        {/* Blocked users */}
        <div className="rounded-2xl border border-ink-100 bg-white p-5">
          <h3 className="font-semibold text-ink-900">Blocked users</h3>
          <p className="mt-1 text-sm text-ink-500">Blocked users cannot view your profile or contact you.</p>
          <div className="mt-4 flex gap-2">
            <Input
              value={blockUsername}
              onChange={(e) => setBlockUsername(e.target.value)}
              placeholder="Enter username to block"
              className="flex-1"
            />
            <Button variant="outline" onClick={blockUser} disabled={!blockUsername.trim()}>
              <Ban className="mr-2 h-4 w-4" />Block
            </Button>
          </div>
          {blockedUsers.length > 0 && (
            <div className="mt-4 space-y-2">
              {blockedUsers.map((u) => (
                <div key={u} className="flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2">
                  <span className="text-sm font-medium text-ink-700">@{u}</span>
                  <Button variant="ghost" size="sm" onClick={() => unblockUser(u)} className="text-red-600 hover:text-red-800">
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="brand" onClick={saveSettings} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save privacy settings
          </Button>
        </div>
      </div>
    </div>
  );
}
