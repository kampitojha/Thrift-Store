'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  body?: string | null;
  mediaUrl?: string | null;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    username: string;
    avatarUrl?: string | null;
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
  const [otherUser, setOtherUser] = useState<{ id: string; username: string; avatarUrl?: string | null } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
    Promise.all([
      apiClient.get<Message[]>(`/messages/${conversationId}`),
      apiClient.get<Array<{ id: string; participants: Array<{ user: { id: string; username: string; avatarUrl?: string | null } }> }>>('/messages'),
    ])
      .then(([msgs, conversations]) => {
        setMessages(msgs);
        const conv = conversations.find((c) => c.id === conversationId);
        const other = conv?.participants.find((p) => p.user.id !== user.id)?.user;
        if (other) setOtherUser(other);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const msg = await apiClient.post<Message>(`/messages/${conversationId}`, { body: input.trim() });
      setMessages((prev) => [...prev, msg]);
      setInput('');
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

  if (!user) return null;

  return (
    <div className="container-page flex h-[calc(100vh-5rem)] flex-col py-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/messages" className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {loading ? (
          <Skeleton className="h-10 w-40 rounded-full" />
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-ink-200">
              {otherUser?.avatarUrl ? (
                <img src={otherUser.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-5 w-5 text-ink-500" />
              )}
            </div>
            <div>
              <p className="font-medium text-ink-900">{otherUser?.username || 'Conversation'}</p>
              <p className="text-xs text-ink-500">{messages.length} messages</p>
            </div>
          </div>
        )}
      </div>

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
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="font-medium text-ink-800">No messages yet</p>
              <p className="mt-1 text-sm text-ink-500">Send a message to start the conversation.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
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
                    <p className={cn('mt-1 text-right text-[10px]', isMe ? 'text-white/70' : 'text-ink-400')}>
                      {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-4 flex items-center gap-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
