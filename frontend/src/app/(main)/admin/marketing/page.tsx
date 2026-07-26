'use client';

import Link from 'next/link';
import {
  Megaphone,
  Percent,
  Mail,
  Gift,
  Share2,
  MessageSquare,
  Bell,
  Image,
  Globe,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  {
    title: 'Campaigns',
    description: 'Create and manage marketing campaigns',
    href: '/admin/marketing/campaigns',
    icon: Megaphone,
    color: 'bg-violet-50 text-violet-700',
    iconBg: 'bg-violet-100',
  },
  {
    title: 'Promotions',
    description: 'Discounts, offers and promotional events',
    href: '/admin/marketing/promotions',
    icon: Percent,
    color: 'bg-rose-50 text-rose-700',
    iconBg: 'bg-rose-100',
  },
  {
    title: 'Newsletter',
    description: 'Email newsletters and subscriber management',
    href: '/admin/marketing/newsletter',
    icon: Mail,
    color: 'bg-blue-50 text-blue-700',
    iconBg: 'bg-blue-100',
  },
  {
    title: 'Communication',
    description: 'Email templates, push notifications & announcements',
    href: '/admin/communication/email-templates',
    icon: MessageSquare,
    color: 'bg-cyan-50 text-cyan-700',
    iconBg: 'bg-cyan-100',
    sublinks: [
      { label: 'Email Templates', href: '/admin/communication/email-templates' },
      { label: 'Push Templates', href: '/admin/communication/push-templates' },
      { label: 'Announcements', href: '/admin/communication/announcements' },
    ],
  },
  {
    title: 'Loyalty',
    description: 'Loyalty points, tiers and rewards program',
    href: '/admin/loyalty',
    icon: Gift,
    color: 'bg-amber-50 text-amber-700',
    iconBg: 'bg-amber-100',
  },
  {
    title: 'Referrals',
    description: 'Referral program and invite tracking',
    href: '/admin/referrals',
    icon: Share2,
    color: 'bg-emerald-50 text-emerald-700',
    iconBg: 'bg-emerald-100',
  },
  {
    title: 'Media',
    description: 'Uploaded images, videos and assets',
    href: '/admin/media',
    icon: Image,
    color: 'bg-pink-50 text-pink-700',
    iconBg: 'bg-pink-100',
  },
  {
    title: 'SEO',
    description: 'Search engine optimization and meta tags',
    href: '/admin/seo',
    icon: Globe,
    color: 'bg-indigo-50 text-indigo-700',
    iconBg: 'bg-indigo-100',
  },
];

export default function MarketingDashboardPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-brand-600" />
          Marketing
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Campaigns, promotions, communications and growth tools
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SECTIONS.map((section) => (
          <Link
            key={section.title}
            href={section.href}
            className="group rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition hover:shadow-lift hover:border-brand-200"
          >
            <div className="flex items-start justify-between">
              <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', section.iconBg)}>
                <section.icon className={cn('h-6 w-6', section.color.replace('bg-', 'text-').split(' ')[1])} />
              </div>
              <ChevronRight className="h-4 w-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
            </div>
            <h3 className="mt-4 font-display text-base font-semibold text-ink-900">
              {section.title}
            </h3>
            <p className="mt-1 text-sm text-ink-500 leading-relaxed">
              {section.description}
            </p>
            {section.sublinks && (
              <div className="mt-3 space-y-1">
                {section.sublinks.map((sub) => (
                  <div
                    key={sub.label}
                    className="text-xs text-ink-400 hover:text-brand-600 transition-colors"
                  >
                    {sub.label}
                  </div>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
