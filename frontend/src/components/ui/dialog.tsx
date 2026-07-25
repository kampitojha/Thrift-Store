'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type DialogContextType = {
  open: boolean;
  onClose: () => void;
};

const DialogContext = React.createContext<DialogContextType>({ open: false, onClose: () => {} });

export function Dialog({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <DialogContext.Provider value={{ open, onClose }}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-lg animate-fade-up rounded-2xl bg-white shadow-lift">
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  );
}

export function DialogHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  const { onClose } = React.useContext(DialogContext);
  return (
    <div className={cn('flex items-center justify-between border-b border-ink-100 px-6 py-4', className)}>
      <div className="text-lg font-semibold text-ink-900">{children}</div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export function DialogBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

export function DialogFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex justify-end gap-3 border-t border-ink-100 px-6 py-4', className)}>
      {children}
    </div>
  );
}
