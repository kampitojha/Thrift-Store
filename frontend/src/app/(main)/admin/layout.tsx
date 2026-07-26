'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  ShoppingCart,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  BarChart3,
  ShieldCheck,
  Tag,
  Tags,
  ScrollText,
  Search,
  Bell,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Settings,
  User,
  Activity,
  IndianRupee,
  Shield,
  KeyRound,
  Image,
  FileText,
  HelpCircle,
  BookOpen,
  Flag,
  Layout,
  Megaphone,
  Mail,
  Globe,
  Sliders,
  ToggleLeft,
  Palette,
  Layers,
  Percent,
  Gift,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';

const NAV_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/sellers', label: 'Sellers', icon: Store },
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { href: '/admin/refunds', label: 'Refunds', icon: RefreshCcw },
      { href: '/admin/returns', label: 'Returns', icon: RotateCcw },
      { href: '/admin/disputes', label: 'Disputes', icon: ShieldAlert },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { href: '/admin/fraud', label: 'Fraud', icon: ShieldCheck },
      { href: '/admin/payouts', label: 'Payouts', icon: IndianRupee },
      { href: '/admin/finance', label: 'Finance', icon: BarChart3 },
      { href: '/admin/coupons', label: 'Coupons', icon: Tags },
      { href: '/admin/feature-flags', label: 'Feature Flags', icon: ToggleLeft },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/cms', label: 'CMS Dashboard', icon: Layout },
      { href: '/admin/cms/banners', label: 'Banners', icon: Image },
      { href: '/admin/cms/blogs', label: 'Blogs', icon: BookOpen },
      { href: '/admin/cms/pages', label: 'Static Pages', icon: FileText },
      { href: '/admin/cms/faqs', label: 'FAQs', icon: HelpCircle },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/admin/brands', label: 'Brands', icon: Tag },
      { href: '/admin/cms/categories', label: 'Categories', icon: Layers },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/admin/roles', label: 'Roles', icon: Shield },
      { href: '/admin/permissions', label: 'Permissions', icon: KeyRound },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell },
      { href: '/admin/activity', label: 'Activity', icon: Activity },
      { href: '/admin/audit', label: 'Audit Logs', icon: ScrollText },
      { href: '/admin/settings', label: 'Settings', icon: Sliders },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const logout = useAuthStore((s) => s.logout);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-ink-200 border-t-brand-600" />
          <p className="text-sm text-ink-500">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return null;
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/admin/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-ink-100 px-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-xs font-bold text-white">
            A
          </span>
          <span className="font-display text-sm font-semibold text-ink-900">
            Admin Panel
          </span>
        </Link>
        <button
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-2">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                    active
                      ? 'bg-brand-50 text-brand-800 shadow-sm'
                      : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-[18px] w-[18px] shrink-0 transition-colors',
                      active ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600',
                    )}
                  />
                  <span>{item.label}</span>
                  {active && (
                    <ChevronRight className="ml-auto h-4 w-4 text-brand-400" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-100 p-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-500 hover:bg-ink-50 transition"
        >
          <Store className="h-[18px] w-[18px] shrink-0" />
          <span>View Store</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-500 hover:bg-red-50 hover:text-red-600 transition"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-ink-50/50">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r border-ink-100 bg-white lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-900/20 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-ink-100 bg-white shadow-lift animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:ml-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-ink-100/80 bg-white/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-full p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <form onSubmit={handleSearch} className="relative hidden max-w-sm flex-1 sm:block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users, orders, products..."
                className="h-10 w-full rounded-full border border-ink-200 bg-ink-50/80 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-200"
              />
            </form>

            <div className="ml-auto flex items-center gap-2">
              <Link href="/admin/notifications" className="relative rounded-full p-2.5 text-ink-600 hover:bg-ink-100 transition">
                <Bell className="h-5 w-5" />
              </Link>

              <div className="flex items-center gap-2.5 rounded-full border border-ink-100 bg-white py-1 pl-1 pr-3">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-ink-200 text-xs font-semibold text-ink-700">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    user.username.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="hidden min-w-0 sm:block">
                  <p className="truncate text-sm font-medium text-ink-900 leading-none">
                    {user.displayName || user.username}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
