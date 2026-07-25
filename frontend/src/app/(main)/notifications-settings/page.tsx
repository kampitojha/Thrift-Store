'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient, ApiError } from '@/lib/api';
import { Bell, BellRing, Mail, Smartphone, MessageSquare, Loader2, ChevronLeft, Save } from 'lucide-react';
import Link from 'next/link';

type NotificationPrefs = {
  email: {
    marketing: boolean;
    orderUpdates: boolean;
    messages: boolean;
    sellerAlerts: boolean;
  };
  push: {
    messages: boolean;
    orderUpdates: boolean;
    favorites: boolean;
  };
  sms: {
    orderUpdates: boolean;
    marketing: boolean;
  };
};

const DEFAULT_PREFS: NotificationPrefs = {
  email: { marketing: false, orderUpdates: true, messages: true, sellerAlerts: true },
  push: { messages: true, orderUpdates: true, favorites: false },
  sms: { orderUpdates: false, marketing: false },
};

type SectionProps = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

function Section({ title, icon, children }: SectionProps) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-ink-900">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-ink-900">{label}</p>
        {desc && <p className="text-xs text-ink-500">{desc}</p>}
      </div>
      <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="absolute inset-0 rounded-full bg-ink-300 transition peer-checked:bg-brand-600" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </label>
    </div>
  );
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchPrefs();
  }, [user, router]);

  const fetchPrefs = async () => {
    try {
      const data = await apiClient.get<NotificationPrefs>('/users/me/notification-preferences');
      setPrefs(data);
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  };

  const savePrefs = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.patch('/users/me/notification-preferences', prefs);
      setMessage({ type: 'success', text: 'Preferences saved' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof ApiError ? e.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const update = (section: 'email' | 'push' | 'sms', key: string, value: boolean) => {
    setPrefs((p) => ({ ...p, [section]: { ...p[section], [key]: value } }));
  };

  if (!user) return null;

  return (
    <div className="container-page py-10 max-w-xl">
      <div className="mb-8">
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700 mb-4">
          <ChevronLeft className="h-4 w-4" />Back to Settings
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Notifications</h1>
        <p className="mt-1 text-sm text-ink-500">Choose what notifications you receive.</p>
      </div>

      {message && (
        <div className={`mb-6 rounded-2xl px-4 py-3 text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
        }`}>{message.text}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink-400" /></div>
      ) : (
        <div className="space-y-4">
          <Section title="Email notifications" icon={<Mail className="h-5 w-5 text-ink-500" />}>
            <Toggle label="Order updates" desc="Shipping confirmations, delivery status" checked={prefs.email.orderUpdates} onChange={(v) => update('email', 'orderUpdates', v)} />
            <Toggle label="Messages" desc="New messages from buyers/sellers" checked={prefs.email.messages} onChange={(v) => update('email', 'messages', v)} />
            <Toggle label="Seller alerts" desc="New orders, reviews, questions" checked={prefs.email.sellerAlerts} onChange={(v) => update('email', 'sellerAlerts', v)} />
            <Toggle label="Marketing" desc="Promotions, new features, tips" checked={prefs.email.marketing} onChange={(v) => update('email', 'marketing', v)} />
          </Section>

          <Section title="Push notifications" icon={<BellRing className="h-5 w-5 text-ink-500" />}>
            <Toggle label="Messages" checked={prefs.push.messages} onChange={(v) => update('push', 'messages', v)} />
            <Toggle label="Order updates" checked={prefs.push.orderUpdates} onChange={(v) => update('push', 'orderUpdates', v)} />
            <Toggle label="Favorites" desc="Someone likes or favorites your item" checked={prefs.push.favorites} onChange={(v) => update('push', 'favorites', v)} />
          </Section>

          <Section title="SMS notifications" icon={<Smartphone className="h-5 w-5 text-ink-500" />}>
            <Toggle label="Order updates" checked={prefs.sms.orderUpdates} onChange={(v) => update('sms', 'orderUpdates', v)} />
            <Toggle label="Marketing" checked={prefs.sms.marketing} onChange={(v) => update('sms', 'marketing', v)} />
          </Section>

          <div className="flex justify-end">
            <Button variant="brand" onClick={savePrefs} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save preferences
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
