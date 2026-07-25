'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Loader2, Save, Store, Upload, Globe, Truck, Shield } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/tabs';

type StoreSettings = {
  storeName: string; storeDescription?: string; storeLogoUrl?: string; storeBannerUrl?: string;
  businessType?: string; isVacationMode: boolean; vacationMessage?: string;
  policies?: string;
  user: { email: string; username: string };
};

const BUSINESS_TYPES = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'LLC', label: 'LLC' },
  { value: 'CORPORATION', label: 'Corporation' },
  { value: 'NONPROFIT', label: 'Non-profit' },
];

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('store');

  const [form, setForm] = useState({
    storeName: '', storeDescription: '', storeLogoUrl: '', storeBannerUrl: '',
    businessType: '', isVacationMode: false, vacationMessage: '', policies: '',
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<StoreSettings>('/sellers/settings');
      setSettings(data);
      setForm({
        storeName: data.storeName || '',
        storeDescription: data.storeDescription || '',
        storeLogoUrl: data.storeLogoUrl || '',
        storeBannerUrl: data.storeBannerUrl || '',
        businessType: data.businessType || '',
        isVacationMode: data.isVacationMode || false,
        vacationMessage: data.vacationMessage || '',
        policies: data.policies || '',
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchSettings();
  }, [user, fetchSettings, router]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiClient.patch('/sellers/settings', form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-ink-100" />
          <div className="h-12 rounded-2xl bg-ink-100" />
          <div className="h-96 rounded-2xl bg-ink-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Store Settings</h1>
          <p className="text-sm text-ink-500">Manage your store profile and preferences</p>
        </div>
        <Button variant="brand" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {success && <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">Settings saved successfully!</div>}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabList className="mb-6">
          <Tab value="store"><Store className="h-4 w-4" />Store info</Tab>
          <Tab value="policies"><Shield className="h-4 w-4" />Policies</Tab>
          <Tab value="shipping"><Truck className="h-4 w-4" />Shipping</Tab>
        </TabList>

        <TabPanel value="store">
          <div className="rounded-2xl border border-ink-100 bg-white p-6 space-y-5">
            <div className="flex items-start gap-6 flex-wrap">
              <div className="text-center">
                <div className="h-20 w-20 rounded-2xl bg-ink-100 overflow-hidden mx-auto">
                  {form.storeLogoUrl ? (
                    <img src={form.storeLogoUrl} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-ink-300"><Store className="h-8 w-8" /></div>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="mt-2 text-xs">Upload logo</Button>
              </div>
              <div className="flex-1 space-y-4 min-w-0">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Store name</label>
                  <Input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Description</label>
                  <Textarea value={form.storeDescription} onChange={(e) => setForm({ ...form, storeDescription: e.target.value })} rows={3} placeholder="Tell buyers about your store..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Business type</label>
                    <Select options={BUSINESS_TYPES} value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} placeholder="Select type" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1">Store logo URL</label>
                    <Input value={form.storeLogoUrl} onChange={(e) => setForm({ ...form, storeLogoUrl: e.target.value })} placeholder="https://..." />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">Banner image URL</label>
                  <Input value={form.storeBannerUrl} onChange={(e) => setForm({ ...form, storeBannerUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-6 mt-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-ink-900">Vacation mode</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isVacationMode} onChange={(e) => setForm({ ...form, isVacationMode: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
              <span className="text-sm text-ink-700">Enable vacation mode (pause new orders)</span>
            </label>
            {form.isVacationMode && (
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Vacation message</label>
                <Textarea value={form.vacationMessage} onChange={(e) => setForm({ ...form, vacationMessage: e.target.value })} rows={2} placeholder="Let buyers know when you'll be back..." />
              </div>
            )}
          </div>
        </TabPanel>

        <TabPanel value="policies">
          <div className="rounded-2xl border border-ink-100 bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-ink-900">Store policies</h2>
            <p className="text-sm text-ink-500">Define your store&apos;s return, exchange, and shipping policies. These will be shown on your store page.</p>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Policies (Markdown supported)</label>
              <Textarea value={form.policies} onChange={(e) => setForm({ ...form, policies: e.target.value })} rows={10} placeholder={
                '## Return policy\nReturns accepted within 14 days of delivery...\n\n## Shipping policy\nOrders are shipped within 2-3 business days...\n\n## Exchange policy\n...'
              } />
            </div>
          </div>
        </TabPanel>

        <TabPanel value="shipping">
          <div className="rounded-2xl border border-ink-100 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink-900">Shipping profiles</h2>
              <Button variant="brand" size="sm">Add profile</Button>
            </div>
            <p className="text-sm text-ink-500">Manage your shipping profiles and rates from the shipping settings.</p>
            <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-8 text-center">
              <Truck className="mx-auto h-8 w-8 text-ink-300" />
              <p className="mt-2 text-sm text-ink-500">Shipping profiles are managed separately.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push('/seller/settings')}>Manage shipping</Button>
            </div>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
