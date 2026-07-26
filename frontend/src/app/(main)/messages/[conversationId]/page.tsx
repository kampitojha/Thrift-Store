'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, User, Loader2, Check, CheckCheck, MoreVertical, Trash2, Archive, Pin, BellOff, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api';
import {
  connectSocket,
  getSocket,
  emitMessage,
  emitRead,
  emitTypingStart,
  emitTypingStop,
  onMessage,
  onRead,
  onTypingStart,
  onTypingStop,
  onUserOnline,
} from '@/lib/socket';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  body?: string | null;
  mediaUrl?: string | null;
  createdAt: string;
  senderId: string;
  readAt?: string | null;
  sender: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    displayName?: string | null;
  };
};

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [otherUser, setOtherUser] = useState<{ id: string; username: string; displayName?: string | null; avatarUrl?: string | null } | null>(null);
  const [otherOnline, setOtherOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [muted, setMuted] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    try { connectSocket(); } catch {}

    Promise.all([
      apiClient.get<Message[]>(`/messages/${conversationId}`),
      apiClient.get<Array<{ id: string; participants: Array<{ user: { id: string; username: string; displayName?: string | null; avatarUrl?: string | null } }> }>>('/messages'),
    ])
      .then(([msgs, conversations]) => {
        setMessages(msgs);
        const conv = conversations.find((c) => c.id === conversationId);
        const other = conv?.participants.find((p) => p.user.id !== user.id)?.user;
        if (other) setOtherUser(other);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const unsubMsg = onMessage((data) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        emitRead(conversationId);
      }
    });

    const unsubRead = onRead((data) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            data.readBy !== user.id && !m.readAt ? { ...m, readAt: data.readAt } : m,
          ),
        );
      }
    });

    const unsubTypingStart = onTypingStart((data) => {
      if (data.conversationId === conversationId && data.userId !== user.id) {
        setTyping(true);
      }
    });

    const unsubTypingStop = onTypingStop((data) => {
      if (data.conversationId === conversationId && data.userId !== user.id) {
        setTyping(false);
      }
    });

    const unsubOnline = onUserOnline((data) => {
      if (otherUser && data.userId === otherUser.id) {
        setOtherOnline(data.online);
      }
    });

    return () => {
      unsubMsg();
      unsubRead();
      unsubTypingStart();
      unsubTypingStop();
      unsubOnline();
    };
  }, [user, router, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (!loading && otherUser) {
      const s = getSocket();
      if (s) {
        s.emit('user:status', { userId: otherUser.id }, (res: { online: boolean }) => {
          setOtherOnline(res.online);
        });
      }
    }
  }, [loading, otherUser]);

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTypingStart(conversationId);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitTypingStop(conversationId);
    }, 3000);
  }, [conversationId]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const body = input.trim();
    setInput('');
    setSending(true);

    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitTypingStop(conversationId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    try {
      const s = getSocket();
      if (s?.connected) {
        emitMessage(conversationId, body);
      } else {
        const msg = await apiClient.post<Message>(`/messages/${conversationId}`, { body });
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleMute = async () => {
    try {
      const res = await apiClient.patch<{ muted: boolean }>(`/messages/${conversationId}/mute`);
      setMuted(res.muted);
      setShowMenu(false);
    } catch {}
  };

  const togglePin = async () => {
    try {
      const res = await apiClient.patch<{ pinned: boolean }>(`/messages/${conversationId}/pin`);
      setPinned(res.pinned);
      setShowMenu(false);
    } catch {}
  };

  const toggleArchive = async () => {
    try {
      const res = await apiClient.patch<{ archived: boolean }>(`/messages/${conversationId}/archive`);
      setArchived(res.archived);
      setShowMenu(false);
    } catch {}
  };

  const deleteConversation = async () => {
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/messages/${conversationId}`);
      router.push('/messages');
    } catch {}
  };

  const searchInConversation = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await apiClient.get<Message[]>(`/messages/${conversationId}/search?q=${encodeURIComponent(searchQuery)}`);
      setMessages(results);
      setSearchMode(false);
    } catch {}
  };

  if (!user) return null;

  const filteredMessages = messages;

  return (
    <div className="container-page flex h-[calc(100vh-5rem)] flex-col py-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {loading ? (
            <Skeleton className="h-10 w-40 rounded-full" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-ink-200">
                  {otherUser?.avatarUrl ? (
                    <img src={otherUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-ink-500" />
                  )}
                </div>
                {otherOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                )}
              </div>
              <div>
                <p className="font-medium text-ink-900">{otherUser?.displayName || otherUser?.username || 'Conversation'}</p>
                <p className="text-xs text-ink-500">
                  {typing ? (
                    <span className="text-brand-600">typing...</span>
                  ) : otherOnline ? (
                    'Online'
                  ) : (
                    `${messages.length} messages`
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setSearchMode(!searchMode); if (searchMode) { setSearchQuery(''); } }}
            className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            <Search className="h-5 w-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-ink-100 bg-white py-1 shadow-lg">
                <button onClick={toggleMute} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
                  <BellOff className="h-4 w-4" />
                  {muted ? 'Unmute' : 'Mute'}
                </button>
                <button onClick={togglePin} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
                  <Pin className="h-4 w-4" />
                  {pinned ? 'Unpin' : 'Pin'}
                </button>
                <button onClick={toggleArchive} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
                  <Archive className="h-4 w-4" />
                  {archived ? 'Unarchive' : 'Archive'}
                </button>
                <hr className="my-1 border-ink-100" />
                <button onClick={deleteConversation} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      {searchMode && (
        <div className="mb-3 flex items-center gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') searchInConversation(); }}
            placeholder="Search in conversation..."
            className="flex-1"
            autoFocus
          />
          <Button variant="brand" size="sm" onClick={searchInConversation}>Search</Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-ink-100 bg-white p-4">
        {loading ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                <Skeleton className={cn('h-16 rounded-2xl', i % 2 === 0 ? 'w-3/4' : 'w-1/2')} />
              </div>
            ))}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="font-medium text-ink-800">No messages yet</p>
              <p className="mt-1 text-sm text-ink-500">Send a message to start the conversation.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMessages.map((msg) => {
              const isMe = msg.senderId === user.id;
              return (
                <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5',
                      isMe ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-900',
                    )}
                  >
                    {msg.body && (
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                    )}
                    {msg.mediaUrl && (
                      <img src={msg.mediaUrl} alt="" className="mt-2 max-h-40 rounded-xl object-cover" />
                    )}
                    <div className={cn('mt-1 flex items-center justify-end gap-1.5 text-[10px]', isMe ? 'text-white/70' : 'text-ink-400')}>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isMe && (
                        msg.readAt ? (
                          <CheckCheck className="h-3 w-3" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {typing && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-ink-100 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-400 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-4 flex items-center gap-3">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); handleTyping(); }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1"
          disabled={sending}
        />
        <Button
          variant="brand"
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="h-11 w-11 shrink-0 rounded-xl p-0"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
