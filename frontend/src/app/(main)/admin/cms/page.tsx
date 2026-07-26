'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layout,
  Image,
  BookOpen,
  FileText,
  HelpCircle,
  ToggleLeft,
  Tag,
  Gift,
  Plus,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  SearchCheck,
  Globe,
  PenLine,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type ListResponse = {
  data: { id: string; status?: string; isActive?: boolean; isEnabled?: boolean }[];
  meta: { total: number; published?: number; draft?: number; enabledCount?: number; activeCount?: number };
};

type CmsStats = {
  banners: number;
  blogs: number;
  publishedBlogs: number;
  draftBlogs: number;
  pages: number;
  faqs: number;
  featureFlags: number;
  enabledFlags: number;
  brands: number;
  coupons: number;
  activeCoupons: number;
};

const INITIAL_STATS: CmsStats = {
  banners: 0,
  blogs: 0,
  publishedBlogs: 0,
  draftBlogs: 0,
  pages: 0,
  faqs: 0,
  featureFlags: 0,
  enabledFlags: 0,
  brands: 0,
  coupons: 0,
  activeCoupons: 0,
};

function CmsDashboardSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function CmsDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [stats, setStats] = useState<CmsStats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isHydrated) return;
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return;

    const fetchAll = async () => {
      try {
        const [bannersRes, blogsRes, pagesRes, faqsRes, flagsRes, brandsRes, couponsRes] =
          await Promise.all([
            apiClient.get<ListResponse>('/admin/cms/banners'),
            apiClient.get<ListResponse>('/admin/cms/blogs'),
            apiClient.get<ListResponse>('/admin/cms/pages'),
            apiClient.get<ListResponse>('/admin/cms/faqs'),
            apiClient.get<ListResponse>('/admin/feature-flags'),
            apiClient.get<ListResponse>('/admin/brands'),
            apiClient.get<ListResponse>('/admin/coupons'),
          ]);

        const blogsMeta = blogsRes.meta || {};
        const flagsMeta = flagsRes.meta || {};
        const couponsMeta = couponsRes.meta || {};

        setStats({
          banners: bannersRes.meta?.total ?? bannersRes.data?.length ?? 0,
          blogs: blogsRes.meta?.total ?? blogsRes.data?.length ?? 0,
          publishedBlogs: blogsMeta.published ?? blogsRes.data?.filter((b) => b.status === 'PUBLISHED').length ?? 0,
          draftBlogs: blogsMeta.draft ?? blogsRes.data?.filter((b) => b.status === 'DRAFT').length ?? 0,
          pages: pagesRes.meta?.total ?? pagesRes.data?.length ?? 0,
          faqs: faqsRes.meta?.total ?? faqsRes.data?.length ?? 0,
          featureFlags: flagsRes.meta?.total ?? flagsRes.data?.length ?? 0,
          enabledFlags: flagsMeta.enabledCount ?? flagsRes.data?.filter((f) => f.isEnabled).length ?? 0,
          brands: brandsRes.meta?.total ?? brandsRes.data?.length ?? 0,
          coupons: couponsRes.meta?.total ?? couponsRes.data?.length ?? 0,
          activeCoupons: couponsMeta.activeCount ?? couponsRes.data?.filter((c) => c.isActive).length ?? 0,
        });
      } catch {
        setError('Failed to load CMS dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, isHydrated]);

  if (loading || !isHydrated) return <CmsDashboardSkeleton />;

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">Failed to load CMS dashboard</p>
          <p className="mt-1 text-sm text-ink-500">{error}</p>
        </div>
      </div>
    );
  }

  const contentCards = [
    {
      label: 'Total Banners',
      value: stats.banners.toLocaleString('en-IN'),
      sub: 'Promotional banners',
      icon: Image,
      href: '/admin/cms/banners',
      color: 'bg-violet-50 text-violet-700',
      iconBg: 'bg-violet-100',
    },
    {
      label: 'Blogs',
      value: stats.blogs.toLocaleString('en-IN'),
      sub: `${stats.publishedBlogs} published · ${stats.draftBlogs} drafts`,
      icon: BookOpen,
      href: '/admin/cms/blogs',
      color: 'bg-blue-50 text-blue-700',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Static Pages',
      value: stats.pages.toLocaleString('en-IN'),
      sub: 'CMS pages',
      icon: FileText,
      href: '/admin/cms/pages',
      color: 'bg-amber-50 text-amber-700',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'FAQs',
      value: stats.faqs.toLocaleString('en-IN'),
      sub: 'Frequently asked questions',
      icon: HelpCircle,
      href: '/admin/cms/faqs',
      color: 'bg-emerald-50 text-emerald-700',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Feature Flags',
      value: `${stats.enabledFlags} / ${stats.featureFlags}`,
      sub: 'enabled / total',
      icon: ToggleLeft,
      href: '/admin/feature-flags',
      color: 'bg-cyan-50 text-cyan-700',
      iconBg: 'bg-cyan-100',
    },
    {
      label: 'Brands',
      value: stats.brands.toLocaleString('en-IN'),
      sub: 'Product brands',
      icon: Tag,
      href: '/admin/brands',
      color: 'bg-pink-50 text-pink-700',
      iconBg: 'bg-pink-100',
    },
    {
      label: 'Coupons',
      value: `${stats.activeCoupons} / ${stats.coupons}`,
      sub: 'active / total',
      icon: Gift,
      href: '/admin/coupons',
      color: 'bg-orange-50 text-orange-700',
      iconBg: 'bg-orange-100',
    },
    {
      label: 'SEO Health',
      value: stats.pages > 0 || stats.blogs > 0 ? 'Needs Review' : 'No Content',
      sub: 'Meta tags & sitemap',
      icon: SearchCheck,
      href: '/admin/cms/pages',
      color: 'bg-ink-50 text-ink-700',
      iconBg: 'bg-ink-100',
      highlight: true,
    },
  ];

  const quickActions = [
    { label: 'Create Blog', href: '/admin/cms/blogs/new', icon: PenLine },
    { label: 'Create Banner', href: '/admin/cms/banners/new', icon: Image },
    { label: 'Create Page', href: '/admin/cms/pages/new', icon: FileText },
    { label: 'Create FAQ', href: '/admin/cms/faqs/new', icon: HelpCircle },
  ];

  const quickLinks = [
    { label: 'Banners', href: '/admin/cms/banners', icon: Image, count: stats.banners },
    { label: 'Blogs', href: '/admin/cms/blogs', icon: BookOpen, count: stats.blogs },
    { label: 'Static Pages', href: '/admin/cms/pages', icon: FileText, count: stats.pages },
    { label: 'FAQs', href: '/admin/cms/faqs', icon: HelpCircle, count: stats.faqs },
    { label: 'Feature Flags', href: '/admin/feature-flags', icon: ToggleLeft, count: stats.featureFlags },
    { label: 'Brands', href: '/admin/brands', icon: Tag, count: stats.brands },
    { label: 'Coupons', href: '/admin/coupons', icon: Gift, count: stats.coupons },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Layout className="h-6 w-6 text-brand-600" />
            CMS Dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Manage content across the platform
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Content Overview Cards */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <Globe className="h-3.5 w-3.5" />
          Content Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contentCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:shadow-lift hover:border-brand-200"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
                    {card.label}
                  </p>
                  <p className={cn(
                    'mt-2 text-2xl font-bold',
                    card.highlight ? 'text-amber-600' : 'text-ink-900',
                  )}>
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">{card.sub}</p>
                </div>
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', card.iconBg)}>
                  <card.icon className={cn('h-5 w-5', card.color.replace('bg-', 'text-').split(' ')[1] || 'text-brand-600')} />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end">
                <span className="flex items-center gap-1 text-xs font-medium text-brand-600">
                  View <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <Plus className="h-3.5 w-3.5" />
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button variant="outline" size="sm">
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
            <ChevronRight className="h-3.5 w-3.5" />
            All CMS Sections
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft transition hover:shadow-lift hover:border-brand-200"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-50">
                <link.icon className="h-5 w-5 text-ink-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-800">{link.label}</p>
                <p className="text-xs text-ink-400">{link.count} items</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
