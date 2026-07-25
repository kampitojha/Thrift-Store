'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient, ApiError } from '@/lib/api';
import { MapPin, Calendar, Link as LinkIcon, Heart, Package, Store, ShieldCheck, Loader2, UserPlus, UserMinus, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

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

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ProfileData>(`/users/${encodeURIComponent(username)}`);
      setProfile(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'User not found');
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async () => {
    if (!currentUser) { router.push('/sign-in'); return; }
    setTogglingFollow(true);
    try {
      if (following) {
        await apiClient.delete(`/users/${encodeURIComponent(username)}/follow`);
        setFollowing(false);
      } else {
        await apiClient.post(`/users/${encodeURIComponent(username)}/follow`);
        setFollowing(true);
      }
    } catch {
      // ignore
    } finally {
      setTogglingFollow(false);
    }
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

  return (
    <div className="container-page py-8">
      {/* Cover */}
      <div className="relative h-48 overflow-hidden rounded-3xl bg-gradient-to-r from-brand-100 to-brand-200 sm:h-56">
        {profile.coverUrl && <img src={profile.coverUrl} alt="" className="h-full w-full object-cover" />}
      </div>

      <div className="relative -mt-14 flex flex-wrap items-end justify-between gap-4 px-0 sm:px-6">
        {/* Avatar */}
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

        {/* Actions */}
        <div className="flex gap-2 pb-1">
          {isOwnProfile ? (
            <Link href="/settings">
              <Button variant="outline" size="sm">Edit profile</Button>
            </Link>
          ) : currentUser ? (
            <Button variant={following ? 'outline' : 'brand'} size="sm" onClick={toggleFollow} disabled={togglingFollow}>
              {togglingFollow ? <Loader2 className="h-4 w-4 animate-spin" /> : following ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {following ? 'Following' : 'Follow'}
            </Button>
          ) : (
            <Link href="/sign-in"><Button variant="brand" size="sm">Follow</Button></Link>
          )}
        </div>
      </div>

      {/* Info row */}
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

      {/* Bio */}
      {profile.bio && <p className="mt-4 text-sm text-ink-700 whitespace-pre-wrap">{profile.bio}</p>}

      {/* Stats */}
      <div className="mt-6 flex gap-6 text-sm">
        <span><strong className="text-ink-900">{profile._count.products}</strong> <span className="text-ink-500">listings</span></span>
        <span><strong className="text-ink-900">{profile._count.followers}</strong> <span className="text-ink-500">followers</span></span>
        <span><strong className="text-ink-900">{profile._count.follows}</strong> <span className="text-ink-500">following</span></span>
      </div>

      {/* Seller store */}
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
                {profile.sellerProfile.rating > 0 && `${profile.sellerProfile.rating.toFixed(1)} ★ · `}
                {profile.sellerProfile.totalSales} sales
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Tabs */}
      <div className="mt-8 border-b border-ink-100">
        <div className="flex gap-6">
          <button className="border-b-2 border-brand-600 pb-3 text-sm font-medium text-brand-700">Listings</button>
          <button className="pb-3 text-sm font-medium text-ink-500 hover:text-ink-700">Reviews</button>
          <button className="pb-3 text-sm font-medium text-ink-500 hover:text-ink-700">About</button>
        </div>
      </div>

      {/* Listings grid */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: profile._count.products }).map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl bg-ink-50 animate-pulse" />
        ))}
        {profile._count.products === 0 && (
          <div className="col-span-full py-16 text-center">
            <Package className="mx-auto h-8 w-8 text-ink-300" />
            <p className="mt-2 text-sm text-ink-500">No listings yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
