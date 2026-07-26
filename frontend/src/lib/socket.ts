'use client';

import { io, Socket } from 'socket.io-client';
import { apiClient } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  if (socket?.connected) return socket;
  return null;
}

export function connectSocket(): Socket {
  if (typeof window === 'undefined') {
    throw new Error('connectSocket can only be called on the client');
  }
  if (socket?.connected) return socket;

  const token = apiClient.getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: false,
  });

  socket.on('connect', () => {
    console.log('[ws] connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('[ws] disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[ws] connection error:', err.message);
  });

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emitMessage(conversationId: string, body?: string, mediaUrl?: string, offerId?: string) {
  const s = getSocket();
  if (!s) return;
  s.emit('message:send', { conversationId, body, mediaUrl, offerId });
}

export function emitRead(conversationId: string, messageId?: string) {
  const s = getSocket();
  if (!s) return;
  s.emit('message:read', { conversationId, messageId });
}

export function emitTypingStart(conversationId: string) {
  const s = getSocket();
  if (!s) return;
  s.emit('typing:start', { conversationId });
}

export function emitTypingStop(conversationId: string) {
  const s = getSocket();
  if (!s) return;
  s.emit('typing:stop', { conversationId });
}

export function onMessage(callback: (data: { conversationId: string; message: any }) => void) {
  const s = getSocket();
  if (!s) return () => {};
  s.on('message:new', callback);
  return () => s.off('message:new', callback);
}

export function onRead(callback: (data: { conversationId: string; readBy: string; readAt: string }) => void) {
  const s = getSocket();
  if (!s) return () => {};
  s.on('message:read', callback);
  return () => s.off('message:read', callback);
}

export function onTypingStart(callback: (data: { conversationId: string; userId: string; username: string }) => void) {
  const s = getSocket();
  if (!s) return () => {};
  s.on('typing:start', callback);
  return () => s.off('typing:start', callback);
}

export function onTypingStop(callback: (data: { conversationId: string; userId: string }) => void) {
  const s = getSocket();
  if (!s) return () => {};
  s.on('typing:stop', callback);
  return () => s.off('typing:stop', callback);
}

export function onUserOnline(callback: (data: { userId: string; online: boolean; lastSeenAt?: string }) => void) {
  const s = getSocket();
  if (!s) return () => {};
  s.on('user:online', callback);
  return () => s.off('user:online', callback);
}

export function onNotification(callback: (data: any) => void) {
  const s = getSocket();
  if (!s) return () => {};
  s.on('notification:new', callback);
  return () => s.off('notification:new', callback);
}
