'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Globe,
  FileJson,
  Shield,
  GitBranch,
  PenLine,
  Save,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  BarChart3,
  Hash,
  Image,
  Twitter,
  Facebook,
  ChartNoAxesColumn,
  ExternalLink,
  Plus,
  Trash2,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const STORAGE_KEY = 'reloom_seo_settings';

type RobotsRule = { id: string; path: string; allow: boolean };
type SitemapPattern = { id: string; pattern: string; type: 'include' | 'exclude' };

type SeoSettings = {
  // SEO Rules
  defaultMetaTitleFormat: string;
  defaultMetaDescriptionFormat: string;
  ogImageUrl: string;
  twitterHandle: string;
  facebookAppId: string;
  googleAnalyticsId: string;
  // JSON-LD
  organizationName: string;
  organizationLogoUrl: string;
  sameAsUrls: string[];
  // Robots.txt
  robotsRules: RobotsRule[];
  // Sitemap
  changeFrequency: string;
  priorityDefault: number;
  sitemapPatterns: SitemapPattern[];
};

type SeoEntity = {
  id: string;
  type: 'page' | 'blog' | 'category' | 'brand';
  name: string;
  url: string;
  seoTitle: string;
  seoDescription: string;
};

const DEFAULT_SETTINGS: SeoSettings = {
  defaultMetaTitleFormat: '{page_title} | Reloom',
  defaultMetaDescriptionFormat:
    'Shop {page_title} on Reloom. Premium thrift marketplace for pre-loved fashion, sneakers, electronics & more.',
  ogImageUrl: '',
  twitterHandle: '@reloom',
  facebookAppId: '',
  googleAnalyticsId: 'G-XXXXXXXXXX',
  organizationName: 'Reloom',
  organizationLogoUrl: '',
  sameAsUrls: [
    'https://facebook.com/reloom',
    'https://twitter.com/reloom',
    'https://instagram.com/reloom',
  ],
  robotsRules: [
    { id: 'r1', path: '/', allow: true },
    { id: 'r2', path: '/admin/', allow: false },
    { id: 'r3', path: '/cart/', allow: false },
    { id: 'r4', path: '/checkout/', allow: false },
    { id: 'r5', path: '/search/', allow: true },
  ],
  changeFrequency: 'weekly',
  priorityDefault: 0.5,
  sitemapPatterns: [
    { id: 's1', pattern: '/products/*', type: 'include' },
    { id: 's2', pattern: '/blogs/*', type: 'include' },
    { id: 's3', pattern: '/categories/*', type: 'include' },
    { id: 's4', pattern: '/admin/*', type: 'exclude' },
  ],
};

const SAMPLE_ENTITIES: SeoEntity[] = [
  { id: 'p1', type: 'page', name: 'Homepage', url: '/', seoTitle: 'Reloom — Premium Thrift Marketplace', seoDescription: 'Buy and sell pre-loved fashion, sneakers, luxury, electronics and more.' },
  { id: 'p2', type: 'page', name: 'About Us', url: '/about', seoTitle: 'About Reloom | Premium Thrift Marketplace', seoDescription: 'Learn about Reloom, the premium thrift marketplace connecting buyers and sellers of pre-loved goods.' },
  { id: 'p3', type: 'page', name: 'Contact', url: '/contact', seoTitle: 'Contact Us | Reloom', seoDescription: 'Get in touch with the Reloom team. We are here to help with your questions and concerns.' },
  { id: 'b1', type: 'blog', name: 'Summer Collection 2025', url: '/blogs/summer-collection-2025', seoTitle: 'Summer Collection 2025 | Reloom Blog', seoDescription: 'Discover the hottest summer trends in our latest collection.' },
  { id: 'b2', type: 'blog', name: 'How to Style Vintage Denim', url: '/blogs/how-to-style-vintage-denim', seoTitle: 'How to Style Vintage Denim | Reloom Blog', seoDescription: 'Tips and tricks for styling vintage denim pieces from our curated collection.' },
  { id: 'b3', type: 'blog', name: 'Sustainable Fashion Guide', url: '/blogs/sustainable-fashion-guide', seoTitle: 'Sustainable Fashion Guide | Reloom Blog', seoDescription: 'Your complete guide to building a sustainable wardrobe with thrifted pieces.' },
  { id: 'c1', type: 'category', name: 'Sneakers', url: '/category/sneakers', seoTitle: 'Buy Pre-Loved Sneakers Online | Reloom', seoDescription: 'Shop authentic pre-loved sneakers from top brands. curated collection of vintage and limited edition sneakers.' },
  { id: 'c2', type: 'category', name: 'Luxury Bags', url: '/category/luxury-bags', seoTitle: 'Pre-Owned Luxury Bags | Reloom', seoDescription: 'Authenticated pre-owned luxury handbags from Gucci, Louis Vuitton, Chanel and more.' },
  { id: 'c3', type: 'category', name: 'Vintage Clothing', url: '/category/vintage-clothing', seoTitle: 'Vintage Clothing Online | Reloom', seoDescription: 'Unique vintage clothing pieces curated for style enthusiasts. Shop retro fashion.' },
  { id: 'br1', type: 'brand', name: 'Nike', url: '/brands/nike', seoTitle: 'Nike Pre-Loved | Reloom', seoDescription: 'Shop pre-loved Nike sneakers, apparel and accessories. authenticated and quality checked.' },
  { id: 'br2', type: 'brand', name: 'Levi\'s', url: '/brands/levis', seoTitle: 'Levi\'s Vintage & Pre-Loved | Reloom', seoDescription: 'Curated collection of pre-loved Levi\'s denim jackets, jeans and vintage pieces.' },
  { id: 'br3', type: 'brand', name: 'Gucci', url: '/brands/gucci', seoTitle: 'Pre-Owned Gucci | Reloom', seoDescription: 'Authenticated pre-owned Gucci bags, accessories and clothing. luxury resale.' },
];

const FREQUENCY_OPTIONS = [
  { value: 'always', label: 'Always' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'never', label: 'Never' },
];

const TYPE_OPTIONS = [
  { value: 'include', label: 'Include' },
  { value: 'exclude', label: 'Exclude' },
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

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  );
}

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function HealthCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:shadow-lift">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</p>
          <p className={cn('mt-2 text-2xl font-bold', color)}>{value}</p>
          <p className="mt-1 text-xs text-ink-400">{sub}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-50">
          <Icon className="h-5 w-5 text-ink-500" />
        </div>
      </div>
    </div>
  );
}

function InlineEditor({
  value,
  onSave,
  inputType,
}: {
  value: string;
  onSave: (val: string) => void;
  inputType?: 'input' | 'textarea';
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  if (!editing) {
    return (
      <div className="group flex items-start gap-2">
        <p className="flex-1 truncate text-sm text-ink-800">{value}</p>
        <button
          onClick={() => setEditing(true)}
          className="mt-0.5 shrink-0 opacity-0 transition group-hover:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5 text-ink-400 hover:text-brand-600" />
        </button>
      </div>
    );
  }

  const handleSave = () => {
    onSave(editValue);
    setEditing(false);
  };

  return inputType === 'textarea' ? (
    <div className="space-y-2">
      <Textarea
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className="min-h-[60px] text-sm"
      />
      <div className="flex gap-1.5">
        <Button size="sm" variant="brand" onClick={handleSave}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setEditValue(value); setEditing(false); }}>
          Cancel
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className="h-8 text-sm"
      />
      <Button size="sm" variant="brand" onClick={handleSave}>
        Save
      </Button>
      <Button size="sm" variant="ghost" onClick={() => { setEditValue(value); setEditing(false); }}>
        Cancel
      </Button>
    </div>
  );
}

export default function AdminSeoPage() {
  const [settings, setSettings] = useState<SeoSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>({ message: '', visible: false });
  const [entities] = useState<SeoEntity[]>(SAMPLE_ENTITIES);
  const [entitySearch, setEntitySearch] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL');
  const [newSameAs, setNewSameAs] = useState('');

  const loadSettings = useCallback(() => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SeoSettings>;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
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

  function persistSettings(updated: SeoSettings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      throw new Error('Failed to save settings');
    }
  }

  async function apiSave(section: string, payload: Partial<SeoSettings>) {
    const updated = { ...settings, ...payload };
    setSavingSection(section);
    try {
      persistSettings(updated);
      setSettings(updated);
      showToast(`${section} settings saved successfully`);
    } catch {
      showToast('Failed to save settings');
    } finally {
      setSavingSection(null);
    }
  }

  function updateField<K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function addRobotsRule() {
    const rule: RobotsRule = { id: generateId(), path: '/', allow: true };
    updateField('robotsRules', [...settings.robotsRules, rule]);
  }

  function updateRobotsRule(id: string, patch: Partial<RobotsRule>) {
    const rules = settings.robotsRules.map((r) => (r.id === id ? { ...r, ...patch } : r));
    updateField('robotsRules', rules);
  }

  function removeRobotsRule(id: string) {
    updateField('robotsRules', settings.robotsRules.filter((r) => r.id !== id));
  }

  function addSitemapPattern() {
    const p: SitemapPattern = { id: generateId(), pattern: '/', type: 'include' };
    updateField('sitemapPatterns', [...settings.sitemapPatterns, p]);
  }

  function updateSitemapPattern(id: string, patch: Partial<SitemapPattern>) {
    const patterns = settings.sitemapPatterns.map((p) =>
      p.id === id ? { ...p, ...patch } : p,
    );
    updateField('sitemapPatterns', patterns);
  }

  function removeSitemapPattern(id: string) {
    updateField('sitemapPatterns', settings.sitemapPatterns.filter((p) => p.id !== id));
  }

  function addSameAs(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (settings.sameAsUrls.includes(trimmed)) return;
    updateField('sameAsUrls', [...settings.sameAsUrls, trimmed]);
    setNewSameAs('');
  }

  function removeSameAs(url: string) {
    updateField('sameAsUrls', settings.sameAsUrls.filter((u) => u !== url));
  }

  const [, forceUpdate] = useState(0);

  function updateEntitySeo(id: string, field: 'seoTitle' | 'seoDescription', value: string) {
    const idx = entities.findIndex((e) => e.id === id);
    if (idx === -1) return;
    entities[idx] = { ...entities[idx], [field]: value };
    forceUpdate((n) => n + 1);
  }

  const totalPages = entities.length;
  const withMetaTitles = entities.filter((e) => e.seoTitle.length > 0).length;
  const missingDescriptions = entities.filter((e) => !e.seoDescription || e.seoDescription.length < 10).length;
  const shortTitles = entities.filter((e) => e.seoTitle.length < 30 || e.seoTitle.length > 60).length;
  const canonicalCount = totalPages;

  const filteredEntities = entities.filter((e) => {
    if (entityTypeFilter !== 'ALL' && e.type !== entityTypeFilter) return false;
    if (entitySearch) {
      const q = entitySearch.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.url.toLowerCase().includes(q) ||
        e.seoTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div>
          <Skeleton className="mb-2 h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SectionSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const ENTITY_TYPE_OPTIONS = [
    { value: 'ALL', label: 'All Entities' },
    { value: 'page', label: 'Pages' },
    { value: 'blog', label: 'Blogs' },
    { value: 'category', label: 'Categories' },
    { value: 'brand', label: 'Brands' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Search className="h-6 w-6 text-brand-600" />
            SEO Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Configure SEO settings, structured data, and manage meta tags across entities
          </p>
        </div>
      </div>

      {/* SEO Health Overview */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <BarChart3 className="h-3.5 w-3.5" />
          SEO Health Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HealthCard
            label="Pages with Meta Titles"
            value={withMetaTitles}
            sub={`out of ${totalPages} tracked entities`}
            color="text-emerald-600"
            icon={Hash}
          />
          <HealthCard
            label="Missing Meta Descriptions"
            value={missingDescriptions}
            sub="entities need attention"
            color={missingDescriptions > 0 ? 'text-amber-600' : 'text-emerald-600'}
            icon={AlertTriangle}
          />
          <HealthCard
            label="Short/Long Titles"
            value={shortTitles}
            sub="not in 30-60 char range"
            color={shortTitles > 0 ? 'text-amber-600' : 'text-emerald-600'}
            icon={ChartNoAxesColumn}
          />
          <HealthCard
            label="Canonical URLs"
            value={canonicalCount}
            sub="all entities have canonical"
            color="text-brand-600"
            icon={ExternalLink}
          />
        </div>
      </section>

      {/* Two-column settings */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* SEO Rules */}
        <SectionCard
          icon={Globe}
          title="SEO Rules"
          badge="defaults"
          saving={savingSection === 'SEO Rules'}
          onSave={() =>
            apiSave('SEO Rules', {
              defaultMetaTitleFormat: settings.defaultMetaTitleFormat,
              defaultMetaDescriptionFormat: settings.defaultMetaDescriptionFormat,
              ogImageUrl: settings.ogImageUrl,
              twitterHandle: settings.twitterHandle,
              facebookAppId: settings.facebookAppId,
              googleAnalyticsId: settings.googleAnalyticsId,
            })
          }
        >
          <FieldRow label="Default Meta Title Format">
            <Input
              placeholder="{page_title} | Reloom"
              value={settings.defaultMetaTitleFormat}
              onChange={(e) => updateField('defaultMetaTitleFormat', e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-400">
              Use {'{page_title}'} as placeholder for dynamic titles
            </p>
          </FieldRow>
          <FieldRow label="Default Meta Description Format">
            <Textarea
              placeholder="Shop {page_title} on Reloom..."
              value={settings.defaultMetaDescriptionFormat}
              onChange={(e) => updateField('defaultMetaDescriptionFormat', e.target.value)}
              className="min-h-[80px]"
            />
            <p className="mt-1 text-xs text-ink-400">
              Use {'{page_title}'} as placeholder for dynamic descriptions
            </p>
          </FieldRow>
          <FieldRow label="Default OG Image URL">
            <Input
              placeholder="https://example.com/og-image.png"
              value={settings.ogImageUrl}
              onChange={(e) => updateField('ogImageUrl', e.target.value)}
            />
            {settings.ogImageUrl && (
              <div className="mt-2 flex h-16 w-28 items-center justify-center overflow-hidden rounded-lg border border-ink-200 bg-ink-50 p-1">
                <img
                  src={settings.ogImageUrl}
                  alt="OG preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </FieldRow>
          <FieldRow label="Twitter Handle">
            <Input
              placeholder="@reloom"
              value={settings.twitterHandle}
              onChange={(e) => updateField('twitterHandle', e.target.value)}
            />
          </FieldRow>
          <FieldRow label="Facebook App ID">
            <Input
              placeholder="1234567890"
              value={settings.facebookAppId}
              onChange={(e) => updateField('facebookAppId', e.target.value)}
            />
          </FieldRow>
          <FieldRow label="Google Analytics ID">
            <Input
              placeholder="G-XXXXXXXXXX"
              value={settings.googleAnalyticsId}
              onChange={(e) => updateField('googleAnalyticsId', e.target.value)}
              className="font-mono"
            />
          </FieldRow>
        </SectionCard>

        {/* JSON-LD / Structured Data */}
        <SectionCard
          icon={FileJson}
          title="JSON-LD / Structured Data"
          badge="schema"
          saving={savingSection === 'Structured Data'}
          onSave={() =>
            apiSave('Structured Data', {
              organizationName: settings.organizationName,
              organizationLogoUrl: settings.organizationLogoUrl,
              sameAsUrls: settings.sameAsUrls,
            })
          }
        >
          <FieldRow label="Organization Name">
            <Input
              placeholder="Your Organization"
              value={settings.organizationName}
              onChange={(e) => updateField('organizationName', e.target.value)}
            />
          </FieldRow>
          <FieldRow label="Organization Logo URL">
            <Input
              placeholder="https://example.com/logo.png"
              value={settings.organizationLogoUrl}
              onChange={(e) => updateField('organizationLogoUrl', e.target.value)}
            />
            {settings.organizationLogoUrl && (
              <div className="mt-2 flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-ink-200 bg-ink-50 p-1">
                <img
                  src={settings.organizationLogoUrl}
                  alt="Logo preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </FieldRow>
          <FieldRow label="Same As URLs (social profiles)">
            <div className="space-y-2">
              {settings.sameAsUrls.map((url) => (
                <div key={url} className="flex items-center gap-2">
                  <Input
                    value={url}
                    onChange={(e) => {
                      const updated = settings.sameAsUrls.map((u) =>
                        u === url ? e.target.value : u,
                      );
                      updateField('sameAsUrls', updated);
                    }}
                    className="h-8 text-sm"
                  />
                  <button
                    onClick={() => removeSameAs(url)}
                    className="shrink-0 text-ink-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={newSameAs}
                  onChange={(e) => setNewSameAs(e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSameAs(newSameAs);
                    }
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => addSameAs(newSameAs)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </FieldRow>
        </SectionCard>

        {/* Robots.txt Rules */}
        <SectionCard
          icon={Shield}
          title="Robots.txt Rules"
          badge="crawl"
          saving={savingSection === 'Robots'}
          onSave={() =>
            apiSave('Robots', {
              robotsRules: settings.robotsRules,
            })
          }
        >
          <div className="space-y-2">
            {settings.robotsRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/50 p-2"
              >
                <Select
                  options={[
                    { value: 'allow', label: 'Allow' },
                    { value: 'disallow', label: 'Disallow' },
                  ]}
                  value={rule.allow ? 'allow' : 'disallow'}
                  onChange={(e) => updateRobotsRule(rule.id, { allow: e.target.value === 'allow' })}
                  className="h-8 w-28 text-xs"
                />
                <Input
                  value={rule.path}
                  onChange={(e) => updateRobotsRule(rule.id, { path: e.target.value })}
                  placeholder="/path/"
                  className="h-8 flex-1 text-sm font-mono"
                />
                <button
                  onClick={() => removeRobotsRule(rule.id)}
                  className="shrink-0 text-ink-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRobotsRule} className="w-full">
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </div>
          <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3">
            <p className="font-mono text-xs text-ink-500 whitespace-pre-wrap">
              User-agent: *
              {settings.robotsRules
                .map((r) => `\n${r.allow ? 'Allow' : 'Disallow'}: ${r.path}`)
                .join('')}
            </p>
          </div>
        </SectionCard>

        {/* Sitemap Settings */}
        <SectionCard
          icon={Sitemap}
          title="Sitemap Settings"
          badge="xml"
          saving={savingSection === 'Sitemap'}
          onSave={() =>
            apiSave('Sitemap', {
              changeFrequency: settings.changeFrequency,
              priorityDefault: settings.priorityDefault,
              sitemapPatterns: settings.sitemapPatterns,
            })
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="Default Change Frequency">
              <Select
                options={FREQUENCY_OPTIONS}
                value={settings.changeFrequency}
                onChange={(e) => updateField('changeFrequency', e.target.value)}
              />
            </FieldRow>
            <FieldRow label="Default Priority">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={settings.priorityDefault}
                  onChange={(e) => updateField('priorityDefault', Number(e.target.value))}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:shadow-soft"
                />
                <Badge variant="brand" className="min-w-[3rem] justify-center font-mono">
                  {settings.priorityDefault.toFixed(1)}
                </Badge>
              </div>
            </FieldRow>
          </div>
          <FieldRow label="Include / Exclude Patterns">
            <div className="space-y-2">
              {settings.sitemapPatterns.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/50 p-2"
                >
                  <Select
                    options={TYPE_OPTIONS}
                    value={p.type}
                    onChange={(e) =>
                      updateSitemapPattern(p.id, { type: e.target.value as 'include' | 'exclude' })
                    }
                    className="h-8 w-24 text-xs"
                  />
                  <Input
                    value={p.pattern}
                    onChange={(e) => updateSitemapPattern(p.id, { pattern: e.target.value })}
                    placeholder="/path/*"
                    className="h-8 flex-1 text-sm font-mono"
                  />
                  <button
                    onClick={() => removeSitemapPattern(p.id)}
                    className="shrink-0 text-ink-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addSitemapPattern} className="w-full">
                <Plus className="h-4 w-4" />
                Add Pattern
              </Button>
            </div>
          </FieldRow>
        </SectionCard>
      </div>

      {/* Bulk SEO Editor */}
      <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-50">
              <PenLine className="h-4.5 w-4.5 text-ink-500" />
            </div>
            <h2 className="font-display text-base font-semibold text-ink-900">
              Bulk SEO Editor
            </h2>
            <Badge variant="outline" className="text-[10px]">
              {filteredEntities.length} entities
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={entitySearch}
              onChange={(e) => setEntitySearch(e.target.value)}
              placeholder="Search entities..."
              className="h-9 pl-10"
            />
          </div>
          <Select
            options={ENTITY_TYPE_OPTIONS}
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="h-9 w-36"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-400 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-400 uppercase tracking-wider min-w-[200px]">
                  SEO Title
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink-400 uppercase tracking-wider min-w-[280px]">
                  SEO Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filteredEntities.map((entity) => {
                const titleOk = entity.seoTitle.length >= 30 && entity.seoTitle.length <= 60;
                const descOk =
                  entity.seoDescription.length >= 10 &&
                  entity.seoDescription.length <= 160;
                return (
                  <tr key={entity.id} className="group hover:bg-ink-50/50 transition-colors">
                    <td className="px-3 py-3">
                      <Badge
                        variant={
                          entity.type === 'page'
                            ? 'default'
                            : entity.type === 'blog'
                              ? 'brand'
                              : entity.type === 'category'
                                ? 'outline'
                                : 'success'
                        }
                        className="text-[10px]"
                      >
                        {entity.type}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 font-medium text-ink-800 whitespace-nowrap">
                      {entity.name}
                    </td>
                    <td className="px-3 py-3 text-ink-500 font-mono text-xs max-w-[120px] truncate">
                      {entity.url}
                    </td>
                    <td className="px-3 py-3">
                      <InlineEditor
                        value={entity.seoTitle}
                        onSave={(val) => updateEntitySeo(entity.id, 'seoTitle', val)}
                      />
                      <div className="mt-1 flex items-center gap-1.5">
                        <div
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            titleOk ? 'bg-emerald-400' : 'bg-amber-400',
                          )}
                        />
                        <span className="text-[10px] text-ink-400">
                          {entity.seoTitle.length} chars
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <InlineEditor
                        value={entity.seoDescription}
                        onSave={(val) => updateEntitySeo(entity.id, 'seoDescription', val)}
                        inputType="textarea"
                      />
                      <div className="mt-1 flex items-center gap-1.5">
                        <div
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            descOk ? 'bg-emerald-400' : 'bg-amber-400',
                          )}
                        />
                        <span className="text-[10px] text-ink-400">
                          {entity.seoDescription.length} chars
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEntities.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-sm text-ink-400">
                    No entities match your search
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Toast toast={toast} />
    </div>
  );
}
