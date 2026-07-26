'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient, ApiError, PaginationMeta } from '@/lib/api';
import { MapPin, Calendar, Link as LinkIcon, Package, Store, ShieldCheck, Loader2, UserPlus, UserMinus, ChevronLeft, Folder, Star, Users, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { cn, formatINR } from '@/lib/utils';

type ProfileData = {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  isVerified: boolean;
  role: string;
  socialLinks?: Record<string, string>;
  createdAt: string;
  profile: {
    itemsSold: number;
    itemsBought: number;
    totalReviews: number;
    averageRating: number;
    responseRate: number;
  } | null;
  sellerProfile?: {
    storeName: string;
    storeSlug: string;
    storeDescription?: string;
    storeLogoUrl?: string;
    storeBannerUrl?: string;
    verificationStatus: string;
    rating: number;
    totalSales: number;
  } | null;
  _count: {
    followers: number;
    follows: number;
    products: number;
  };
};

type Listing = {
  id: string;
  title: string;
  slug: string;
  pricePaise: number;
  originalPricePaise?: number | null;
  status: string;
  thumbnailUrl?: string | null;
};

type Collection = {
  id: string;
  name: string;
  slug: string;
  _count: { items: number };
};

type Review = {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  createdAt: string;
  author: { id: string; username: string; avatarUrl?: string | null; displayName?: string | null };
};

type FollowUser = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  isVerified: boolean;
};

type Tab = 'listings' | 'reviews' | 'collections' | 'following';

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [togglingFollow, setTogglingFollow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('listings');

  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [followingList, setFollowingList] = useState<FollowUser[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ProfileData>(`/users/${encodeURIComponent(username)}`);
      setProfile(data);
      if (currentUser) {
        const res = await apiClient.get<{ following: boolean }>(`/users/${encodeURIComponent(username)}/is-following`);
        setFollowing(res.following);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'User not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    loadTab(activeTab);
  }, [activeTab, profile]);

  const loadTab = async (tab: Tab) => {
    setTabLoading(true);
    try {
      if (tab === 'listings') {
        const res = await apiClient.get<{ data: Listing[]; meta: PaginationMeta }>(
          `/products?sellerId=${profile!.id}&limit=12`,
        );
        setListings(res.data ?? []);
      } else if (tab === 'reviews') {
        const res = await apiClient.get<{ data: Review[]; meta: PaginationMeta }>(
          `/reviews/seller/${profile!.id}`,
        );
        setReviews(res.data ?? []);
      } else if (tab === 'collections') {
        const res = await apiClient.get<{ data: Collection[]; meta: PaginationMeta }>(
          `/collections/user/${encodeURIComponent(username)}`,
        );
        setCollections(res.data ?? []);
      } else if (tab === 'following') {
        const res = await apiClient.get<{ data: FollowUser[]; meta: PaginationMeta }>(
          `/users/${encodeURIComponent(username)}/following`,
        );
        setFollowingList(res.data ?? []);
      }
    } catch { /* ignore */ } finally { setTabLoading(false); }
  };

  const toggleFollow = async () => {
    if (!currentUser) { router.push('/sign-in'); return; }
    setTogglingFollow(true);
    try {
      if (following) {
        await apiClient.delete(`/users/${encodeURIComponent(username)}/follow`);
        setFollowing(false);
        setProfile((p) => p ? { ...p, _count: { ...p._count, followers: p._count.followers - 1 } } : p);
      } else {
        await apiClient.post(`/users/${encodeURIComponent(username)}/follow`);
        setFollowing(true);
        setProfile((p) => p ? { ...p, _count: { ...p._count, followers: p._count.followers + 1 } } : p);
      }
    } catch { /* ignore */ } finally { setTogglingFollow(false); }
  };

  if (loading) {
    return (
      <div className="container-page py-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink-400" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink-900">User not found</h1>
        <p className="mt-2 text-sm text-ink-500">{error || 'This profile does not exist.'}</p>
        <Link href="/"><Button variant="brand" className="mt-6">Back to home</Button></Link>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const joinedDate = new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'listings', label: 'Listings', icon: Package },
    { key: 'reviews', label: 'Reviews', icon: Star },
    { key: 'collections', label: 'Collections', icon: Folder },
    { key: 'following', label: 'Following', icon: Users },
  ];

  return (
    <div className="container-page py-8">
      {/* Cover */}
      <div className="relative h-48 overflow-hidden rounded-3xl bg-gradient-to-r from-brand-100 to-brand-200 sm:h-56">
        {profile.coverUrl && <img src={profile.coverUrl} alt="" className="h-full w-full object-cover" />}
      </div>

      <div className="relative -mt-14 flex flex-wrap items-end justify-between gap-4 px-0 sm:px-6">
        <div className="flex items-end gap-4">
          <div className="h-28 w-28 overflow-hidden rounded-2xl border-4 border-white bg-ink-200 shadow-lift">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-ink-500">
                {profile.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="pb-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-semibold text-ink-900">{profile.displayName}</h1>
              {profile.isVerified && <ShieldCheck className="h-5 w-5 text-brand-600" />}
            </div>
            <p className="text-sm text-ink-500">@{profile.username}</p>
          </div>
        </div>

        <div className="flex gap-2 pb-1">
          {isOwnProfile ? (
            <>
              <Link href="/settings">
                <Button variant="outline" size="sm">Edit profile</Button>
              </Link>
              <Link href="/collections">
                <Button variant="ghost" size="sm"><Folder className="mr-2 h-4 w-4" />Collections</Button>
              </Link>
            </>
          ) : currentUser ? (
            <>
              <Button variant={following ? 'outline' : 'brand'} size="sm" onClick={toggleFollow} disabled={togglingFollow}>
                {togglingFollow ? <Loader2 className="h-4 w-4 animate-spin" /> : following ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {following ? 'Following' : 'Follow'}
              </Button>
              <Link href={`/messages?start=${profile.id}`}>
                <Button variant="outline" size="sm">Message</Button>
              </Link>
            </>
          ) : (
            <Link href="/sign-in"><Button variant="brand" size="sm">Follow</Button></Link>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-ink-500">
        {profile.city && (
          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{profile.city}{profile.state ? `, ${profile.state}` : ''}</span>
        )}
        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Joined {joinedDate}</span>
        {profile.socialLinks?.website && (
          <a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-700 hover:underline">
            <LinkIcon className="h-4 w-4" />Website
          </a>
        )}
      </div>

      {profile.bio && <p className="mt-4 text-sm text-ink-700 whitespace-pre-wrap">{profile.bio}</p>}

      <div className="mt-6 flex gap-6 text-sm">
        <button onClick={() => setActiveTab('listings')} className={cn('hover:underline', activeTab === 'listings' && 'font-semibold text-ink-900')}>
          <strong className="text-ink-900">{profile._count.products}</strong> <span className="text-ink-500">listings</span>
        </button>
        <button onClick={() => setActiveTab('reviews')} className={cn('hover:underline', activeTab === 'reviews' && 'font-semibold text-ink-900')}>
          <strong className="text-ink-900">{profile.profile?.totalReviews || 0}</strong> <span className="text-ink-500">reviews</span>
        </button>
        <Link href={`/followers/${username}`} className="hover:underline">
          <strong className="text-ink-900">{profile._count.followers}</strong> <span className="text-ink-500">followers</span>
        </Link>
        <button onClick={() => setActiveTab('following')} className={cn('hover:underline', activeTab === 'following' && 'font-semibold text-ink-900')}>
          <strong className="text-ink-900">{profile._count.follows}</strong> <span className="text-ink-500">following</span>
        </button>
      </div>

      {profile.sellerProfile && (
        <Link href={`/store/${profile.sellerProfile.storeSlug}`} className="mt-6 block">
          <div className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 hover:bg-ink-50 transition">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-ink-100">
              {profile.sellerProfile.storeLogoUrl ? (
                <img src={profile.sellerProfile.storeLogoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Store className="h-6 w-6 text-ink-500" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-ink-900">{profile.sellerProfile.storeName}</p>
                {profile.sellerProfile.verificationStatus === 'VERIFIED' && (
                  <ShieldCheck className="h-4 w-4 text-brand-600" />
                )}
              </div>
              <p className="text-xs text-ink-500">
                {profile.sellerProfile.rating > 0 && `${profile.sellerProfile.rating.toFixed(1)} · `}
                {profile.sellerProfile.totalSales} sales
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Tabs */}
      <div className="mt-8 border-b border-ink-100">
        <div className="flex gap-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition',
                activeTab === key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-ink-500 hover:text-ink-700',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {tabLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-ink-50 animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'listings' ? (
          listings.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="mx-auto h-8 w-8 text-ink-300" />
              <p className="mt-2 text-sm text-ink-500">No listings yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {listings.map((item) => (
                <Link key={item.id} href={`/products/${item.slug}`} className="group overflow-hidden rounded-2xl border border-ink-100 bg-white transition hover:shadow-soft">
                  <div className="aspect-square bg-ink-50 flex items-center justify-center">
                    <Package className="h-8 w-8 text-ink-300" />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-ink-900 group-hover:text-brand-700">{item.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm font-semibold text-brand-700">{formatINR(item.pricePaise)}</p>
                      {item.originalPricePaise && (
                        <p className="text-xs text-ink-400 line-through">{formatINR(item.originalPricePaise)}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : activeTab === 'reviews' ? (
          reviews.length === 0 ? (
            <div className="py-16 text-center">
              <Star className="mx-auto h-8 w-8 text-ink-300" />
              <p className="mt-2 text-sm text-ink-500">No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-ink-100 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-200">
                      {r.author.avatarUrl ? (
                        <img src={r.author.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <span className="text-xs font-medium text-ink-600">{(r.author.displayName || r.author.username).slice(0, 1)}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink-900">{r.author.displayName || r.author.username}</p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn('h-3 w-3', i < r.rating ? 'fill-brand-500 text-brand-500' : 'text-ink-300')} />
                        ))}
                        <span className="ml-1 text-xs text-ink-400">
                          {new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {r.title && <p className="mt-2 text-sm font-medium text-ink-800">{r.title}</p>}
                  {r.body && <p className="mt-1 text-sm text-ink-600">{r.body}</p>}
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'collections' ? (
          collections.length === 0 ? (
            <div className="py-16 text-center">
              <Folder className="mx-auto h-8 w-8 text-ink-300" />
              <p className="mt-2 text-sm text-ink-500">No public collections</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {collections.map((col) => (
                <Link key={col.id} href={`/collections/${col.id}`} className="overflow-hidden rounded-2xl border border-ink-100 bg-white transition hover:shadow-soft">
                  <div className="aspect-[4/3] bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center">
                    <Folder className="h-10 w-10 text-brand-300" />
                  </div>
                  <div className="p-3">
                    <p className="truncate font-medium text-ink-900">{col.name}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{col._count.items} item{col._count.items !== 1 ? 's' : ''}</p>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : activeTab === 'following' ? (
          followingList.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto h-8 w-8 text-ink-300" />
              <p className="mt-2 text-sm text-ink-500">Not following anyone yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {followingList.map((u) => (
                <Link key={u.id} href={`/profile/${u.username}`} className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3 transition hover:bg-ink-50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-200">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-medium text-ink-600">{(u.displayName || u.username).slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="truncate text-sm font-medium text-ink-900">{u.displayName || u.username}</p>
                      {u.isVerified && <ShieldCheck className="h-3 w-3 shrink-0 text-brand-600" />}
                    </div>
                    <p className="truncate text-xs text-ink-500">@{u.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
