'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, ArrowLeft, Search, User, Pin, BellOff, Archive, CheckCheck, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api';
import { connectSocket, onMessage, onUserOnline, getSocket } from '@/lib/socket';
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
    isMuted?: boolean;
    isPinned?: boolean;
    isArchived?: boolean;
  }>;
  messages: Array<{
    id: string;
    body?: string | null;
    createdAt: string;
    senderId: string;
    readAt?: string | null;
  }>;
};

export default function MessagesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    try { connectSocket(); } catch {}

    apiClient
      .get<Conversation[] | { data: Conversation[] }>('/messages')
      .then((res) => {
        const convs = Array.isArray(res) ? res : ((res as any).data ?? []);
        setConversations(convs);
        convs.forEach((c: Conversation) => {
          const other = c.participants.find((p) => p.user.id !== user.id)?.user;
          if (other) {
            const s = getSocket();
            if (s) {
              s.emit('user:status', { userId: other.id }, (res: { online: boolean }) => {
                setOnlineMap((prev) => ({ ...prev, [other.id]: res.online }));
              });
            }
          }
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const unsubMsg = onMessage((data) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === data.conversationId);
        if (idx === -1) return prev;
        const updated = [...prev];
        const conv = { ...updated[idx] };
        if (!conv.messages.some((m) => m.id === data.message.id)) {
          conv.messages = [data.message, ...conv.messages];
        }
        conv.lastMessageAt = data.message.createdAt;
        updated.splice(idx, 1);
        updated.unshift(conv);
        return updated;
      });
      if (data.message.senderId !== user.id) {
        setUnreadMap((prev) => ({
          ...prev,
          [data.conversationId]: (prev[data.conversationId] || 0) + 1,
        }));
      }
    });

    const unsubOnline = onUserOnline((data) => {
      setOnlineMap((prev) => ({ ...prev, [data.userId]: data.online }));
    });

    return () => { unsubMsg(); unsubOnline(); };
  }, [user, router]);

  if (!user) return null;

  const filtered = conversations
    .filter((c) => {
      const me = c.participants.find((p) => p.user.id === user.id);
      if (me?.isArchived) return false;
      const other = c.participants.find((p) => p.user.id !== user.id)?.user;
      if (!other) return true;
      const name = other.displayName || other.username;
      return name.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const aPin = a.participants.find((p) => p.user.id === user.id)?.isPinned;
      const bPin = b.participants.find((p) => p.user.id === user.id)?.isPinned;
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
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
              const me = c.participants.find((p) => p.user.id === user.id);
              const lastMsg = c.messages[0];
              const unread = unreadMap[c.id] || 0;
              const isOnline = other ? onlineMap[other.id] : false;
              const isPinned = me?.isPinned;
              const isMuted = me?.isMuted;

              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className={cn(
                    'flex items-center gap-4 rounded-2xl border p-4 transition hover:bg-ink-50 hover:shadow-soft',
                    unread > 0 ? 'border-brand-200 bg-brand-50/30' : 'border-ink-100 bg-white',
                    isPinned && 'ring-1 ring-brand-200',
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-ink-200">
                      {other?.avatarUrl ? (
                        <img src={other.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-ink-500" />
                      )}
                    </div>
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <p className={cn('truncate text-sm', unread > 0 ? 'font-semibold text-ink-900' : 'font-medium text-ink-900')}>
                          {other?.displayName || other?.username || 'Unknown'}
                        </p>
                        {isPinned && <Pin className="h-3 w-3 shrink-0 text-brand-500" />}
                        {isMuted && <BellOff className="h-3 w-3 shrink-0 text-ink-400" />}
                      </div>
                      {lastMsg && (
                        <span className="shrink-0 text-xs text-ink-400">
                          {new Date(lastMsg.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <p className={cn('truncate text-sm', unread > 0 ? 'font-medium text-ink-700' : 'text-ink-500')}>
                        {lastMsg?.senderId === user.id && (
                          lastMsg?.readAt ? (
                            <CheckCheck className="inline h-3.5 w-3.5 -mt-0.5 mr-1 text-brand-500" />
                          ) : (
                            <Check className="inline h-3.5 w-3.5 -mt-0.5 mr-1 text-ink-400" />
                          )
                        )}
                        {lastMsg?.body || 'No messages yet'}
                      </p>
                      {unread > 0 && (
                        <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {unread}
                        </span>
                      )}
                    </div>
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
