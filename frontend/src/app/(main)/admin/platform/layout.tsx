'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Monitor, Wifi, ActivitySquare, Database, HardDrive, Server, Webhook, Sunrise, ScrollText, Bug, Shield, Cloud, BarChart3, Stethoscope, Terminal, Settings, ChevronRight, Clock, AlertTriangle, Rocket, Cpu, Wrench, Bell, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api';

const PLATFORM_SECTIONS = [
  {
    label: 'Monitor',
    items: [
      { href: '/admin/platform/overview', label: 'Overview', icon: Monitor },
      { href: '/admin/platform/monitoring', label: 'Real-time', icon: Wifi },
      { href: '/admin/platform/api-monitoring', label: 'API', icon: ActivitySquare },
      { href: '/admin/platform/database', label: 'Database', icon: Database },
      { href: '/admin/platform/redis', label: 'Redis', icon: HardDrive },
    ],
  },
  {
    label: 'Operate',
    items: [
      { href: '/admin/platform/queues', label: 'Queues', icon: Server },
      { href: '/admin/platform/workers', label: 'Workers', icon: Clock },
      { href: '/admin/platform/cron', label: 'Cron Jobs', icon: Clock },
      { href: '/admin/platform/webhooks', label: 'Webhooks', icon: Webhook },
      { href: '/admin/platform/maintenance', label: 'Maintenance', icon: Wrench },
    ],
  },
  {
    label: 'Observe',
    items: [
      { href: '/admin/platform/logs', label: 'System Logs', icon: ScrollText },
      { href: '/admin/platform/audit', label: 'Audit Logs', icon: ScrollText },
      { href: '/admin/platform/errors', label: 'Error Center', icon: Bug },
      { href: '/admin/platform/security', label: 'Security', icon: Shield },
      { href: '/admin/platform/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Manage',
    items: [
      { href: '/admin/platform/search', label: 'Search Engine', icon: Stethoscope },
      { href: '/admin/platform/global-search', label: 'Global Search', icon: Search },
      { href: '/admin/platform/storage', label: 'Storage', icon: Cloud },
      { href: '/admin/platform/backups', label: 'Backups', icon: HardDrive },
      { href: '/admin/platform/health', label: 'Health Checks', icon: Sunrise },
    ],
  },
  {
    label: 'Configure',
    items: [
      { href: '/admin/platform/integrations', label: 'Integrations', icon: BarChart3 },
      { href: '/admin/platform/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/admin/platform/settings', label: 'System Settings', icon: Settings },
      { href: '/admin/platform/developer', label: 'Developer Tools', icon: Terminal },
      { href: '/admin/platform/feature-rollout', label: 'Feature Rollout', icon: Rocket },
      { href: '/admin/platform/environment', label: 'Environment', icon: Cpu },
    ],
  },
];

const QUICK_ACTIONS = [
  { href: '/admin/platform/health', label: 'Run Health Checks', icon: Stethoscope },
  { href: '/admin/platform/backups', label: 'Create Backup', icon: HardDrive },
  { href: '/admin/platform/logs', label: 'View Logs', icon: ScrollText },
  { href: '/admin/platform/errors', label: 'Error Center', icon: Bug },
  { href: '/admin/platform/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/platform/global-search', label: 'Global Search', icon: Search },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [healthData, setHealthData] = useState<{ status: string; checks: Record<string, { status: string }> } | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    if (isHydrated && (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role))) {
      router.push('/');
    }
  }, [user, isHydrated, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await apiClient.get<{ status: string; checks: Record<string, { status: string }> }>('/admin/platform/health');
        setHealthData(data);
      } catch { setHealthData(null); }
      finally { setHealthLoading(false); }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-ink-200 border-t-brand-600" />
          <p className="text-sm text-ink-500">Loading platform console...</p>
        </div>
      </div>
    );
  }

  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const healthColor = healthLoading ? 'bg-ink-300' :
    healthData?.status === 'healthy' ? 'bg-emerald-500' :
    healthData?.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500';

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-ink-100 px-4">
        <Link href="/admin/platform/overview" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-xs font-bold text-white shadow-sm">
            P
          </span>
          <span className="font-display text-sm font-semibold text-ink-900">
            Platform Ops
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${healthColor} shadow-sm`} title={healthData?.status || 'Unknown'} />
          <span className="text-[10px] text-ink-400 font-medium uppercase">{healthLoading ? '...' : healthData?.status || 'N/A'}</span>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600 lg:hidden">
          <span className="text-lg">&times;</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {PLATFORM_SECTIONS.map((section) => (
          <div key={section.label} className="mb-2">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                    active ? 'bg-brand-50 text-brand-800 shadow-sm' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                  )}
                >
                  <item.icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600')} />
                  <span>{item.label}</span>
                  {active && <ChevronRight className="ml-auto h-4 w-4 text-brand-400" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-100 p-2 space-y-0.5">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50 transition"
          >
            <action.icon className="h-[18px] w-[18px] shrink-0" />
            <span>{action.label}</span>
          </Link>
        ))}
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50 transition"
        >
          <Monitor className="h-[18px] w-[18px] shrink-0" />
          <span>Admin Panel</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-ink-50/50">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r border-ink-100 bg-white lg:flex">
        {sidebarContent}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-ink-100 bg-white shadow-lift animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col lg:ml-60">
        <header className="sticky top-0 z-30 border-b border-ink-100/80 bg-white/80 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
            <button onClick={() => setSidebarOpen(true)} className="rounded-full p-2 text-ink-600 hover:bg-ink-100 lg:hidden" aria-label="Open sidebar">
              <span className="text-lg">☰</span>
            </button>
            <div className="flex items-center gap-2 text-sm text-ink-500">
              <Monitor className="h-4 w-4" />
              <span className="font-medium text-ink-700">Platform Operations</span>
              <span className="text-ink-300">/</span>
              <span className="capitalize">{pathname.split('/').pop()?.replace(/-/g, ' ') || 'Overview'}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {healthData && (
                <div className="flex items-center gap-1.5 rounded-full border border-ink-100 bg-white px-3 py-1.5 text-xs">
                  <div className={`h-2 w-2 rounded-full ${healthColor}`} />
                  <span className="font-medium text-ink-600 capitalize">{healthData.status}</span>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
