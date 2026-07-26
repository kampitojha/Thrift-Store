'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  Bell,
  Megaphone,
  ArrowUpRight,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function CommunicationSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

const channels = [
  {
    title: 'Email Templates',
    description: 'Manage transactional and marketing email templates with dynamic variables.',
    icon: Mail,
    href: '/admin/communication/email-templates',
    color: 'bg-violet-50 text-violet-700',
    iconBg: 'bg-violet-100',
  },
  {
    title: 'Push Notification Templates',
    description: 'Create and manage push notification templates for mobile and web.',
    icon: Bell,
    href: '/admin/communication/push-templates',
    color: 'bg-amber-50 text-amber-700',
    iconBg: 'bg-amber-100',
  },
  {
    title: 'Announcements',
    description: 'Broadcast platform-wide announcements with scheduling and priority levels.',
    icon: Megaphone,
    href: '/admin/communication/announcements',
    color: 'bg-emerald-50 text-emerald-700',
    iconBg: 'bg-emerald-100',
  },
];

export default function CommunicationDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isHydrated) setLoading(false);
  }, [isHydrated]);

  if (!isHydrated || loading) return <CommunicationSkeleton />;

  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-brand-600" />
            Communication
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Manage emails, push notifications, and announcements
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <Link
            key={channel.title}
            href={channel.href}
            className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft transition hover:shadow-lift hover:border-brand-200"
          >
            <div className="flex items-start justify-between">
              <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', channel.iconBg)}>
                <channel.icon className={cn('h-6 w-6', channel.color.replace('bg-', 'text-').split(' ')[1] || 'text-brand-600')} />
              </div>
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">
              {channel.title}
            </h3>
            <p className="mt-2 text-sm text-ink-500 leading-relaxed">
              {channel.description}
            </p>
            <div className="mt-4 flex items-center gap-1 text-sm font-medium text-brand-600">
              Open <ArrowUpRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
