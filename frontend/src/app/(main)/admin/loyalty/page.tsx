'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Plus, RefreshCw, Pencil, Trash2, Star, Users, Award, TrendingUp, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

type LoyaltyLevel = {
  id: string;
  name: string;
  minPoints: number;
  benefits: string;
  color: string;
};

type Reward = {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  stock: number;
  isActive: boolean;
  imageUrl: string;
  createdAt: string;
};

type Settings = {
  pointsPerRupee: number;
  signupBonusPoints: number;
  referralBonusPoints: number;
  birthdayBonusPoints: number;
};

type Overview = {
  totalMembers: number;
  totalPointsIssued: number;
  avgPointsPerMember: number;
  activeToday: number;
};

const STORAGE_KEY = 'admin_loyalty_data';

const DEFAULT_LEVELS: LoyaltyLevel[] = [
  { id: 'lvl_1', name: 'Bronze', minPoints: 0, benefits: 'Basic rewards', color: '#CD7F32' },
  { id: 'lvl_2', name: 'Silver', minPoints: 500, benefits: 'Standard rewards, 5% bonus points', color: '#C0C0C0' },
  { id: 'lvl_3', name: 'Gold', minPoints: 2000, benefits: 'Premium rewards, 10% bonus points, priority support', color: '#FFD700' },
  { id: 'lvl_4', name: 'Platinum', minPoints: 5000, benefits: 'VIP rewards, 15% bonus points, dedicated support', color: '#E5E4E2' },
  { id: 'lvl_5', name: 'Diamond', minPoints: 10000, benefits: 'Exclusive rewards, 25% bonus points, concierge service', color: '#B9F2FF' },
];

const DEFAULT_REWARDS: Reward[] = [
  { id: 'rew_1', name: '₹100 Off Coupon', description: 'Get ₹100 off on your next purchase', pointsRequired: 1000, stock: 100, isActive: true, imageUrl: '', createdAt: new Date().toISOString() },
  { id: 'rew_2', name: 'Free Shipping', description: 'Complimentary shipping on any order', pointsRequired: 500, stock: 200, isActive: true, imageUrl: '', createdAt: new Date().toISOString() },
  { id: 'rew_3', name: 'Branded Tote Bag', description: 'Exclusive branded tote bag', pointsRequired: 2500, stock: 50, isActive: true, imageUrl: '', createdAt: new Date().toISOString() },
];

const DEFAULT_SETTINGS: Settings = {
  pointsPerRupee: 1,
  signupBonusPoints: 200,
  referralBonusPoints: 100,
  birthdayBonusPoints: 500,
};

function loadData() {
  if (typeof window === 'undefined') {
    return { levels: DEFAULT_LEVELS, rewards: DEFAULT_REWARDS, settings: DEFAULT_SETTINGS };
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* ignore */ }
  }
  return { levels: DEFAULT_LEVELS, rewards: DEFAULT_REWARDS, settings: DEFAULT_SETTINGS };
}

function saveData(data: { levels: LoyaltyLevel[]; rewards: Reward[]; settings: Settings }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const LEVEL_COLORS: Record<string, string> = {
  '#CD7F32': 'bg-amber-700',
  '#C0C0C0': 'bg-gray-400',
  '#FFD700': 'bg-yellow-500',
  '#E5E4E2': 'bg-gray-200',
  '#B9F2FF': 'bg-cyan-200',
};

export default function AdminLoyaltyPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [levels, setLevels] = useState<LoyaltyLevel[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<LoyaltyLevel | null>(null);
  const [levelForm, setLevelForm] = useState({ name: '', minPoints: '', benefits: '', color: '#CD7F32' });

  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rewardForm, setRewardForm] = useState({ name: '', description: '', pointsRequired: '', stock: '', isActive: true, imageUrl: '' });

  const [deleteRewardId, setDeleteRewardId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [overview] = useState<Overview>({
    totalMembers: 1248,
    totalPointsIssued: 892500,
    avgPointsPerMember: 715,
    activeToday: 47,
  });

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    const data = loadData();
    setLevels(data.levels);
    setRewards(data.rewards);
    setSettings(data.settings);
    setLoading(false);
  }, [user, router]);

  const persist = useCallback((ls: LoyaltyLevel[], rw: Reward[], st: Settings) => {
    saveData({ levels: ls, rewards: rw, settings: st });
  }, []);

  function openCreateLevel() {
    setEditingLevel(null);
    setLevelForm({ name: '', minPoints: '', benefits: '', color: '#CD7F32' });
    setLevelDialogOpen(true);
  }

  function openEditLevel(level: LoyaltyLevel) {
    setEditingLevel(level);
    setLevelForm({ name: level.name, minPoints: String(level.minPoints), benefits: level.benefits, color: level.color });
    setLevelDialogOpen(true);
  }

  function handleSaveLevel() {
    if (!levelForm.name.trim() || !levelForm.minPoints) return;
    const newLevel: LoyaltyLevel = {
      id: editingLevel?.id || generateId(),
      name: levelForm.name.trim(),
      minPoints: parseInt(levelForm.minPoints),
      benefits: levelForm.benefits.trim(),
      color: levelForm.color,
    };
    let updated: LoyaltyLevel[];
    if (editingLevel) {
      updated = levels.map((l) => (l.id === editingLevel.id ? newLevel : l));
    } else {
      updated = [...levels, newLevel];
    }
    updated.sort((a, b) => a.minPoints - b.minPoints);
    setLevels(updated);
    persist(updated, rewards, settings);
    setLevelDialogOpen(false);
  }

  function handleSaveSettings() {
    persist(levels, rewards, { ...settings });
  }

  function openCreateReward() {
    setEditingReward(null);
    setRewardForm({ name: '', description: '', pointsRequired: '', stock: '', isActive: true, imageUrl: '' });
    setRewardDialogOpen(true);
  }

  function openEditReward(reward: Reward) {
    setEditingReward(reward);
    setRewardForm({
      name: reward.name,
      description: reward.description,
      pointsRequired: String(reward.pointsRequired),
      stock: String(reward.stock),
      isActive: reward.isActive,
      imageUrl: reward.imageUrl,
    });
    setRewardDialogOpen(true);
  }

  function handleSaveReward() {
    if (!rewardForm.name.trim() || !rewardForm.pointsRequired) return;
    const newReward: Reward = {
      id: editingReward?.id || generateId(),
      name: rewardForm.name.trim(),
      description: rewardForm.description.trim(),
      pointsRequired: parseInt(rewardForm.pointsRequired),
      stock: rewardForm.stock ? parseInt(rewardForm.stock) : 0,
      isActive: rewardForm.isActive,
      imageUrl: rewardForm.imageUrl.trim(),
      createdAt: editingReward?.createdAt || new Date().toISOString(),
    };
    let updated: Reward[];
    if (editingReward) {
      updated = rewards.map((r) => (r.id === editingReward.id ? newReward : r));
    } else {
      updated = [...rewards, newReward];
    }
    setRewards(updated);
    persist(levels, updated, settings);
    setRewardDialogOpen(false);
  }

  async function handleDeleteReward() {
    if (!deleteRewardId) return;
    setSaving(true);
    const updated = rewards.filter((r) => r.id !== deleteRewardId);
    setRewards(updated);
    persist(levels, updated, settings);
    setDeleteRewardId(null);
    setSaving(false);
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

  const statsCards = [
    { label: 'Total Members', value: overview.totalMembers.toLocaleString('en-IN'), icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Points Issued', value: overview.totalPointsIssued.toLocaleString('en-IN'), icon: Award, color: 'text-amber-600 bg-amber-50' },
    { label: 'Avg Points / Member', value: overview.avgPointsPerMember.toLocaleString('en-IN'), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Active Today', value: overview.activeToday.toLocaleString('en-IN'), icon: Zap, color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Gift className="h-6 w-6 text-brand-600" />
            Loyalty Program Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">Manage loyalty levels, rewards catalog, and program settings</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { const d = loadData(); setLevels(d.levels); setRewards(d.rewards); setSettings(d.settings); }}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
        </Button>
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
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-brand-600" />
            <h2 className="font-display text-lg font-semibold text-ink-900">Levels Configuration</h2>
          </div>
          <Button variant="brand" size="sm" onClick={openCreateLevel}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Level
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Min Points</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Benefits</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Color</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {levels.map((level) => (
                <tr key={level.id} className="hover:bg-ink-50/50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: level.color }}>
                        {level.name.slice(0, 1)}
                      </span>
                      <span className="font-semibold text-ink-900">{level.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-ink-700">{level.minPoints.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-ink-600 max-w-xs truncate">{level.benefits}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 rounded-full border border-ink-200" style={{ backgroundColor: level.color }} />
                      <span className="font-mono text-xs text-ink-400">{level.color}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEditLevel(level)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Pencil className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-brand-600" />
            <h2 className="font-display text-lg font-semibold text-ink-900">Rewards Catalog</h2>
          </div>
          <Button variant="brand" size="sm" onClick={openCreateReward}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Reward
          </Button>
        </div>
        {rewards.length === 0 ? (
          <div className="py-12 text-center">
            <Gift className="mx-auto h-10 w-10 text-ink-300" />
            <p className="mt-3 text-sm text-ink-500">No rewards yet. Add your first reward.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Points Required</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rewards.map((reward) => (
                  <tr key={reward.id} className="hover:bg-ink-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {reward.imageUrl ? (
                          <img src={reward.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-400"><Gift className="h-4 w-4" /></div>
                        )}
                        <div>
                          <p className="font-medium text-ink-900">{reward.name}</p>
                          <p className="text-xs text-ink-400 truncate max-w-[200px]">{reward.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-700">{reward.pointsRequired.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-ink-600">{reward.stock}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', reward.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-100 text-ink-500')}>
                        {reward.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditReward(reward)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteRewardId(reward.id)} className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
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
          <p className="mt-0.5 text-sm text-ink-500">Configure loyalty points earning and bonus rules</p>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Points per Rupee</label>
            <Input type="number" min="0" step="0.1" value={settings.pointsPerRupee} onChange={(e) => setSettings({ ...settings, pointsPerRupee: parseFloat(e.target.value) || 0 })} />
            <p className="mt-1 text-xs text-ink-400">Points earned for every ₹1 spent</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Signup Bonus Points</label>
            <Input type="number" min="0" value={settings.signupBonusPoints} onChange={(e) => setSettings({ ...settings, signupBonusPoints: parseInt(e.target.value) || 0 })} />
            <p className="mt-1 text-xs text-ink-400">Points awarded on new user registration</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Referral Bonus Points</label>
            <Input type="number" min="0" value={settings.referralBonusPoints} onChange={(e) => setSettings({ ...settings, referralBonusPoints: parseInt(e.target.value) || 0 })} />
            <p className="mt-1 text-xs text-ink-400">Points awarded for successful referrals</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Birthday Bonus Points</label>
            <Input type="number" min="0" value={settings.birthdayBonusPoints} onChange={(e) => setSettings({ ...settings, birthdayBonusPoints: parseInt(e.target.value) || 0 })} />
            <p className="mt-1 text-xs text-ink-400">Points awarded on user&apos;s birthday</p>
          </div>
        </div>
        <div className="border-t border-ink-100 px-6 py-4 flex justify-end">
          <Button variant="brand" size="sm" onClick={handleSaveSettings}>Save Settings</Button>
        </div>
      </div>

      <Dialog open={levelDialogOpen} onClose={() => setLevelDialogOpen(false)}>
        <DialogHeader>{editingLevel ? 'Edit Level' : 'Add Level'}</DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Level Name</label>
            <Input value={levelForm.name} onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })} placeholder="e.g. Gold" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Minimum Points</label>
            <Input type="number" min="0" value={levelForm.minPoints} onChange={(e) => setLevelForm({ ...levelForm, minPoints: e.target.value })} placeholder="0" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Benefits</label>
            <Textarea value={levelForm.benefits} onChange={(e) => setLevelForm({ ...levelForm, benefits: e.target.value })} placeholder="Describe the benefits of this level" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={levelForm.color} onChange={(e) => setLevelForm({ ...levelForm, color: e.target.value })} className="h-9 w-9 cursor-pointer rounded-lg border border-ink-200 p-0.5" />
              <Input value={levelForm.color} onChange={(e) => setLevelForm({ ...levelForm, color: e.target.value })} placeholder="#000000" className="font-mono" />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setLevelDialogOpen(false)}>Cancel</Button>
          <Button variant="brand" size="sm" onClick={handleSaveLevel} disabled={!levelForm.name.trim() || !levelForm.minPoints}>
            {editingLevel ? 'Save' : 'Add Level'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={rewardDialogOpen} onClose={() => setRewardDialogOpen(false)}>
        <DialogHeader>{editingReward ? 'Edit Reward' : 'Add Reward'}</DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Reward Name</label>
            <Input value={rewardForm.name} onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })} placeholder="e.g. ₹100 Off Coupon" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Description</label>
            <Textarea value={rewardForm.description} onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })} placeholder="Describe the reward" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Points Required</label>
              <Input type="number" min="0" value={rewardForm.pointsRequired} onChange={(e) => setRewardForm({ ...rewardForm, pointsRequired: e.target.value })} placeholder="1000" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Stock</label>
              <Input type="number" min="0" value={rewardForm.stock} onChange={(e) => setRewardForm({ ...rewardForm, stock: e.target.value })} placeholder="100" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Image URL <span className="text-ink-400 font-normal">(optional)</span></label>
            <Input value={rewardForm.imageUrl} onChange={(e) => setRewardForm({ ...rewardForm, imageUrl: e.target.value })} placeholder="https://example.com/image.png" />
            {rewardForm.imageUrl && (
              <div className="mt-2 flex h-14 w-14 items-center justify-center rounded-lg border border-ink-200 bg-ink-50 p-1">
                <img src={rewardForm.imageUrl} alt="" className="max-h-full max-w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink-900">Active</p>
              <p className="text-xs text-ink-500">Reward will be available for redemption</p>
            </div>
            <button
              type="button"
              className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', rewardForm.isActive ? 'bg-emerald-500' : 'bg-ink-200')}
              onClick={() => setRewardForm({ ...rewardForm, isActive: !rewardForm.isActive })}
              role="switch"
              aria-checked={rewardForm.isActive}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform', rewardForm.isActive ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setRewardDialogOpen(false)}>Cancel</Button>
          <Button variant="brand" size="sm" onClick={handleSaveReward} disabled={!rewardForm.name.trim() || !rewardForm.pointsRequired}>
            {editingReward ? 'Save' : 'Add Reward'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!deleteRewardId} onClose={() => { if (!saving) setDeleteRewardId(null); }}>
        <DialogHeader>Delete Reward</DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-600">Are you sure you want to delete this reward? This action cannot be undone.</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setDeleteRewardId(null)} disabled={saving}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={handleDeleteReward} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
