'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Settings, Save, RefreshCcw, Plus, Trash2, Edit,
  CheckCircle, XCircle, Sliders, ToggleLeft, Type, Hash,
  Globe, Clock, DollarSign,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type SettingData = {
  id: string;
  key: string;
  value: any;
  type: string;
  group: string;
  label: string | null;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

type ToastState = { message: string; visible: boolean; error?: boolean };

function Toast({ toast }: { toast: ToastState }) {
  if (!toast.visible) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-up" role="alert">
      <div className={cn(
        'flex items-center gap-2.5 rounded-2xl border px-5 py-3 shadow-lift',
        toast.error ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50',
      )}>
        {toast.error
          ? <XCircle className="h-5 w-5 text-red-600" />
          : <CheckCircle className="h-5 w-5 text-emerald-600" />
        }
        <span className={cn('text-sm font-medium', toast.error ? 'text-red-800' : 'text-emerald-800')}>
          {toast.message}
        </span>
      </div>
    </div>
  );
}

function showToast(setter: (t: ToastState) => void, message: string, error = false) {
  setter({ message, visible: true, error });
  setTimeout(() => setter({ message: '', visible: false }), 3500);
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
  general: <Globe className="h-5 w-5" />,
  system: <Sliders className="h-5 w-5" />,
  commerce: <DollarSign className="h-5 w-5" />,
};

function groupIcon(group: string) {
  return GROUP_ICONS[group] || <Settings className="h-5 w-5" />;
}

function SettingInput({
  setting,
  value,
  onChange,
}: {
  setting: SettingData;
  value: any;
  onChange: (v: any) => void;
}) {
  if (setting.type === 'boolean') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={setting.label || setting.key}
        onClick={() => onChange(!value)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          value ? 'bg-brand-600' : 'bg-ink-200',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform',
            value ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    );
  }

  if (setting.type === 'number') {
    return (
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="h-9 w-32"
      />
    );
  }

  if (setting.type === 'json') {
    return (
      <textarea
        value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            onChange(e.target.value);
          }
        }}
        rows={4}
        className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm font-mono text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    );
  }

  return (
    <Input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 max-w-md"
    />
  );
}

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<SettingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Record<string, any>>({});
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<SettingData[]>('/admin/platform/settings');
      setSettings(res);
      setDirty({});
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (setting: SettingData, value: any) => {
    setDirty((prev) => ({ ...prev, [setting.key]: value }));
  };

  const currentValue = (setting: SettingData) =>
    setting.key in dirty ? dirty[setting.key] : setting.value;

  const hasChanges = Object.keys(dirty).length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(dirty).map(([key, value]) => ({ key, value }));
      await apiClient.patch('/admin/platform/settings', { settings: payload });
      showToast(setToast, 'Settings saved successfully');
      setSettings((prev) =>
        prev.map((s) =>
          s.key in dirty ? { ...s, value: dirty[s.key] } : s,
        ),
      );
      setDirty({});
    } catch {
      showToast(setToast, 'Failed to save settings', true);
    } finally {
      setSaving(false);
    }
  };

  const grouped = settings.reduce<Record<string, SettingData[]>>((acc, s) => {
    const g = s.group || 'other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(s);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped).sort();

  if (loading && settings.length === 0) {
    return (
      <div className="p-6 lg:p-8" role="status" aria-busy="true">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-ink-100 p-6">
              <Skeleton className="mb-4 h-6 w-32" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j}>
                    <Skeleton className="mb-1 h-4 w-40" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="mt-2 h-9 w-full max-w-md" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-3xl border border-dashed border-red-200 py-24 text-center" role="alert">
          <XCircle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchSettings}>
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <Toast toast={toast} />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Settings className="h-6 w-6 text-brand-600" />
            System Settings
          </h1>
          <p className="mt-1 text-sm text-ink-500">Manage application-wide configuration</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading}>
            <RefreshCcw className={cn('mr-1.5 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            <Save className={cn('mr-1.5 h-4 w-4', saving && 'animate-spin')} />
            {saving ? 'Saving...' : 'Save Changes'}
            {hasChanges && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-white/20 px-1.5 py-0 text-[10px] font-semibold">
                {Object.keys(dirty).length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {settings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Settings className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No settings found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupKeys.map((group) => (
            <div
              key={group}
              className="rounded-2xl border border-ink-100 bg-white shadow-soft"
            >
              <div className="flex items-center gap-3 border-b border-ink-100 px-6 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  {groupIcon(group)}
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold text-ink-900 capitalize">
                    {group}
                  </h2>
                  <p className="text-xs text-ink-500 capitalize">
                    {grouped[group].length} setting{grouped[group].length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="divide-y divide-ink-50">
                {grouped[group].map((setting) => (
                  <div key={setting.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ink-900">
                            {setting.label || setting.key}
                          </span>
                          {setting.key in dirty && (
                            <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">
                              <Edit className="mr-1 h-3 w-3" />
                              Modified
                            </Badge>
                          )}
                        </div>
                        {setting.description && (
                          <p className="mt-0.5 text-xs text-ink-500">{setting.description}</p>
                        )}
                        <p className="mt-0.5 font-mono text-[10px] text-ink-400">{setting.key}</p>
                      </div>
                      <div className="shrink-0">
                        <SettingInput
                          setting={setting}
                          value={currentValue(setting)}
                          onChange={(v) => handleChange(setting, v)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
