'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  Globe,
  Palette,
  Link2,
  Search,
  Shield,
  Wrench,
  Save,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';

type PlatformSettings = {
  marketplaceName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  currency: string;
  language: string;
  timezone: string;
  dateFormat: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
  pinterestUrl: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  defaultOgImageUrl: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  minPasswordLength: number;
  maxLoginAttempts: number;
  sessionDurationHours: number;
};

const DEFAULTS: PlatformSettings = {
  marketplaceName: 'Reloom',
  tagline: 'Premium Thrift Marketplace',
  supportEmail: 'support@reloom.com',
  supportPhone: '',
  currency: 'INR',
  language: 'en',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#a6633e',
  secondaryColor: '#8a4d35',
  accentColor: '#5d362a',
  facebookUrl: '',
  twitterUrl: '',
  instagramUrl: '',
  linkedinUrl: '',
  youtubeUrl: '',
  pinterestUrl: '',
  defaultMetaTitle: 'Reloom — Premium Thrift Marketplace',
  defaultMetaDescription:
    'Buy and sell pre-loved fashion, sneakers, luxury, electronics and more.',
  defaultOgImageUrl: '',
  maintenanceMode: false,
  maintenanceMessage:
    'We are currently undergoing scheduled maintenance. Please check back shortly.',
  minPasswordLength: 8,
  maxLoginAttempts: 5,
  sessionDurationHours: 24,
};

const STORAGE_KEY = 'reloom_admin_settings';

const CURRENCIES = [
  { value: 'INR', label: 'INR (\u20B9)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (\u20AC)' },
  { value: 'GBP', label: 'GBP (\u00A3)' },
  { value: 'AUD', label: 'AUD (A$)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'SGD', label: 'SGD (S$)' },
  { value: 'AED', label: 'AED (\u062F.\u0625)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi (\u0939\u093F\u0928\u094D\u0926\u0940)' },
  { value: 'bn', label: 'Bengali (\u09AC\u09BE\u0982\u09B2\u09BE)' },
  { value: 'te', label: 'Telugu (\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41)' },
  { value: 'mr', label: 'Marathi (\u092E\u0930\u093E\u0920\u0940)' },
  { value: 'ta', label: 'Tamil (\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD)' },
  { value: 'ur', label: 'Urdu (\u0627\u0631\u062F\u0648)' },
  { value: 'gu', label: 'Gujarati (\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0)' },
  { value: 'kn', label: 'Kannada (\u0C95\u0CA8\u0CCD\u0CA8\u0CA1)' },
  { value: 'ml', label: 'Malayalam (\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02)' },
  { value: 'or', label: 'Odia (\u0B13\u0B21\u0B3C\u0B3F\u0B06)' },
  { value: 'pa', label: 'Punjabi (\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese (\u4E2D\u6587)' },
  { value: 'ja', label: 'Japanese (\u65E5\u672C\u8A9E)' },
  { value: 'ar', label: 'Arabic (\u0627\u0644\u0639\u0631\u0628\u064A\u0629)' },
];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST, UTC+8)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'America/New_York', label: 'America/New_York (ET)' },
  { value: 'America/Chicago', label: 'America/Chicago (CT)' },
  { value: 'America/Denver', label: 'America/Denver (MT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PT)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST/NZDT)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
  { value: 'UTC', label: 'UTC' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
  { value: 'MMMM D, YYYY', label: 'MMMM D, YYYY' },
  { value: 'D MMMM, YYYY', label: 'D MMMM, YYYY' },
];

type Toast = { message: string; visible: boolean };

function Toast({ toast }: { toast: Toast }) {
  if (!toast.visible) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-up">
      <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 shadow-lift">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <span className="text-sm font-medium text-emerald-800">{toast.message}</span>
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft space-y-4">
      <Skeleton className="h-5 w-48" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-xl" />
      ))}
      <Skeleton className="h-9 w-24 rounded-full" />
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  badge,
  saving,
  onSave,
  children,
}: {
  icon: React.ElementType;
  title: string;
  badge?: string;
  saving?: boolean;
  onSave?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-50">
            <Icon className="h-4.5 w-4.5 text-ink-500" />
          </div>
          <h2 className="font-display text-base font-semibold text-ink-900">{title}</h2>
          {badge && (
            <Badge variant="outline" className="text-[10px]">
              {badge}
            </Badge>
          )}
        </div>
        {onSave && (
          <Button variant="brand" size="sm" onClick={onSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            {saving ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>({ message: '', visible: false });

  const loadSettings = useCallback(() => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PlatformSettings>;
        setSettings({ ...DEFAULTS, ...parsed });
      }
    } catch {
      setSettings(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function showToast(message: string) {
    setToast({ message, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000);
  }

  async function saveToStorage(updated: PlatformSettings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      throw new Error('Failed to save settings to local storage');
    }
  }

  async function apiSave<T>(section: string, payload: Partial<PlatformSettings>) {
    const updated = { ...settings, ...payload };
    setSavingSection(section);
    try {
      await saveToStorage(updated);
      setSettings(updated);
      showToast(`${section} settings saved successfully`);
    } catch {
      showToast('Failed to save settings');
    } finally {
      setSavingSection(null);
    }
  }

  function updateField<K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K],
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleColorChange(key: 'primaryColor' | 'secondaryColor' | 'accentColor', value: string) {
    if (value.startsWith('#')) {
      updateField(key, value);
    } else {
      updateField(key, `#${value}`);
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div>
          <Skeleton className="mb-2 h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SectionSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Settings className="h-6 w-6 text-brand-600" />
            Platform Settings
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Configure global platform settings. Changes are saved locally until a backend is connected.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General */}
        <SectionCard
          icon={Globe}
          title="General"
          badge="core"
          saving={savingSection === 'General'}
          onSave={() =>
            apiSave('General', {
              marketplaceName: settings.marketplaceName,
              tagline: settings.tagline,
              supportEmail: settings.supportEmail,
              supportPhone: settings.supportPhone,
              currency: settings.currency,
              language: settings.language,
              timezone: settings.timezone,
              dateFormat: settings.dateFormat,
            })
          }
        >
          <FieldRow label="Marketplace Name">
            <Input
              placeholder="Your marketplace name"
              value={settings.marketplaceName}
              onChange={(e) => updateField('marketplaceName', e.target.value)}
            />
          </FieldRow>
          <FieldRow label="Tagline">
            <Input
              placeholder="A short tagline"
              value={settings.tagline}
              onChange={(e) => updateField('tagline', e.target.value)}
            />
          </FieldRow>
          <FieldRow label="Support Email">
            <Input
              type="email"
              placeholder="support@example.com"
              value={settings.supportEmail}
              onChange={(e) => updateField('supportEmail', e.target.value)}
            />
          </FieldRow>
          <FieldRow label="Support Phone">
            <Input
              placeholder="+91 12345 67890"
              value={settings.supportPhone}
              onChange={(e) => updateField('supportPhone', e.target.value)}
            />
          </FieldRow>
          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="Currency">
              <Select
                options={CURRENCIES}
                value={settings.currency}
                onChange={(e) => updateField('currency', e.target.value)}
              />
            </FieldRow>
            <FieldRow label="Language">
              <Select
                options={LANGUAGES}
                value={settings.language}
                onChange={(e) => updateField('language', e.target.value)}
              />
            </FieldRow>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="Timezone">
              <Select
                options={TIMEZONES}
                value={settings.timezone}
                onChange={(e) => updateField('timezone', e.target.value)}
              />
            </FieldRow>
            <FieldRow label="Date Format">
              <Select
                options={DATE_FORMATS}
                value={settings.dateFormat}
                onChange={(e) => updateField('dateFormat', e.target.value)}
              />
            </FieldRow>
          </div>
        </SectionCard>

        {/* Appearance */}
        <SectionCard
          icon={Palette}
          title="Appearance"
          badge="branding"
          saving={savingSection === 'Appearance'}
          onSave={() =>
            apiSave('Appearance', {
              logoUrl: settings.logoUrl,
              faviconUrl: settings.faviconUrl,
              primaryColor: settings.primaryColor,
              secondaryColor: settings.secondaryColor,
              accentColor: settings.accentColor,
            })
          }
        >
          <FieldRow label="Logo URL">
            <Input
              placeholder="https://example.com/logo.png"
              value={settings.logoUrl}
              onChange={(e) => updateField('logoUrl', e.target.value)}
            />
            {settings.logoUrl && (
              <div className="mt-2 flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-ink-200 bg-ink-50 p-1">
                <img
                  src={settings.logoUrl}
                  alt="Logo preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </FieldRow>
          <FieldRow label="Favicon URL">
            <Input
              placeholder="https://example.com/favicon.ico"
              value={settings.faviconUrl}
              onChange={(e) => updateField('faviconUrl', e.target.value)}
            />
          </FieldRow>
          <FieldRow label="Primary Color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => updateField('primaryColor', e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-ink-200 bg-white p-0.5"
              />
              <Input
                placeholder="#a6633e"
                value={settings.primaryColor}
                onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                className="font-mono"
              />
            </div>
          </FieldRow>
          <FieldRow label="Secondary Color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => updateField('secondaryColor', e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-ink-200 bg-white p-0.5"
              />
              <Input
                placeholder="#8a4d35"
                value={settings.secondaryColor}
                onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                className="font-mono"
              />
            </div>
          </FieldRow>
          <FieldRow label="Accent Color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.accentColor}
                onChange={(e) => updateField('accentColor', e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-ink-200 bg-white p-0.5"
              />
              <Input
                placeholder="#5d362a"
                value={settings.accentColor}
                onChange={(e) => handleColorChange('accentColor', e.target.value)}
                className="font-mono"
              />
            </div>
          </FieldRow>
        </SectionCard>

        {/* Social Links */}
        <SectionCard
          icon={Link2}
          title="Social Links"
          badge="optional"
          saving={savingSection === 'Social Links'}
          onSave={() =>
            apiSave('Social Links', {
              facebookUrl: settings.facebookUrl,
              twitterUrl: settings.twitterUrl,
              instagramUrl: settings.instagramUrl,
              linkedinUrl: settings.linkedinUrl,
              youtubeUrl: settings.youtubeUrl,
              pinterestUrl: settings.pinterestUrl,
            })
          }
        >
          <FieldRow label="Facebook URL">
            <Input
              placeholder="https://facebook.com/yourpage"
              value={settings.facebookUrl}
              onChange={(e) => updateField('facebookUrl', e.target.value)}
            />
          </FieldRow>
          <FieldRow label="Twitter / X URL">
            <Input
              placeholder="https://x.com/yourhandle"
              value={settings.twitterUrl}
              onChange={(e) => updateField('twitterUrl', e.target.value)}
            />
          </FieldRow>
          <FieldRow label="Instagram URL">
            <Input
              placeholder="https://instagram.com/yourhandle"
              value={settings.instagramUrl}
              onChange={(e) => updateField('instagramUrl', e.target.value)}
            />
          </FieldRow>
          <FieldRow label="LinkedIn URL">
            <Input
              placeholder="https://linkedin.com/company/yourpage"
              value={settings.linkedinUrl}
              onChange={(e) => updateField('linkedinUrl', e.target.value)}
            />
          </FieldRow>
          <FieldRow label="YouTube URL">
            <Input
              placeholder="https://youtube.com/@yourchannel"
              value={settings.youtubeUrl}
              onChange={(e) => updateField('youtubeUrl', e.target.value)}
            />
          </FieldRow>
          <FieldRow label="Pinterest URL">
            <Input
              placeholder="https://pinterest.com/yourhandle"
              value={settings.pinterestUrl}
              onChange={(e) => updateField('pinterestUrl', e.target.value)}
            />
          </FieldRow>
        </SectionCard>

        {/* SEO Defaults */}
        <SectionCard
          icon={Search}
          title="SEO Defaults"
          badge="search"
          saving={savingSection === 'SEO'}
          onSave={() =>
            apiSave('SEO', {
              defaultMetaTitle: settings.defaultMetaTitle,
              defaultMetaDescription: settings.defaultMetaDescription,
              defaultOgImageUrl: settings.defaultOgImageUrl,
            })
          }
        >
          <FieldRow label="Default Meta Title">
            <Input
              placeholder="Page title for SEO"
              value={settings.defaultMetaTitle}
              onChange={(e) => updateField('defaultMetaTitle', e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-400">
              {settings.defaultMetaTitle.length} characters recommended: 50-60
            </p>
          </FieldRow>
          <FieldRow label="Default Meta Description">
            <Textarea
              placeholder="A brief description for search results"
              value={settings.defaultMetaDescription}
              onChange={(e) => updateField('defaultMetaDescription', e.target.value)}
              className="min-h-[80px]"
            />
            <p className="mt-1 text-xs text-ink-400">
              {settings.defaultMetaDescription.length} characters recommended: 150-160
            </p>
          </FieldRow>
          <FieldRow label="Default OG Image URL">
            <Input
              placeholder="https://example.com/og-image.png"
              value={settings.defaultOgImageUrl}
              onChange={(e) => updateField('defaultOgImageUrl', e.target.value)}
            />
            {settings.defaultOgImageUrl && (
              <div className="mt-2 flex h-16 w-28 items-center justify-center overflow-hidden rounded-lg border border-ink-200 bg-ink-50 p-1">
                <img
                  src={settings.defaultOgImageUrl}
                  alt="OG preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </FieldRow>
        </SectionCard>

        {/* Maintenance */}
        <SectionCard
          icon={Wrench}
          title="Maintenance"
          badge="critical"
          saving={savingSection === 'Maintenance'}
          onSave={() =>
            apiSave('Maintenance', {
              maintenanceMode: settings.maintenanceMode,
              maintenanceMessage: settings.maintenanceMessage,
            })
          }
        >
          <div className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink-900">Maintenance Mode</p>
              <p className="text-xs text-ink-500">
                When enabled, only admins can access the platform
              </p>
            </div>
            <button
              type="button"
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                settings.maintenanceMode ? 'bg-amber-500' : 'bg-ink-200',
              )}
              onClick={() => updateField('maintenanceMode', !settings.maintenanceMode)}
              role="switch"
              aria-checked={settings.maintenanceMode}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                  settings.maintenanceMode ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </button>
          </div>
          <FieldRow label="Maintenance Message">
            <Textarea
              placeholder="Message shown to visitors during maintenance"
              value={settings.maintenanceMessage}
              onChange={(e) => updateField('maintenanceMessage', e.target.value)}
              disabled={!settings.maintenanceMode}
              className={cn(!settings.maintenanceMode && 'opacity-50')}
            />
          </FieldRow>
          {settings.maintenanceMode && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
              <Wrench className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-amber-700">
                Maintenance mode is active. Non-admin users will see the maintenance page.
              </p>
            </div>
          )}
        </SectionCard>

        {/* Security */}
        <SectionCard
          icon={Shield}
          title="Security"
          badge="auth"
          saving={savingSection === 'Security'}
          onSave={() =>
            apiSave('Security', {
              minPasswordLength: settings.minPasswordLength,
              maxLoginAttempts: settings.maxLoginAttempts,
              sessionDurationHours: settings.sessionDurationHours,
            })
          }
        >
          <FieldRow label="Minimum Password Length">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={4}
                max={32}
                step={1}
                value={settings.minPasswordLength}
                onChange={(e) =>
                  updateField('minPasswordLength', Number(e.target.value))
                }
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:shadow-soft"
              />
              <Badge variant="brand" className="min-w-[3rem] justify-center font-mono">
                {settings.minPasswordLength}
              </Badge>
            </div>
          </FieldRow>
          <FieldRow label="Max Login Attempts">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={settings.maxLoginAttempts}
                onChange={(e) =>
                  updateField('maxLoginAttempts', Number(e.target.value))
                }
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:shadow-soft"
              />
              <Badge variant="brand" className="min-w-[3rem] justify-center font-mono">
                {settings.maxLoginAttempts}
              </Badge>
            </div>
          </FieldRow>
          <FieldRow label="Session Duration (hours)">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={720}
                step={1}
                value={settings.sessionDurationHours}
                onChange={(e) =>
                  updateField('sessionDurationHours', Number(e.target.value))
                }
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:shadow-soft"
              />
              <Badge variant="brand" className="min-w-[5rem] justify-center font-mono text-xs">
                {settings.sessionDurationHours < 24
                  ? `${settings.sessionDurationHours}h`
                  : settings.sessionDurationHours < 168
                    ? `${Math.round(settings.sessionDurationHours / 24)}d`
                    : `${Math.round(settings.sessionDurationHours / 168)}w`}
              </Badge>
            </div>
          </FieldRow>
          <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-4 py-2.5">
            <Shield className="h-4 w-4 text-ink-400" />
            <p className="text-xs text-ink-500">
              These settings affect user authentication and account security.
            </p>
          </div>
        </SectionCard>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  );
}
