'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Plus,
  RefreshCw,
  Eye,
  X,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

const TEMPLATE_TYPES = [
  { value: 'WELCOME_EMAIL', label: 'Welcome Email' },
  { value: 'VERIFICATION_EMAIL', label: 'Verification Email' },
  { value: 'PASSWORD_RESET', label: 'Password Reset' },
  { value: 'ORDER_CONFIRMATION', label: 'Order Confirmation' },
  { value: 'SHIPPING_UPDATE', label: 'Shipping Update' },
  { value: 'REFUND_PROCESSED', label: 'Refund Processed' },
  { value: 'PROMOTION_EMAIL', label: 'Promotion Email' },
  { value: 'NEWSLETTER', label: 'Newsletter' },
];

const VARIABLE_HINTS: Record<string, string[]> = {
  WELCOME_EMAIL: ['{{userName}}', '{{storeName}}', '{{supportEmail}}'],
  VERIFICATION_EMAIL: ['{{userName}}', '{{verificationLink}}', '{{expiryHours}}'],
  PASSWORD_RESET: ['{{userName}}', '{{resetLink}}', '{{expiryHours}}'],
  ORDER_CONFIRMATION: ['{{orderId}}', '{{userName}}', '{{orderDate}}', '{{totalAmount}}', '{{items}}', '{{deliveryDate}}'],
  SHIPPING_UPDATE: ['{{orderId}}', '{{userName}}', '{{trackingNumber}}', '{{carrier}}', '{{estimatedDate}}', '{{status}}'],
  REFUND_PROCESSED: ['{{orderId}}', '{{userName}}', '{{refundAmount}}', '{{refundMethod}}', '{{estimatedDays}}'],
  PROMOTION_EMAIL: ['{{userName}}', '{{promoCode}}', '{{discountPercent}}', '{{minPurchase}}', '{{expiryDate}}', '{{storeName}}'],
  NEWSLETTER: ['{{userName}}', '{{unsubscribeLink}}', '{{year}}'],
};

const SAMPLE_VALUES: Record<string, Record<string, string>> = {
  WELCOME_EMAIL: { userName: 'Ravi', storeName: 'Thrift Store', supportEmail: 'support@thriftstore.com' },
  VERIFICATION_EMAIL: { userName: 'Ravi', verificationLink: 'https://thriftstore.com/verify?token=abc123', expiryHours: '24' },
  PASSWORD_RESET: { userName: 'Ravi', resetLink: 'https://thriftstore.com/reset?token=xyz789', expiryHours: '1' },
  ORDER_CONFIRMATION: { orderId: 'ORD-12345', userName: 'Ravi', orderDate: '26 Jul 2026', totalAmount: '₹1,299', items: '2 items', deliveryDate: '30 Jul 2026' },
  SHIPPING_UPDATE: { orderId: 'ORD-12345', userName: 'Ravi', trackingNumber: 'SHIP-98765', carrier: 'Delhivery', estimatedDate: '30 Jul 2026', status: 'In Transit' },
  REFUND_PROCESSED: { orderId: 'ORD-12345', userName: 'Ravi', refundAmount: '₹1,299', refundMethod: 'Original Payment Method', estimatedDays: '5-7' },
  PROMOTION_EMAIL: { userName: 'Ravi', promoCode: 'THRIFT20', discountPercent: '20', minPurchase: '₹999', expiryDate: '15 Aug 2026', storeName: 'Thrift Store' },
  NEWSLETTER: { userName: 'Ravi', unsubscribeLink: 'https://thriftstore.com/unsubscribe?id=abc', year: '2026' },
};

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'reloom-email-templates';

function seedTemplates(): EmailTemplate[] {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return JSON.parse(existing);

  const now = new Date().toISOString();
  const templates: EmailTemplate[] = [
    { id: crypto.randomUUID(), name: 'Welcome Email', subject: 'Welcome to {{storeName}}, {{userName}}!', body: 'Hi {{userName}},\n\nWelcome to {{storeName}}! We are thrilled to have you on board.\n\nStart exploring our collection today!\n\nCheers,\nThe {{storeName}} Team\n{{supportEmail}}', type: 'WELCOME_EMAIL', isActive: true, createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), name: 'Verify Your Email', subject: 'Verify your email address - {{storeName}}', body: 'Hi {{userName}},\n\nPlease verify your email address by clicking the link below:\n\n{{verificationLink}}\n\nThis link expires in {{expiryHours}} hours.\n\nThanks,\n{{storeName}} Team', type: 'VERIFICATION_EMAIL', isActive: true, createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), name: 'Password Reset', subject: 'Reset your password - {{storeName}}', body: 'Hi {{userName}},\n\nWe received a request to reset your password. Click the link below to reset it:\n\n{{resetLink}}\n\nThis link expires in {{expiryHours}} hour.\n\nIf you did not request this, please ignore this email.\n\nThanks,\n{{storeName}} Team', type: 'PASSWORD_RESET', isActive: true, createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), name: 'Order Confirmation', subject: 'Order confirmed - {{orderId}}', body: 'Hi {{userName}},\n\nYour order {{orderId}} has been confirmed!\n\nOrder Date: {{orderDate}}\nItems: {{items}}\nTotal: {{totalAmount}}\nExpected Delivery: {{deliveryDate}}\n\nThank you for shopping with us!\n\n{{storeName}} Team', type: 'ORDER_CONFIRMATION', isActive: true, createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), name: 'Shipping Update', subject: 'Shipping update for order {{orderId}}', body: 'Hi {{userName}},\n\nYour order {{orderId}} is {{status}}!\n\nTracking Number: {{trackingNumber}}\nCarrier: {{carrier}}\nEstimated Delivery: {{estimatedDate}}\n\nTrack your order for real-time updates.\n\n{{storeName}} Team', type: 'SHIPPING_UPDATE', isActive: true, createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), name: 'Refund Processed', subject: 'Refund processed for order {{orderId}}', body: 'Hi {{userName}},\n\nYour refund of {{refundAmount}} for order {{orderId}} has been processed.\n\nRefund Method: {{refundMethod}}\nExpected to reflect in {{estimatedDays}} business days.\n\nIf you have any questions, please contact support.\n\n{{storeName}} Team', type: 'REFUND_PROCESSED', isActive: true, createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), name: 'Promotional Offer', subject: 'Special offer just for you, {{userName}}!', body: 'Hi {{userName}},\n\nUse code {{promoCode}} to get {{discountPercent}}% off on orders above {{minPurchase}}!\n\nOffer expires on {{expiryDate}}. Don\'t miss out!\n\nShop now at {{storeName}}', type: 'PROMOTION_EMAIL', isActive: true, createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), name: 'Monthly Newsletter', subject: '{{storeName}} Newsletter - {{month}} {{year}}', body: 'Hi {{userName}},\n\nHere\'s what\'s new at {{storeName}} this month...\n\nTo unsubscribe, click here: {{unsubscribeLink}}\n\n© {{year}} {{storeName}}', type: 'NEWSLETTER', isActive: true, createdAt: now, updatedAt: now },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return templates;
}

function renderPreview(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || `{{${key}}}`);
}

type FormData = {
  name: string;
  subject: string;
  body: string;
  type: string;
  isActive: boolean;
};

const EMPTY_FORM: FormData = { name: '', subject: '', body: '', type: 'WELCOME_EMAIL', isActive: true };

export default function EmailTemplatesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ subject: string; body: string }>({ subject: '', body: '' });

  const loadTemplates = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const data = seedTemplates();
      setTemplates(data);
    } catch {
      setError('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/');
      return;
    }
    loadTemplates();
  }, [user, isHydrated, router, loadTemplates]);

  function persistTemplates(updated: EmailTemplate[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setTemplates(updated);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(template: EmailTemplate) {
    setEditingId(template.id);
    setForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
      type: template.type,
      isActive: template.isActive,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function handleSave() {
    setFormError(null);
    if (!form.name.trim()) { setFormError('Template name is required'); return; }
    if (!form.subject.trim()) { setFormError('Subject line is required'); return; }
    if (!form.body.trim()) { setFormError('Email body is required'); return; }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (editingId) {
        const updated = templates.map((t) =>
          t.id === editingId ? { ...t, ...form, updatedAt: now } : t,
        );
        persistTemplates(updated);
      } else {
        const newTemplate: EmailTemplate = {
          id: crypto.randomUUID(),
          ...form,
          createdAt: now,
          updatedAt: now,
        };
        persistTemplates([...templates, newTemplate]);
      }
      closeDialog();
    } catch {
      setFormError('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  function handleToggleActive(template: EmailTemplate) {
    const updated = templates.map((t) =>
      t.id === template.id ? { ...t, isActive: !t.isActive, updatedAt: new Date().toISOString() } : t,
    );
    persistTemplates(updated);
  }

  function openPreview(template: EmailTemplate) {
    const type = template.type;
    const sampleValues = SAMPLE_VALUES[type] || {};
    setPreviewData({
      subject: renderPreview(template.subject, sampleValues),
      body: renderPreview(template.body, sampleValues),
    });
    setPreviewOpen(true);
  }

  const availableVars = VARIABLE_HINTS[form.type] || [];

  if (!isHydrated || loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 flex items-center gap-3">
            <Mail className="h-6 w-6 text-brand-600" />
            Email Templates
          </h1>
          <p className="mt-1 text-sm text-ink-500">{templates.length} templates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTemplates}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="brand" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {templates.length === 0 && !loading ? (
        <div className="rounded-3xl border border-dashed border-ink-200 py-24 text-center">
          <Mail className="mx-auto h-12 w-12 text-ink-300" />
          <p className="mt-4 text-lg font-medium text-ink-800">No templates found</p>
          <p className="mt-1 text-sm text-ink-400">Create your first email template</p>
          <Button variant="brand" size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Template
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/50">
                  <th className="px-4 py-3 font-medium text-ink-600">Name</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Type</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Subject</th>
                  <th className="px-4 py-3 font-medium text-ink-600">Status</th>
                  <th className="w-36 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {templates.map((template) => (
                  <tr key={template.id} className="transition hover:bg-ink-50/50">
                    <td className="px-4 py-3 font-medium text-ink-900">{template.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{TEMPLATE_TYPES.find((t) => t.value === template.type)?.label || template.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-500 max-w-xs truncate">{template.subject}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-all',
                          template.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-ink-100 text-ink-500 hover:bg-ink-200',
                        )}
                        onClick={() => handleToggleActive(template)}
                        role="switch"
                        aria-checked={template.isActive}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleActive(template); }}
                      >
                        {template.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openPreview(template)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(template)}>Edit</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {templates.map((template) => (
              <div key={template.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-ink-900">{template.name}</span>
                      <Badge variant="outline" className="text-[10px]">{TEMPLATE_TYPES.find((t) => t.value === template.type)?.label || template.type}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-500 truncate">{template.subject}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer',
                          template.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-100 text-ink-500',
                        )}
                        onClick={() => handleToggleActive(template)}
                      >
                        {template.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openPreview(template)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(template)}>Edit</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogHeader>{editingId ? 'Edit Template' : 'Create Template'}</DialogHeader>
        <DialogBody className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Template Name</label>
            <Input placeholder="e.g. Welcome Email" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Type</label>
            <Select options={TEMPLATE_TYPES} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Subject Line</label>
            <Input placeholder="e.g. Welcome to {{storeName}}, {{userName}}!" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Email Body</label>
            <Textarea
              placeholder="Write your email template content here..."
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={10}
            />
            {availableVars.length > 0 && (
              <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2">
                <p className="text-xs font-medium text-brand-700 mb-1">Available variables:</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableVars.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="rounded-lg bg-white px-2 py-0.5 text-xs font-mono text-brand-600 border border-brand-200 hover:bg-brand-100 transition"
                      onClick={() => setForm({ ...form, body: form.body + v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-ink-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink-900">Active</p>
              <p className="text-xs text-ink-500">Template will be available for sending</p>
            </div>
            <button
              type="button"
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                form.isActive ? 'bg-emerald-500' : 'bg-ink-200',
              )}
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              role="switch"
              aria-checked={form.isActive}
            >
              <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform', form.isActive ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button variant="brand" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)}>
        <DialogHeader>Preview</DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1">Subject</p>
            <p className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm font-medium text-ink-900">{previewData.subject}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1">Body</p>
            <div className="rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-700 whitespace-pre-wrap leading-relaxed min-h-[120px]">{previewData.body}</div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
