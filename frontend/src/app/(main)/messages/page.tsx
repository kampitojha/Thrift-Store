'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, ArrowLeft, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';

type Conversation = {
  id: string;
  productId?: string | null;
  lastMessageAt: string;
  createdAt: string;
  participants: Array<{
    user: {
      id: string;
      username: string;
      avatarUrl?: string | null;
      displayName?: string | null;
    };
  }>;
  messages: Array<{
    id: string;
    body?: string | null;
    createdAt: string;
    senderId: string;
  }>;
};

export default function MessagesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    apiClient
      .get<Conversation[]>('/messages')
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  if (!user) return null;

  const filtered = conversations.filter((c) => {
    const other = c.participants.find((p) => p.user.id !== user.id)?.user;
    if (!other) return true;
    const name = other.displayName || other.username;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">Messages</h1>
          <p className="mt-1 text-sm text-ink-500">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <MessageCircle className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No messages yet</p>
          <p className="mt-2 text-sm text-ink-500">
            When you message a seller or buyer about an item, conversations will appear here.
          </p>
          <Link href="/browse">
            <Button variant="brand" className="mt-6">
              Browse items
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="pl-10"
            />
          </div>
          <div className="space-y-2">
            {filtered.map((c) => {
              const other = c.participants.find((p) => p.user.id !== user.id)?.user;
              const lastMsg = c.messages[0];
              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 transition hover:bg-ink-50 hover:shadow-soft"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-200">
                    {other?.avatarUrl ? (
                      <img src={other.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-ink-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {other?.displayName || other?.username || 'Unknown'}
                      </p>
                      {lastMsg && (
                        <span className="shrink-0 text-xs text-ink-400">
                          {new Date(lastMsg.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-500">
                      {lastMsg?.body || 'No messages yet'}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs text-ink-500">
                      {c.productId ? 'Item' : 'General'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
