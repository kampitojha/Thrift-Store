'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Loader2, Send, ArrowLeft, Store, Package } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatINR, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Participant = {
  userId: string;
  user: { id: string; username: string; avatarUrl?: string; displayName?: string };
};

type Conversation = {
  id: string; productId?: string; lastMessageAt: string; createdAt: string;
  participants: Participant[];
  messages: Array<{ id: string; body?: string; mediaUrl?: string; createdAt: string; senderId: string }>;
};

type Message = {
  id: string; body?: string; mediaUrl?: string; offerId?: string; createdAt: string;
  sender: { id: string; username: string; avatarUrl?: string };
};

export default function InboxPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Conversation[] | { data: Conversation[] }>('/messages');
      setConversations(Array.isArray(data) ? data : ((data as any).data ?? []));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    fetchConversations();
  }, [user, fetchConversations, router]);

  const openConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    setMessagesLoading(true);
    try {
      const msgs = await apiClient.get<Message[] | { data: Message[] }>(`/messages/${conv.id}`);
      setMessages(Array.isArray(msgs) ? msgs : ((msgs as any).data ?? []));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    const body = newMessage.trim();
    setNewMessage('');
    try {
      const msg = await apiClient.post<Message>(`/messages/${selectedConv.id}`, { body });
      setMessages((prev) => [...prev, msg]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to send message');
    }
  };

  const otherParticipant = (conv: Conversation): Participant | undefined =>
    conv.participants?.find((p) => p.userId !== user?.id);

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-3">
          <div className="h-12 w-48 rounded bg-ink-100" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-ink-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Inbox</h1>
          <p className="text-sm text-ink-500">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn('lg:col-span-1', selectedConv && 'hidden lg:block')}>
          {conversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-ink-300" />
              <h3 className="mt-3 font-display text-lg font-semibold text-ink-900">No conversations</h3>
              <p className="mt-1 text-sm text-ink-500">Messages from buyers will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => {
                const other = otherParticipant(conv);
                const lastMsg = conv.messages?.[0];
                return (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className={cn(
                      'w-full text-left rounded-2xl border p-4 transition',
                      selectedConv?.id === conv.id ? 'border-brand-200 bg-brand-50' : 'border-ink-100 bg-white hover:bg-ink-50',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-ink-100 flex items-center justify-center text-sm font-semibold text-ink-600 shrink-0">
                        {other?.user?.username?.slice(0, 2).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-900 truncate">{other?.user?.displayName || other?.user?.username || 'Unknown'}</p>
                        {lastMsg?.body && <p className="text-xs text-ink-500 truncate">{lastMsg.body}</p>}
                        <p className="text-xs text-ink-400 mt-0.5">{new Date(conv.lastMessageAt || conv.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={cn('lg:col-span-2', !selectedConv && 'hidden lg:block')}>
          {!selectedConv ? (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-16 text-center h-full flex flex-col items-center justify-center">
              <MessageSquare className="mx-auto h-12 w-12 text-ink-300" />
              <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">Select a conversation</h3>
              <p className="mt-2 text-sm text-ink-500">Choose a conversation from the left to start chatting.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-ink-100 bg-white flex flex-col h-[600px]">
              <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-4">
                <button className="lg:hidden rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" onClick={() => setSelectedConv(null)}>
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="h-10 w-10 rounded-full bg-ink-100 flex items-center justify-center text-sm font-semibold text-ink-600">
                  {otherParticipant(selectedConv)?.user?.username?.slice(0, 2).toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-ink-900">{otherParticipant(selectedConv)?.user?.displayName || otherParticipant(selectedConv)?.user?.username || 'Unknown'}</p>
                  <p className="text-xs text-ink-500">@{otherParticipant(selectedConv)?.user?.username}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-ink-400" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="h-10 w-10 text-ink-300" />
                    <p className="mt-2 text-sm text-ink-500">No messages yet. Send a message to start the conversation.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender.id === user.id;
                    return (
                      <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                        <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5', isMine ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-900')}>
                          {msg.body && <p className="text-sm">{msg.body}</p>}
                          {msg.mediaUrl && <img src={msg.mediaUrl} alt="" className="mt-1 rounded-xl max-w-[200px]" />}
                          {msg.offerId && (
                            <div className="mt-2 rounded-xl border border-dashed border-ink-300 p-2 text-xs text-center">
                              <Package className="h-4 w-4 mx-auto mb-1" />
                              <p>Offer #{msg.offerId}</p>
                            </div>
                          )}
                          <p className={cn('text-xs mt-1', isMine ? 'text-brand-200' : 'text-ink-400')}>
                            {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-ink-100 p-4">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-3">
                  <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1" />
                  <Button type="submit" disabled={!newMessage.trim()}><Send className="h-4 w-4" /></Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
