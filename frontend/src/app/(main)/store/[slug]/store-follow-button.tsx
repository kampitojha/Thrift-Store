'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api';

export function StoreFollowButton({ storeSlug }: { storeSlug: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleFollow = async () => {
    if (!user) { router.push('/sign-in'); return; }
    setLoading(true);
    try {
      if (following) {
        await apiClient.delete(`/sellers/store/${storeSlug}/follow`);
        setFollowing(false);
      } else {
        await apiClient.post(`/sellers/store/${storeSlug}/follow`, {});
        setFollowing(true);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={following ? 'outline' : 'brand'}
      size="sm"
      onClick={toggleFollow}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : following ? (
        <UserCheck className="mr-2 h-4 w-4" />
      ) : (
        <UserPlus className="mr-2 h-4 w-4" />
      )}
      {following ? 'Following' : 'Follow'}
    </Button>
  );
}
