'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Download, Calendar, DollarSign, ShoppingCart, Package } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/tabs';

type RevenueSummary = {
  totalRevenue: number; totalOrders: number; averageOrderValue: number;
  from: string; to: string;
};

export default function ReportsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    setDateRange({ from: thirtyDaysAgo, to: today });
    setLoading(false);
  }, [user, router, thirtyDaysAgo, today]);

  const fetchRevenue = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.from) params.set('from', dateRange.from);
      if (dateRange.to) params.set('to', dateRange.to);
      const data = await apiClient.get<RevenueSummary>(`/sellers/reports/revenue?${params}`);
      setRevenue(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load revenue summary');
    }
  }, [dateRange]);

  useEffect(() => {
    if (dateRange.from || dateRange.to) fetchRevenue();
  }, [fetchRevenue, dateRange]);

  const downloadCSV = async (type: string) => {
    setDownloading(type);
    try {
      const params = new URLSearchParams();
      if (dateRange.from) params.set('from', dateRange.from);
      if (dateRange.to) params.set('to', dateRange.to);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/sellers/reports/${type}?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('reloom_access_token')}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report-${dateRange.from || 'all'}-${dateRange.to || 'latest'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to download report');
    } finally {
      setDownloading(null);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-ink-100" />
          <div className="h-12 rounded-2xl bg-ink-100" />
          <div className="h-48 rounded-2xl bg-ink-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Reports</h1>
          <p className="text-sm text-ink-500">Export sales, inventory, and order data</p>
        </div>
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">From</label>
          <Input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="h-10" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">To</label>
          <Input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="h-10" />
        </div>
      </div>

      {revenue && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-ink-100 bg-white p-5">
            <div className="flex items-center gap-2 text-ink-400 mb-2"><DollarSign className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Revenue</span></div>
            <p className="font-display text-2xl font-semibold text-ink-900">{formatINR(revenue.totalRevenue)}</p>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-5">
            <div className="flex items-center gap-2 text-ink-400 mb-2"><ShoppingCart className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Orders</span></div>
            <p className="font-display text-2xl font-semibold text-ink-900">{revenue.totalOrders}</p>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-5">
            <div className="flex items-center gap-2 text-ink-400 mb-2"><Package className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Avg order</span></div>
            <p className="font-display text-2xl font-semibold text-ink-900">{formatINR(revenue.averageOrderValue)}</p>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabList className="mb-6">
          <Tab value="sales">Sales report</Tab>
          <Tab value="orders">Orders report</Tab>
          <Tab value="inventory">Inventory report</Tab>
        </TabList>

        <TabPanel value="sales">
          <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-ink-300" />
            <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">Sales report</h3>
            <p className="mt-2 text-sm text-ink-500 max-w-md mx-auto">
              Export a CSV file containing all sales data including product names, quantities, revenue, and order details for the selected date range.
            </p>
            <Button variant="brand" className="mt-6" onClick={() => downloadCSV('sales')} disabled={downloading === 'sales'}>
              {downloading === 'sales' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download CSV
            </Button>
          </div>
        </TabPanel>

        <TabPanel value="orders">
          <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-ink-300" />
            <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">Orders report</h3>
            <p className="mt-2 text-sm text-ink-500 max-w-md mx-auto">
              Export a CSV file with all order data including order numbers, buyer information, items, totals, statuses, and shipping details.
            </p>
            <Button variant="brand" className="mt-6" onClick={() => downloadCSV('orders')} disabled={downloading === 'orders'}>
              {downloading === 'orders' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download CSV
            </Button>
          </div>
        </TabPanel>

        <TabPanel value="inventory">
          <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-ink-300" />
            <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">Inventory report</h3>
            <p className="mt-2 text-sm text-ink-500 max-w-md mx-auto">
              Export a CSV file containing your complete inventory data: product titles, SKUs, quantities, prices, statuses, and view counts.
            </p>
            <Button variant="brand" className="mt-6" onClick={() => downloadCSV('inventory')} disabled={downloading === 'inventory'}>
              {downloading === 'inventory' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download CSV
            </Button>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
