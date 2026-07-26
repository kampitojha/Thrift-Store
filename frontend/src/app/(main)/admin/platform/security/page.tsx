'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  Users,
  Ban,
  LogIn,
  KeyRound,
  Activity,
  Clock,
  RefreshCcw,
  CheckCircle,
  XCircle,
  Eye,
  Lock,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

type SecurityData = {
  failedLogins: { last24h: number; last7d: number };
  suspiciousAccounts: number;
  blockedUsers: { suspended: number; banned: number };
  rateLimitsHit: number;
  sessions: { active: number; expired: number };
  auditActivity: { last24h: number };
  roleChanges: { last7d: number };
  adminActions: { last7d: number };
  securityAlerts: Array<{
    type: string;
    severity: string;
    message: string;
    timestamp: string;
    userId: string | null;
  }>;
};

type Variant = 'neutral' | 'amber' | 'red';

const severityVariant: Record<string, Variant> = {
  high: 'red',
  medium: 'amber',
  low: 'neutral',
};

const typeIcon: Record<string, React.ReactNode> = {
  unauthorized_access: <Lock className="h-4 w-4" />,
  suspicious_login: <LogIn className="h-4 w-4" />,
  rate_limit: <Ban className="h-4 w-4" />,
  role_change: <Users className="h-4 w-4" />,
  admin_action: <Shield className="h-4 w-4" />,
};

function AlertCard({
  type,
  severity,
  message,
  timestamp,
}: {
  type: string;
  severity: string;
  message: string;
  timestamp: string;
}) {
  const variant = severityVariant[severity] ?? 'neutral';
  const border = {
    neutral: 'border-ink-100 bg-white',
    amber: 'border-amber-200 bg-amber-50/50',
    red: 'border-red-200 bg-red-50/50',
  };
  const iconColor = {
    neutral: 'text-ink-500',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };

  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 shadow-soft ${border[variant]}`}>
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ${iconColor[variant]}`}>
        {typeIcon[type] ?? <AlertTriangle className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-ink-900 capitalize">{type.replace(/_/g, ' ')}</p>
          <Badge variant={severity === 'high' ? 'destructive' : severity === 'medium' ? 'warning' : 'secondary'} className="text-[10px] uppercase">
            {severity}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm text-ink-600">{message}</p>
        <p className="mt-1 text-xs text-ink-400" suppressHydrationWarning>
          {relativeTime(timestamp)}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  variant = 'neutral',
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  variant?: Variant;
  trend?: { value: number; label: string };
}) {
  const border = {
    neutral: 'border-ink-100 bg-white',
    amber: 'border-amber-200 bg-amber-50/50',
    red: 'border-red-200 bg-red-50/50',
  };
  const iconColor = {
    neutral: 'text-ink-500',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };
  const valueColor = {
    neutral: 'text-ink-900',
    amber: 'text-amber-900',
    red: 'text-red-900',
  };

  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-5 shadow-soft transition hover:shadow-md ${border[variant]}`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ${iconColor[variant]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">{label}</p>
        <p className={`mt-0.5 flex items-center gap-2 text-2xl font-semibold tabular-nums ${valueColor[variant]}`}>
          {value}
        </p>
        {trend && (
          <p className="mt-0.5 text-xs text-ink-400">
            {trend.value} {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}

function AccessCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm text-brand-600">
          {icon}
        </div>
        <h3 className="font-display text-base font-semibold text-ink-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminPlatformSecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setError(null);
    try {
      const res = await apiClient.get<SecurityData>('/admin/platform/security');
      setData(res);
    } catch {
      setError('Failed to load security data');
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Shield className="h-6 w-6 text-brand-600" />
            Security Center
          </h1>
          <p className="mt-1 text-sm text-ink-500">Monitor security events, access control, and system alerts</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
          <RefreshCcw className={`mr-1.5 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div role="alert" className="mb-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData(true)}>
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {loading && !data && (
        <div role="status" aria-busy="true" className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      )}

      {data && (
        <>
          {data.securityAlerts.length > 0 && (
            <div className="mb-6">
              <h2 className="font-display text-lg font-semibold text-ink-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Security Alerts
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.securityAlerts.map((alert, i) => (
                  <AlertCard key={i} {...alert} />
                ))}
              </div>
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<LogIn className="h-6 w-6" />}
              label="Failed Logins (24h)"
              value={data.failedLogins.last24h}
              variant={data.failedLogins.last24h > 10 ? 'red' : data.failedLogins.last24h > 0 ? 'amber' : 'neutral'}
              trend={{ value: data.failedLogins.last7d, label: 'in 7 days' }}
            />
            <StatCard
              icon={<Eye className="h-6 w-6" />}
              label="Suspicious Accounts"
              value={data.suspiciousAccounts}
              variant={data.suspiciousAccounts > 0 ? 'amber' : 'neutral'}
            />
            <StatCard
              icon={<Ban className="h-6 w-6" />}
              label="Blocked Users"
              value={data.blockedUsers.suspended + data.blockedUsers.banned}
            />
            <StatCard
              icon={<Activity className="h-6 w-6" />}
              label="Rate Limits Hit"
              value={data.rateLimitsHit}
              variant={data.rateLimitsHit > 0 ? 'amber' : 'neutral'}
            />
            <StatCard
              icon={<KeyRound className="h-6 w-6" />}
              label="Active Sessions"
              value={data.sessions.active}
            />
            <StatCard
              icon={<Users className="h-6 w-6" />}
              label="Role Changes (7d)"
              value={data.roleChanges}
              variant={data.roleChanges > 0 ? 'amber' : 'neutral'}
            />
            <StatCard
              icon={<Shield className="h-6 w-6" />}
              label="Admin Actions (7d)"
              value={data.adminActions}
            />
            <StatCard
              icon={<Clock className="h-6 w-6" />}
              label="Audit Activity (24h)"
              value={data.auditActivity.last24h}
            />
          </div>

          <h2 className="font-display text-lg font-semibold text-ink-900 mb-3">Access Control</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AccessCard icon={<LogIn className="h-5 w-5" />} title="Login Activity">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-500">Last 24 hours</span>
                  <span className={cn('text-sm font-semibold tabular-nums', data.failedLogins.last24h > 0 ? 'text-red-600' : 'text-ink-900')}>
                    {data.failedLogins.last24h} failed
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-500">Last 7 days</span>
                  <span className="text-sm font-semibold text-ink-900 tabular-nums">{data.failedLogins.last7d} failed</span>
                </div>
                <Progress value={Math.min((data.failedLogins.last24h / Math.max(data.failedLogins.last7d, 1)) * 100, 100)} className="h-2" />
              </div>
            </AccessCard>

            <AccessCard icon={<Ban className="h-5 w-5" />} title="User Restrictions">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-500">Suspended</span>
                  <span className={cn('text-sm font-semibold tabular-nums', data.blockedUsers.suspended > 0 ? 'text-amber-600' : 'text-ink-900')}>
                    {data.blockedUsers.suspended}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-500">Banned</span>
                  <span className={cn('text-sm font-semibold tabular-nums', data.blockedUsers.banned > 0 ? 'text-red-600' : 'text-ink-900')}>
                    {data.blockedUsers.banned}
                  </span>
                </div>
              </div>
            </AccessCard>

            <AccessCard icon={<KeyRound className="h-5 w-5" />} title="Session Management">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-500">Active</span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 tabular-nums">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {data.sessions.active}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-500">Expired</span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-500 tabular-nums">
                    <XCircle className="h-3.5 w-3.5" />
                    {data.sessions.expired}
                  </span>
                </div>
              </div>
            </AccessCard>
          </div>
        </>
      )}
    </div>
  );
}
