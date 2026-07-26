'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, Plus, RefreshCw, Copy, Users, Clock, CheckCircle, IndianRupee } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { cn, formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

type ReferralCode = {
  id: string;
  code: string;
  ownerId: string;
  ownerUsername: string;
  uses: number;
  maxUses: number;
  createdAt: string;
};

type Referral = {
  id: string;
  referrerId: string;
  referrerUsername: string;
  refereeId: string;
  refereeUsername: string;
  code: string;
  status: 'pending' | 'completed' | 'expired';
  reward: number;
  createdAt: string;
};

type Settings = {
  rewardAmountPaise: number;
  rewardPoints: number;
  maxReferralsPerUser: number;
  referralCodePrefix: string;
};

type Overview = {
  totalReferrals: number;
  pending: number;
  completed: number;
  totalRewardPaid: number;
};

const STORAGE_KEY = 'admin_referrals_data';

const DEFAULT_CODES: ReferralCode[] = [
  { id: 'refc_1', code: 'JOHN10', ownerId: 'u1', ownerUsername: 'john_doe', uses: 5, maxUses: 10, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'refc_2', code: 'SARA20', ownerId: 'u2', ownerUsername: 'sara_wilson', uses: 12, maxUses: 20, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'refc_3', code: 'MIKE5', ownerId: 'u3', ownerUsername: 'mike_davis', uses: 3, maxUses: 5, createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
];

const DEFAULT_REFERRALS: Referral[] = [
  { id: 'ref_1', referrerId: 'u1', referrerUsername: 'john_doe', refereeId: 'u4', refereeUsername: 'alice_j', code: 'JOHN10', status: 'completed', reward: 5000, createdAt: new Date(Date.now() - 25 * 86400000).toISOString() },
  { id: 'ref_2', referrerId: 'u2', referrerUsername: 'sara_wilson', refereeId: 'u5', refereeUsername: 'bob_k', code: 'SARA20', status: 'completed', reward: 5000, createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: 'ref_3', referrerId: 'u1', referrerUsername: 'john_doe', refereeId: 'u6', refereeUsername: 'charlie_m', code: 'JOHN10', status: 'pending', reward: 0, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'ref_4', referrerId: 'u3', referrerUsername: 'mike_davis', refereeId: 'u7', refereeUsername: 'diana_p', code: 'MIKE5', status: 'expired', reward: 0, createdAt: new Date(Date.now() - 40 * 86400000).toISOString() },
];

const DEFAULT_SETTINGS: Settings = {
  rewardAmountPaise: 5000,
  rewardPoints: 100,
  maxReferralsPerUser: 10,
  referralCodePrefix: 'REF',
};

function loadData() {
  if (typeof window === 'undefined') {
    return { codes: DEFAULT_CODES, referrals: DEFAULT_REFERRALS, settings: DEFAULT_SETTINGS };
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* ignore */ }
  }
  return { codes: DEFAULT_CODES, referrals: DEFAULT_REFERRALS, settings: DEFAULT_SETTINGS };
}

function saveData(data: { codes: ReferralCode[]; referrals: Referral[]; settings: Settings }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-ink-100 text-ink-500',
};

export default function AdminReferralsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ userId: '', customCode: '' });
  const [saving, setSaving] = useState(false);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    const data = loadData();
    setCodes(data.codes);
    setReferrals(data.referrals);
    setSettings(data.settings);
    setLoading(false);
  }, [user, router]);

  const persist = useCallback((c: ReferralCode[], r: Referral[], s: Settings) => {
    saveData({ codes: c, referrals: r, settings: s });
  }, []);

  function handleSaveSettings() {
    persist(codes, referrals, settings);
  }

  function handleCreateCode() {
    if (!createForm.userId.trim()) return;
    setSaving(true);
    const codeStr = createForm.customCode.trim()
      ? createForm.customCode.trim().toUpperCase()
      : `${settings.referralCodePrefix}${createForm.userId.trim().toUpperCase()}`;
    const newCode: ReferralCode = {
      id: generateId(),
      code: codeStr,
      ownerId: createForm.userId.trim(),
      ownerUsername: `user_${createForm.userId.trim()}`,
      uses: 0,
      maxUses: settings.maxReferralsPerUser,
      createdAt: new Date().toISOString(),
    };
    const updated = [...codes, newCode];
    setCodes(updated);
    persist(updated, referrals, settings);
    setCreateForm({ userId: '', customCode: '' });
    setCreateDialogOpen(false);
    setSaving(false);
  }

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const overview: Overview = {
    totalReferrals: referrals.length,
    pending: referrals.filter((r) => r.status === 'pending').length,
    completed: referrals.filter((r) => r.status === 'completed').length,
    totalRewardPaid: referrals.filter((r) => r.status === 'completed').reduce((sum, r) => sum + r.reward, 0),
  };

  const statsCards = [
    { label: 'Total Referrals', value: overview.totalReferrals.toString(), icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Pending', value: overview.pending.toString(), icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'Completed', value: overview.completed.toString(), icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Total Reward Paid', value: formatINR(overview.totalRewardPaid), icon: IndianRupee, color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Share2 className="h-6 w-6 text-brand-600" />
            Referral Program Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">Manage referral codes, track referrals, and configure program settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="brand" size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Create Referral Code
          </Button>
          <Button variant="outline" size="sm" onClick={() => { const d = loadData(); setCodes(d.codes); setReferrals(d.referrals); setSettings(d.settings); }}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink-500">{stat.label}</p>
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', stat.color)}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 font-display text-2xl font-semibold text-ink-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
        <div className="border-b border-ink-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-brand-600" />
            <h2 className="font-display text-lg font-semibold text-ink-900">Referral Codes</h2>
          </div>
        </div>
        {codes.length === 0 ? (
          <div className="py-12 text-center">
            <Share2 className="mx-auto h-10 w-10 text-ink-300" />
            <p className="mt-3 text-sm text-ink-500">No referral codes yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Uses</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Max Uses</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {codes.map((rc) => (
                  <tr key={rc.id} className="hover:bg-ink-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-ink-900">{rc.code}</span>
                        <button
                          onClick={() => handleCopyCode(rc.code)}
                          className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                          title="Copy code"
                        >
                          {copiedCode === rc.code ? (
                            <span className="text-xs text-emerald-600 font-medium">Copied!</span>
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{rc.ownerUsername}</td>
                    <td className="px-4 py-3 font-mono text-ink-700">{rc.uses}</td>
                    <td className="px-4 py-3 font-mono text-ink-600">{rc.maxUses}</td>
                    <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap">
                      {new Date(rc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={rc.uses >= rc.maxUses ? 'default' : 'outline'}>
                        {rc.uses >= rc.maxUses ? 'Exhausted' : 'Active'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
        <div className="border-b border-ink-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-600" />
            <h2 className="font-display text-lg font-semibold text-ink-900">Referrals</h2>
          </div>
        </div>
        {referrals.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto h-10 w-10 text-ink-300" />
            <p className="mt-3 text-sm text-ink-500">No referrals yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Referrer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Referee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Reward</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-ink-50/50 transition">
                    <td className="px-4 py-3 font-medium text-ink-900">{ref.referrerUsername}</td>
                    <td className="px-4 py-3 text-ink-700">{ref.refereeUsername}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-600">{ref.code}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_STYLES[ref.status])}>
                        {ref.status.charAt(0).toUpperCase() + ref.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-700">{ref.reward > 0 ? formatINR(ref.reward) : '-'}</td>
                    <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap">
                      {new Date(ref.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
        <div className="border-b border-ink-100 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink-900">Settings</h2>
          <p className="mt-0.5 text-sm text-ink-500">Configure referral program rewards and limits</p>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Reward Amount (paise)</label>
            <Input type="number" min="0" value={settings.rewardAmountPaise} onChange={(e) => setSettings({ ...settings, rewardAmountPaise: parseInt(e.target.value) || 0 })} />
            <p className="mt-1 text-xs text-ink-400">Monetary reward for successful referrals ({formatINR(settings.rewardAmountPaise)})</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Reward Points</label>
            <Input type="number" min="0" value={settings.rewardPoints} onChange={(e) => setSettings({ ...settings, rewardPoints: parseInt(e.target.value) || 0 })} />
            <p className="mt-1 text-xs text-ink-400">Loyalty points awarded for successful referrals</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Max Referrals per User</label>
            <Input type="number" min="1" value={settings.maxReferralsPerUser} onChange={(e) => setSettings({ ...settings, maxReferralsPerUser: parseInt(e.target.value) || 1 })} />
            <p className="mt-1 text-xs text-ink-400">Maximum number of referrals allowed per user</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Referral Code Prefix</label>
            <Input value={settings.referralCodePrefix} onChange={(e) => setSettings({ ...settings, referralCodePrefix: e.target.value.toUpperCase() })} placeholder="REF" />
            <p className="mt-1 text-xs text-ink-400">Prefix used when auto-generating referral codes</p>
          </div>
        </div>
        <div className="border-t border-ink-100 px-6 py-4 flex justify-end">
          <Button variant="brand" size="sm" onClick={handleSaveSettings}>Save Settings</Button>
        </div>
      </div>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogHeader>Create Referral Code</DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">User ID</label>
            <Input value={createForm.userId} onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })} placeholder="Enter user ID" />
            <p className="mt-1 text-xs text-ink-400">The ID of the user who will own this referral code</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Custom Code <span className="text-ink-400 font-normal">(optional)</span></label>
            <Input value={createForm.customCode} onChange={(e) => setCreateForm({ ...createForm, customCode: e.target.value.toUpperCase() })} placeholder="e.g. SUMMER2024" />
            <p className="mt-1 text-xs text-ink-400">Leave empty to auto-generate using the prefix + user ID</p>
          </div>
          {createForm.userId.trim() && (
            <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
              <p className="text-xs font-medium text-brand-800">Preview: <span className="font-mono">{createForm.customCode.trim() || `${settings.referralCodePrefix}${createForm.userId.trim().toUpperCase()}`}</span></p>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="brand" size="sm" onClick={handleCreateCode} disabled={saving || !createForm.userId.trim()}>
            {saving ? 'Creating...' : 'Create Code'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
