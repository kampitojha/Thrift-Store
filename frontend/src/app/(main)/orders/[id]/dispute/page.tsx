'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, Loader2, Upload, Send } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const DISPUTE_REASONS = [
  'Item not received',
  'Item damaged in transit',
  'Wrong item received',
  'Item not as described',
  'Defective or faulty',
  'Counterfeit or fake',
  'Seller unresponsive',
  'Other',
];

export default function RaiseDisputePage() {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const orderId = params?.id as string;

  useEffect(() => {
    if (!user) { router.push('/sign-in'); return; }
  }, [user, router]);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/disputes', {
        orderId, reason, description: description || undefined,
        evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to raise dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const addEvidence = () => {
    if (evidenceUrl.trim() && !evidenceUrls.includes(evidenceUrl.trim())) {
      setEvidenceUrls([...evidenceUrls, evidenceUrl.trim()]);
      setEvidenceUrl('');
    }
  };

  if (!user) return null;

  if (success) {
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <Shield className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="mt-6 font-display text-2xl font-semibold text-ink-900">Dispute Raised</h1>
        <p className="mt-2 text-ink-500">Your dispute has been submitted and will be reviewed.</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href={`/orders/${orderId}`}><Button variant="outline">Back to order</Button></Link>
          <Link href="/disputes"><Button variant="brand">View disputes</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page max-w-xl py-10">
      <Link href={`/orders/${orderId}`} className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-700 mb-6"><ArrowLeft className="h-4 w-4" />Back to order</Link>

      <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl bg-red-50 p-3"><Shield className="h-6 w-6 text-red-600" /></div>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink-900">Raise a Dispute</h1>
            <p className="text-sm text-ink-500">Tell us what went wrong with this order</p>
          </div>
        </div>

        {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">Reason for dispute</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DISPUTE_REASONS.map((r) => (
                <label key={r} className={cn('flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition', reason === r ? 'border-brand-200 bg-brand-50' : 'border-ink-100 hover:bg-ink-50')}>
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={(e) => setReason(e.target.value)} className="h-4 w-4 text-brand-600" />
                  <span className="text-sm text-ink-700">{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe the issue in detail..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Evidence (image URLs)</label>
            <div className="flex gap-2 mb-2">
              <Input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://..." className="flex-1" />
              <Button variant="outline" onClick={addEvidence} disabled={!evidenceUrl.trim()}><Upload className="h-4 w-4" />Add</Button>
            </div>
            {evidenceUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {evidenceUrls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-1.5 text-xs text-ink-600">
                    <span className="truncate max-w-[200px]">{url}</span>
                    <button onClick={() => setEvidenceUrls(evidenceUrls.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="brand" className="w-full" onClick={handleSubmit} disabled={submitting || !reason}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit Dispute
          </Button>
        </div>
      </div>
    </div>
  );
}
