'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw,
  Save,
  Users,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';

type Role = {
  name: string;
  description: string;
  permissions: string[];
};

type Permission = {
  key: string;
  label: string;
  group: string;
};

const GROUP_ICONS: Record<string, string> = {
  Users: '👤', Products: '📦', Orders: '🛒', Payments: '💳',
  Refunds: '↩️', Reports: '📊', Disputes: '⚖️', Sellers: '🏪',
  Analytics: '📈', CMS: '📝', Coupons: '🏷️', Wallet: '👛',
  Support: '🎫', Settings: '⚙️', 'Feature Flags': '🚩', Audit: '📋', Fraud: '🛡️',
};

export default function AdminRolesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [rolePerms, setRolePerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, p] = await Promise.all([
        apiClient.get<Role[]>('/admin/roles'),
        apiClient.get<Permission[]>('/admin/permissions'),
      ]);
      setRoles(r);
      setPermissions(p);
    } catch {
      setError('Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) { router.push('/'); return; }
    fetchData();
  }, [user, router, fetchData]);

  const openCreate = () => {
    setRoleName('');
    setRoleDesc('');
    setRolePerms(new Set());
    setEditingRole(null);
    setShowCreateDialog(true);
  };

  const openEdit = (role: Role) => {
    setRoleName(role.name);
    setRoleDesc(role.description);
    setRolePerms(new Set(role.permissions));
    setEditingRole(role.name);
    setShowCreateDialog(true);
  };

  const saveRole = async () => {
    if (!roleName.trim()) return;
    setSaving(true);
    try {
      if (editingRole) {
        await apiClient.patch(`/admin/roles/${editingRole}`, { name: roleName, description: roleDesc, permissions: Array.from(rolePerms) });
      } else {
        await apiClient.post('/admin/roles', { name: roleName, description: roleDesc, permissions: Array.from(rolePerms) });
      }
      setShowCreateDialog(false);
      await fetchData();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const deleteRole = async (name: string) => {
    try {
      await apiClient.delete(`/admin/roles/${name}`);
      await fetchData();
    } catch { /* ignore */ }
  };

  const togglePerm = (key: string) => {
    setRolePerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const groups = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {});

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-3xl border border-dashed border-red-200 py-24 text-center">
          <Shield className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            Role Management
          </h1>
          <p className="mt-1 text-sm text-ink-500">Define roles and their permissions across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="mr-1.5 h-4 w-4" />Refresh</Button>
          {isSuperAdmin && <Button variant="brand" size="sm" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" />Create Role</Button>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const permCount = role.permissions.length;
          const isAll = role.permissions.includes('*');
          return (
            <div key={role.name} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink-900">{role.name.replace(/_/g, ' ')}</h3>
                  <p className="text-xs text-ink-400 mt-0.5">{role.description}</p>
                </div>
                <Badge variant={role.name === 'SUPER_ADMIN' ? 'brand' : role.name === 'ADMIN' ? 'success' : 'outline'}>
                  {role.name}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {isAll ? (
                  <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">All permissions</span>
                ) : permCount === 0 ? (
                  <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs text-ink-400">No permissions</span>
                ) : (
                  role.permissions.slice(0, 5).map((p) => (
                    <span key={p} className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600">{p}</span>
                  ))
                )}
                {permCount > 5 && <span className="text-xs text-ink-400">+{permCount - 5} more</span>}
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-ink-100">
                {isSuperAdmin && role.name !== 'SUPER_ADMIN' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => openEdit(role)}><Shield className="mr-1 h-3 w-3" /> Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteRole(role.name)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)}>
        <DialogHeader>{editingRole ? 'Edit Role' : 'Create Role'}</DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Role Name</label>
              <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g. CONTENT_MANAGER" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Description</label>
              <Textarea value={roleDesc} onChange={(e) => setRoleDesc(e.target.value)} placeholder="Describe this role..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">Permissions</label>
              <div className="max-h-80 overflow-y-auto space-y-2 rounded-xl border border-ink-100 p-3">
                {Object.entries(groups).map(([group, perms]) => (
                  <div key={group}>
                    <button
                      onClick={() => setExpandedGroup(expandedGroup === group ? null : group)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
                    >
                      <span>{GROUP_ICONS[group] || '📌'}</span>
                      <span className="flex-1 text-left">{group}</span>
                      <span className="text-xs text-ink-400">{perms.filter(p => rolePerms.has(p.key)).length}/{perms.length}</span>
                      {expandedGroup === group ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    {expandedGroup === group && (
                      <div className="ml-6 space-y-1">
                        {perms.map((perm) => (
                          <label key={perm.key} className={cn('flex items-center gap-2 rounded-lg px-3 py-1.5 cursor-pointer text-sm transition', rolePerms.has(perm.key) ? 'bg-brand-50 text-brand-700' : 'hover:bg-ink-50')}>
                            <input type="checkbox" checked={rolePerms.has(perm.key)} onChange={() => togglePerm(perm.key)} className="accent-brand-600" />
                            <span>{perm.label}</span>
                            <span className="text-xs text-ink-400 ml-auto">{perm.key}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button variant="brand" onClick={saveRole} disabled={!roleName.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {editingRole ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
