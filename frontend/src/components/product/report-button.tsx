'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';

const REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'FAKE', label: 'Fake / counterfeit' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'COUNTERFEIT', label: 'Counterfeit item' },
  { value: 'MISLEADING', label: 'Misleading listing' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'OTHER', label: 'Other' },
];

export function ReportButton({ productId }: { productId: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('SPAM');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!user) { router.push('/sign-in'); return; }
    setSubmitting(true);
    try {
      await apiClient.post(`/products/${productId}/report`, { reason, details });
      setDone(true);
    } catch { /* ignore */ } finally { setSubmitting(false); }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-red-500"
        aria-label="Report listing"
      >
        <Flag className="h-3.5 w-3.5" />
        Report
      </button>

      <Dialog open={open} onClose={() => { setOpen(false); setDone(false); }}>
        <DialogHeader>{done ? 'Report submitted' : 'Report listing'}</DialogHeader>
        <DialogBody>
          {done ? (
            <p className="text-sm text-ink-600">
              Thanks for helping keep Thrift Store safe. Our team will review this listing.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-600">Reason</label>
                <Select value={reason} onChange={(e) => setReason(e.target.value)} options={REASONS} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-600">Details (optional)</label>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Tell us more about the issue…"
                />
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setOpen(false); setDone(false); }}>
            {done ? 'Close' : 'Cancel'}
          </Button>
          {!done && (
            <Button variant="destructive" onClick={submit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit report'}
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    </>
  );
}
