'use client';

import { useState } from 'react';
import { Share2, Check, Link2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogHeader, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function ShareButton({ title, url, className }: { title: string; url: string; className?: string }) {
  const [open, setOpen] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      const btn = document.getElementById('copy-btn');
      if (btn) {
        btn.innerHTML = 'Copied!';
        setTimeout(() => { btn.innerHTML = 'Copy link'; }, 2000);
      }
    } catch { /* ignore */ }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 text-ink-400 transition hover:border-ink-300 hover:text-ink-600',
          className,
        )}
        aria-label="Share"
      >
        <Share2 className="h-5 w-5" />
      </button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogHeader>Share</DialogHeader>
        <DialogBody className="space-y-4">
          <button
            type="button"
            id="copy-btn"
            onClick={copyLink}
            className="flex w-full items-center gap-3 rounded-xl border border-ink-100 p-3 text-sm hover:bg-ink-50"
          >
            <Link2 className="h-5 w-5 text-ink-500" />
            Copy link
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 text-sm hover:bg-ink-50"
          >
            <span className="text-lg">📱</span>
            WhatsApp
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`}
            className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 text-sm hover:bg-ink-50"
          >
            <Mail className="h-5 w-5 text-ink-500" />
            Email
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 text-sm hover:bg-ink-50"
          >
            <span className="text-lg">🐦</span>
            Twitter / X
          </a>
        </DialogBody>
      </Dialog>
    </>
  );
}
