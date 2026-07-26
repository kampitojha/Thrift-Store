'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Wrench,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCcw,
  Clock,
  Shield,
  Users,
  MessageSquare,
  Save,
  Power,
  PowerOff,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

type MaintenanceData = {
  enabled: boolean;
  message: string | null;
  whitelistAdmins: string[] | null;
  estimatedCompletion: string | null;
};

type ToggleAction = 'enable' | 'disable';

type ToastState = { message: string; visible: boolean };

function Toast({ toast }: { toast: ToastState }) {
  if (!toast.visible) return null;
  return (
    <div role="alert" className="fixed bottom-6 right-6 z-50 animate-fade-up">
      <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 shadow-lift">
        <CheckCircle className="h-5 w-5 text-emerald-600" />
        <span className="text-sm font-medium text-emerald-800">{toast.message}</span>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-5 w-5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-red-800">Failed to load maintenance data</h3>
          <p className="mt-1 text-sm text-red-600">{message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCcw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    </div>
  );
}

function PreviewCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <Wrench className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-semibold text-amber-900">Maintenance Mode Active</h3>
          <p className="mt-0.5 text-sm text-amber-700">
            We&apos;ll be back soon. Thank you for your patience.
          </p>
        </div>
      </div>
      {message && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-800">
          <p>{message}</p>
        </div>
      )}
      {(message?.includes('hour') || message?.includes('minute') || message?.includes('day')) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
          <Clock className="h-3.5 w-3.5" />
          <span>Estimated completion: {message.match(/\d+\s*(hour|minute|day|hours|minutes|days)/i)?.[0] || 'Soon'}</span>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: React.ElementType;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="mb-5 flex items-center gap-2.5">
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
      {children}
    </section>
  );
}

export default function AdminMaintenancePage() {
  const [data, setData] = useState<MaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ action: ToggleAction } | null>(null);
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });

  // Configuration fields (shown when enabling)
  const [message, setMessage] = useState('');
  const [whitelistAdmins, setWhitelistAdmins] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<MaintenanceData>('/admin/platform/maintenance');
      setData(result);
      setMessage(result.message ?? '');
      setWhitelistAdmins(result.whitelistAdmins?.join(', ') ?? '');
      setEstimatedCompletion(result.estimatedCompletion ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function showToast(msg: string) {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000);
  }

  async function handleToggle(action: ToggleAction) {
    setToggling(true);
    setConfirmDialog(null);
    try {
      const body: Record<string, unknown> = { action };
      if (action === 'enable') {
        if (message.trim()) body.message = message.trim();
        const whitelist = whitelistAdmins
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (whitelist.length > 0) body.whitelistAdmins = whitelist;
        if (estimatedCompletion.trim()) body.estimatedCompletion = estimatedCompletion.trim();
      }
      await apiClient.post('/admin/platform/maintenance', body);
      await fetchData();
      showToast(
        action === 'enable'
          ? 'Maintenance mode has been enabled'
          : 'Maintenance mode has been disabled',
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to toggle maintenance mode',
      );
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div>
          <Skeleton className="mb-2 h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Wrench className="h-6 w-6 text-brand-600" />
            Maintenance Mode
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Control and monitor platform maintenance mode.
          </p>
        </div>
        <ErrorBanner message={error} onRetry={fetchData} />
        <Toast toast={toast} />
      </div>
    );
  }

  const isEnabled = data?.enabled ?? false;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Wrench className="h-6 w-6 text-brand-600" />
            Maintenance Mode
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Control and monitor platform maintenance mode.
          </p>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={cn(
          'rounded-2xl border p-6 shadow-soft transition-all',
          isEnabled
            ? 'border-red-200 bg-gradient-to-r from-red-50 to-amber-50'
            : 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50',
        )}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
              isEnabled ? 'bg-red-100' : 'bg-emerald-100',
            )}
          >
            {isEnabled ? (
              <AlertTriangle className="h-7 w-7 text-red-600" />
            ) : (
              <CheckCircle className="h-7 w-7 text-emerald-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className={cn(
                'text-lg font-semibold',
                isEnabled ? 'text-red-900' : 'text-emerald-900',
              )}
            >
              {isEnabled ? 'Maintenance Mode Active' : 'All Systems Operational'}
            </h2>
            <p
              className={cn(
                'mt-1 text-sm',
                isEnabled ? 'text-red-700' : 'text-emerald-700',
              )}
            >
              {isEnabled
                ? 'Non-admin users cannot access the platform. Only whitelisted admins can bypass.'
                : 'The platform is fully accessible to all users.'}
            </p>
          </div>
          {isEnabled && data?.estimatedCompletion && (
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2.5">
              <Clock className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-xs text-amber-500">Est. completion</p>
                <p className="text-sm font-medium text-amber-800">
                  {data.estimatedCompletion}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Toggle & Configuration */}
        <div className="space-y-6">
          {/* Toggle Section */}
          <SectionCard
            icon={isEnabled ? PowerOff : Power}
            title={isEnabled ? 'Disable Maintenance' : 'Enable Maintenance'}
            badge={isEnabled ? 'active' : 'inactive'}
          >
            <p className="mb-4 text-sm text-ink-500">
              {isEnabled
                ? 'Disable maintenance mode to restore full platform access for all users.'
                : 'Enable maintenance mode to restrict platform access to whitelisted admins only.'}
            </p>
            <Button
              variant={isEnabled ? 'default' : 'brand'}
              size="sm"
              disabled={toggling}
              onClick={() => setConfirmDialog({ action: isEnabled ? 'disable' : 'enable' })}
            >
              {toggling ? (
                <RefreshCcw className="h-4 w-4 animate-spin" />
              ) : isEnabled ? (
                <PowerOff className="h-4 w-4" />
              ) : (
                <Power className="h-4 w-4" />
              )}
              {toggling
                ? 'Updating...'
                : isEnabled
                  ? 'Disable Maintenance'
                  : 'Enable Maintenance'}
            </Button>
          </SectionCard>

          {/* Configuration Form */}
          <SectionCard icon={Settings} title="Configuration" badge="optional">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-700">
                  <MessageSquare className="h-4 w-4 text-ink-400" />
                  Maintenance Message
                </label>
                <Textarea
                  placeholder="We are currently undergoing scheduled maintenance. Please check back shortly."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[80px]"
                />
                <p className="mt-1 text-xs text-ink-400">
                  This message will be displayed to users during maintenance.
                </p>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-700">
                  <Users className="h-4 w-4 text-ink-400" />
                  Whitelisted Admins
                </label>
                <Input
                  placeholder="admin@example.com, admin2@example.com"
                  value={whitelistAdmins}
                  onChange={(e) => setWhitelistAdmins(e.target.value)}
                />
                <p className="mt-1 text-xs text-ink-400">
                  Comma-separated email addresses or usernames that can bypass maintenance mode.
                </p>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-700">
                  <Clock className="h-4 w-4 text-ink-400" />
                  Estimated Completion Time
                </label>
                <Input
                  placeholder="e.g. 2 hours, tomorrow 10 AM, 2025-01-15"
                  value={estimatedCompletion}
                  onChange={(e) => setEstimatedCompletion(e.target.value)}
                />
                <p className="mt-1 text-xs text-ink-400">
                  A human-readable estimate shown to users.
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Active Status Info */}
          <SectionCard icon={Shield} title="Access & Audit">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3">
                <span className="text-sm text-ink-600">Status</span>
                <Badge variant={isEnabled ? 'default' : 'success'}>
                  {isEnabled ? 'Under Maintenance' : 'Operational'}
                </Badge>
              </div>
              {isEnabled && data?.whitelistAdmins && data.whitelistAdmins.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-ink-400 uppercase tracking-wider">
                    Whitelisted Bypass ({data.whitelistAdmins.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.whitelistAdmins.map((admin) => (
                      <Badge key={admin} variant="brand" className="text-[10px]">
                        {admin}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {isEnabled && data?.message && (
                <div className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-ink-400">
                    <MessageSquare className="h-3 w-3" />
                    Current Message
                  </p>
                  <p className="mt-1 text-sm text-ink-700">{data.message}</p>
                </div>
              )}
              {!isEnabled && (
                <div className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-3">
                  <p className="text-sm text-ink-500">
                    No active maintenance. All systems are operational.
                  </p>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Preview & Right Column */}
        <div className="space-y-6">
          <SectionCard icon={Wrench} title="User Preview">
            <p className="mb-4 text-sm text-ink-500">
              This is what users will see when maintenance mode is active.
            </p>
            <PreviewCard message={data?.message ?? ''} />
          </SectionCard>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
      >
        {confirmDialog && (
          <>
            <DialogHeader>
              {confirmDialog.action === 'enable'
                ? 'Enable Maintenance Mode'
                : 'Disable Maintenance Mode'}
            </DialogHeader>
            <DialogBody>
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    confirmDialog.action === 'enable' ? 'bg-amber-100' : 'bg-emerald-100',
                  )}
                >
                  {confirmDialog.action === 'enable' ? (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  ) : (
                    <PowerOff className="h-5 w-5 text-emerald-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-ink-900">
                    {confirmDialog.action === 'enable'
                      ? 'Are you sure you want to enable maintenance mode?'
                      : 'Are you sure you want to disable maintenance mode?'}
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    {confirmDialog.action === 'enable'
                      ? 'Non-admin users will be unable to access the platform. Only whitelisted admins will be able to log in.'
                      : 'The platform will be fully accessible to all users immediately.'}
                  </p>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDialog(null)}>
                Cancel
              </Button>
              <Button
                variant={confirmDialog.action === 'enable' ? 'brand' : 'default'}
                size="sm"
                disabled={toggling}
                onClick={() => handleToggle(confirmDialog.action)}
              >
                {toggling ? (
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                ) : confirmDialog.action === 'enable' ? (
                  <Power className="h-4 w-4" />
                ) : (
                  <PowerOff className="h-4 w-4" />
                )}
                {toggling
                  ? 'Updating...'
                  : confirmDialog.action === 'enable'
                    ? 'Yes, Enable Maintenance'
                    : 'Yes, Disable Maintenance'}
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      <Toast toast={toast} />
    </div>
  );
}
