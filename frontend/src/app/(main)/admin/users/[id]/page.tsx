'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  UserX,
  UserCheck,
  Trash2,
  Package,
  ShoppingCart,
  Star,
  Users,
  Clock,
  FileText,
  Loader2,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/tabs';

type UserDetail = {
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  _count?: {
    orders?: number;
    products?: number;
    followers?: number;
    following?: number;
    reviews?: number;
  };
  sellerProfile?: {
    id: string;
    storeName: string;
    isVerified: boolean;
    rating?: number;
    totalSales?: number;
  };
  recentOrders?: Array<{
    id: string;
    orderNumber: string;
    totalPaise: number;
    status: string;
    createdAt: string;
  }>;
  recentProducts?: Array<{
    id: string;
    title: string;
    pricePaise: number;
    status: string;
    createdAt: string;
    thumbnailUrl?: string;
  }>;
  recentReviews?: Array<{
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
    product?: { title: string };
  }>;
  loginHistory?: Array<{
    ip: string;
    userAgent: string;
    createdAt: string;
  }>;
  auditLogs?: Array<{
    id: string;
    action: string;
    details?: string;
    createdAt: string;
    admin?: { displayName?: string; username: string };
  }>;
};

const ROLE_BADGE: Record<string, 'default' | 'brand' | 'outline' | 'success'> = {
  BUYER: 'default',
  SELLER: 'brand',
  ADMIN: 'success',
  MODERATOR: 'outline',
  SUPER_ADMIN: 'success',
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  DELETED: 'bg-ink-100 text-ink-600',
};

const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-ink-100 text-ink-600',
};

const PRODUCT_STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PENDING_REVIEW: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-800',
  HIDDEN: 'bg-ink-100 text-ink-600',
  SOLD: 'bg-brand-100 text-brand-800',
};

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const currentUser = useAuthStore((s) => s.user);

  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const [actionLoading, setActionLoading] = useState('');
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newRole, setNewRole] = useState('');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showForceLogoutDialog, setShowForceLogoutDialog] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<UserDetail>(`/admin/users/${userId}`);
      setUserDetail(res);
    } catch {
      setError('Failed to load user details.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!currentUser || !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      router.push('/');
      return;
    }
    fetchUser();
  }, [currentUser, router, fetchUser]);

  const updateStatus = async () => {
    if (!newStatus) return;
    setActionLoading('status');
    try {
      await apiClient.patch(`/admin/users/${userId}/status`, { status: newStatus });
      setShowStatusDialog(false);
      await fetchUser();
    } catch { /* ignore */ } finally { setActionLoading(''); }
  };

  const updateRole = async () => {
    if (!newRole) return;
    setActionLoading('role');
    try {
      await apiClient.patch(`/admin/users/${userId}/role`, { role: newRole });
      setShowRoleDialog(false);
      await fetchUser();
    } catch { /* ignore */ } finally { setActionLoading(''); }
  };

  const deleteUser = async () => {
    setActionLoading('delete');
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      router.push('/admin/users');
    } catch { /* ignore */ } finally { setActionLoading(''); }
  };

  const restoreUser = async () => {
    setActionLoading('restore');
    try {
      await apiClient.patch(`/admin/users/${userId}/restore`);
      setShowRestoreDialog(false);
      await fetchUser();
    } catch { /* ignore */ } finally { setActionLoading(''); }
  };

  const resetUserPassword = async () => {
    if (!resetPasswordValue) return;
    setActionLoading('reset-password');
    try {
      await apiClient.post(`/admin/users/${userId}/reset-password`, { newPassword: resetPasswordValue });
      setShowResetPasswordDialog(false);
      setResetPasswordValue('');
    } catch { /* ignore */ } finally { setActionLoading(''); }
  };

  const forceLogout = async () => {
    setActionLoading('force-logout');
    try {
      await apiClient.post(`/admin/users/${userId}/force-logout`);
      setShowForceLogoutDialog(false);
    } catch { /* ignore */ } finally { setActionLoading(''); }
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !userDetail) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">{error || 'User not found'}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/users')}>
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  const counts = userDetail._count || {};
  const stats = [
    { label: 'Orders', value: counts.orders || 0, icon: ShoppingCart },
    { label: 'Products', value: counts.products || 0, icon: Package },
    { label: 'Followers', value: counts.followers || 0, icon: Users },
    { label: 'Following', value: counts.following || 0, icon: Users },
    { label: 'Reviews', value: counts.reviews || 0, icon: Star },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/users')} className="mb-4">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Users
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-ink-100">
              {userDetail.avatarUrl ? (
                <img src={userDetail.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-ink-500">
                  {(userDetail.displayName || userDetail.username).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink-900">
                {userDetail.displayName || userDetail.username}
              </h1>
              <p className="text-sm text-ink-500">@{userDetail.username} &middot; {userDetail.email}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant={ROLE_BADGE[userDetail.role] || 'default'}>{userDetail.role}</Badge>
                <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[userDetail.status] || 'bg-ink-100 text-ink-600')}>
                  {userDetail.status.replace(/_/g, ' ')}
                </span>
                {userDetail.emailVerified && (
                  <Badge variant="success">Email Verified</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setNewStatus(userDetail.status); setShowStatusDialog(true); }}>
              <Shield className="mr-1.5 h-4 w-4" /> Change Status
            </Button>
            {isSuperAdmin && (
              <Button variant="outline" size="sm" onClick={() => { setNewRole(userDetail.role); setShowRoleDialog(true); }}>
                <Shield className="mr-1.5 h-4 w-4" /> Change Role
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
            {userDetail.status === 'DELETED' && (
              <Button variant="outline" size="sm" onClick={() => setShowRestoreDialog(true)}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> Restore
              </Button>
            )}
            {isSuperAdmin && (
              <Button variant="outline" size="sm" onClick={() => { setResetPasswordValue(''); setShowResetPasswordDialog(true); }}>
                <KeyRound className="mr-1.5 h-4 w-4" /> Reset Password
              </Button>
            )}
            {(isSuperAdmin || currentUser?.role === 'ADMIN') && (
              <Button variant="outline" size="sm" onClick={() => setShowForceLogoutDialog(true)}>
                <LogOut className="mr-1.5 h-4 w-4" /> Force Logout
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2 text-ink-400">
              <stat.icon className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-ink-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Profile Info */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <h3 className="mb-3 font-semibold text-ink-900">Profile Information</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Display Name</dt>
              <dd className="font-medium text-ink-900">{userDetail.displayName || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Username</dt>
              <dd className="font-medium text-ink-900">@{userDetail.username}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Email</dt>
              <dd className="font-medium text-ink-900">{userDetail.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Phone Verified</dt>
              <dd className="font-medium text-ink-900">{userDetail.phoneVerified ? 'Yes' : 'No'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Joined</dt>
              <dd className="font-medium text-ink-900">
                {new Date(userDetail.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Last Login</dt>
              <dd className="font-medium text-ink-900">
                {userDetail.lastLoginAt
                  ? new Date(userDetail.lastLoginAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>
        {userDetail.sellerProfile && (
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h3 className="mb-3 font-semibold text-ink-900">Seller Profile</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Store Name</dt>
                <dd className="font-medium text-ink-900">{userDetail.sellerProfile.storeName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Verified</dt>
                <dd>
                  <Badge variant={userDetail.sellerProfile.isVerified ? 'success' : 'outline'}>
                    {userDetail.sellerProfile.isVerified ? 'Verified' : 'Unverified'}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Rating</dt>
                <dd className="font-medium text-ink-900">{userDetail.sellerProfile.rating?.toFixed(1) || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Total Sales</dt>
                <dd className="font-medium text-ink-900">{userDetail.sellerProfile.totalSales || 0}</dd>
              </div>
            </dl>
            <div className="mt-3">
              <Link href={`/admin/sellers/${userDetail.sellerProfile.id}`}>
                <Button variant="outline" size="sm">
                  View Seller Profile <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-ink-100 bg-white shadow-soft">
        <div className="p-4">
          <Tabs value={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab value="orders">Recent Orders</Tab>
              <Tab value="products">Recent Products</Tab>
              <Tab value="reviews">Recent Reviews</Tab>
              <Tab value="login">Login History</Tab>
              <Tab value="audit">Audit Logs</Tab>
            </TabList>

            <TabPanel value="orders">
              {!userDetail.recentOrders?.length ? (
                <p className="py-8 text-center text-sm text-ink-400">No recent orders</p>
              ) : (
                <div className="space-y-2">
                  {userDetail.recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between rounded-xl border border-ink-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-ink-900">#{order.orderNumber}</p>
                        <p className="text-xs text-ink-400">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-ink-900">{formatINR(order.totalPaise)}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', ORDER_STATUS_STYLES[order.status] || 'bg-ink-100 text-ink-600')}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabPanel>

            <TabPanel value="products">
              {!userDetail.recentProducts?.length ? (
                <p className="py-8 text-center text-sm text-ink-400">No recent products</p>
              ) : (
                <div className="space-y-2">
                  {userDetail.recentProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-3 rounded-xl border border-ink-50 p-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                        {product.thumbnailUrl && (
                          <img src={product.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-900 truncate">{product.title}</p>
                        <p className="text-xs text-ink-400">
                          {new Date(product.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-ink-900">{formatINR(product.pricePaise)}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', PRODUCT_STATUS_STYLES[product.status] || 'bg-ink-100 text-ink-600')}>
                          {product.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabPanel>

            <TabPanel value="reviews">
              {!userDetail.recentReviews?.length ? (
                <p className="py-8 text-center text-sm text-ink-400">No recent reviews</p>
              ) : (
                <div className="space-y-2">
                  {userDetail.recentReviews.map((review) => (
                    <div key={review.id} className="rounded-xl border border-ink-50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn('h-3.5 w-3.5', i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-200')}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-ink-400">
                          {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {review.product && (
                        <p className="mt-1 text-xs text-ink-500">for {review.product.title}</p>
                      )}
                      {review.comment && (
                        <p className="mt-1 text-sm text-ink-700">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabPanel>

            <TabPanel value="login">
              {!userDetail.loginHistory?.length ? (
                <p className="py-8 text-center text-sm text-ink-400">No login history</p>
              ) : (
                <div className="space-y-2">
                  {userDetail.loginHistory.map((login, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-ink-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-ink-900 font-mono text-xs">{login.ip}</p>
                        <p className="mt-0.5 max-w-md truncate text-xs text-ink-400">{login.userAgent}</p>
                      </div>
                      <span className="text-xs text-ink-500">
                        {new Date(login.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabPanel>

            <TabPanel value="audit">
              {!userDetail.auditLogs?.length ? (
                <p className="py-8 text-center text-sm text-ink-400">No audit logs</p>
              ) : (
                <div className="space-y-2">
                  {userDetail.auditLogs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-ink-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-ink-900">{log.action}</p>
                        <span className="text-xs text-ink-400">
                          {new Date(log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {log.details && (
                        <p className="mt-1 text-xs text-ink-500">{log.details}</p>
                      )}
                      {log.admin && (
                        <p className="mt-1 text-xs text-ink-400">
                          by {log.admin.displayName || log.admin.username}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabPanel>
          </Tabs>
        </div>
      </div>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onClose={() => setShowStatusDialog(false)}>
        <DialogHeader>Change User Status</DialogHeader>
        <DialogBody>
          <p className="mb-4 text-sm text-ink-600">
            Update the account status for <strong>{userDetail.username}</strong>.
          </p>
          <div className="space-y-2">
            {['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'].map((status) => (
              <label key={status} className={cn('flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition', newStatus === status ? 'border-brand-400 bg-brand-50' : 'border-ink-200 hover:border-ink-300')}>
                <input type="radio" name="status" value={status} checked={newStatus === status} onChange={() => setNewStatus(status)} className="accent-brand-600" />
                <span className="text-sm font-medium text-ink-900">{status.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
          <Button variant="brand" onClick={updateStatus} disabled={actionLoading === 'status' || newStatus === userDetail.status}>
            {actionLoading === 'status' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Update Status
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onClose={() => setShowRoleDialog(false)}>
        <DialogHeader>Change User Role</DialogHeader>
        <DialogBody>
          <p className="mb-4 text-sm text-ink-600">
            Update the role for <strong>{userDetail.username}</strong>. This action is logged.
          </p>
          <div className="space-y-2">
            {['BUYER', 'SELLER', 'ADMIN', 'MODERATOR'].map((role) => (
              <label key={role} className={cn('flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition', newRole === role ? 'border-brand-400 bg-brand-50' : 'border-ink-200 hover:border-ink-300')}>
                <input type="radio" name="role" value={role} checked={newRole === role} onChange={() => setNewRole(role)} className="accent-brand-600" />
                <span className="text-sm font-medium text-ink-900">{role}</span>
              </label>
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancel</Button>
          <Button variant="brand" onClick={updateRole} disabled={actionLoading === 'role' || newRole === userDetail.role}>
            {actionLoading === 'role' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Update Role
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogHeader>Delete User</DialogHeader>
        <DialogBody>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  This action cannot be undone
                </p>
                <p className="mt-1 text-sm text-red-700">
                  This will permanently delete the account for <strong>{userDetail.username}</strong> and all associated data.
                </p>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button variant="destructive" onClick={deleteUser} disabled={actionLoading === 'delete'}>
            {actionLoading === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete User
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onClose={() => setShowRestoreDialog(false)}>
        <DialogHeader>Restore User</DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-600">
            Restore the account for <strong>{userDetail.username}</strong>? This will reactivate their access.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>Cancel</Button>
          <Button variant="brand" onClick={restoreUser} disabled={actionLoading === 'restore'}>
            {actionLoading === 'restore' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Restore User
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onClose={() => setShowResetPasswordDialog(false)}>
        <DialogHeader>Reset Password</DialogHeader>
        <DialogBody>
          <p className="mb-4 text-sm text-ink-600">
            Set a new password for <strong>{userDetail.username}</strong>.
          </p>
          <Input
            type="password"
            placeholder="Enter new password"
            value={resetPasswordValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResetPasswordValue(e.target.value)}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>Cancel</Button>
          <Button variant="brand" onClick={resetUserPassword} disabled={actionLoading === 'reset-password' || !resetPasswordValue}>
            {actionLoading === 'reset-password' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <KeyRound className="mr-1.5 h-4 w-4" />
            Reset Password
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Force Logout Dialog */}
      <Dialog open={showForceLogoutDialog} onClose={() => setShowForceLogoutDialog(false)}>
        <DialogHeader>Force Logout</DialogHeader>
        <DialogBody>
          <p className="text-sm text-ink-600">
            Forcefully log out <strong>{userDetail.username}</strong> from all active sessions?
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowForceLogoutDialog(false)}>Cancel</Button>
          <Button variant="destructive" onClick={forceLogout} disabled={actionLoading === 'force-logout'}>
            {actionLoading === 'force-logout' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <LogOut className="mr-1.5 h-4 w-4" />
            Force Logout
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
