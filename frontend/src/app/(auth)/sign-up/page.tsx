'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    displayName: '',
    referralCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordChecks = [
    { label: 'At least 8 characters', met: form.password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(form.password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(form.password) },
    { label: 'Number', met: /\d/.test(form.password) },
  ];
  const strength = passwordChecks.filter((c) => c.met).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength] || '';
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'][strength] || '';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password)) {
      setError('Password must include uppercase, lowercase, and a number');
      return;
    }

    setLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        username: form.username,
        displayName: form.displayName || undefined,
        referralCode: form.referralCode || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-lift text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-700" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Account created!</h1>
        <p className="mt-2 text-sm text-ink-500">
          Welcome to Reloom. We&apos;ve sent a verification email to <strong className="text-ink-700">{form.email}</strong>.
        </p>
        <div className="mt-6 space-y-2">
          <Link href="/"><Button variant="brand" className="w-full">Browse listings</Button></Link>
          <Link href="/verify-email" className="block text-sm font-medium text-brand-700 hover:underline">
            Resend verification email
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-lift">
      <h1 className="font-display text-2xl font-semibold text-ink-900">Join Reloom</h1>
      <p className="mt-1 text-sm text-ink-500">Buy & sell pre-loved treasures.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">Username</label>
          <Input
            required
            minLength={3}
            maxLength={30}
            pattern="^[a-zA-Z0-9_]+$"
            title="Letters, numbers, and underscores only"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            placeholder="cool_thrifter"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">Display name</label>
          <Input
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">Email</label>
          <Input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@email.com"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">Password</label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Min 8 chars, upper, lower, number"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.password.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : 'bg-ink-200'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-ink-500">Strength: {strengthLabel}</p>
              <ul className="space-y-0.5">
                {passwordChecks.map((check) => (
                  <li
                    key={check.label}
                    className={`flex items-center gap-1.5 text-xs ${check.met ? 'text-emerald-700' : 'text-ink-400'}`}
                  >
                    <span className={`${check.met ? 'text-emerald-500' : 'text-ink-300'}`}>
                      {check.met ? '✓' : '○'}
                    </span>
                    {check.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">Confirm password</label>
          <div className="relative">
            <Input
              type={showConfirm ? 'text' : 'password'}
              required
              minLength={8}
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="Re-enter your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.confirmPassword && form.password !== form.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">
            Referral code <span className="text-ink-400">(optional)</span>
          </label>
          <Input
            value={form.referralCode}
            onChange={(e) => setForm((f) => ({ ...f, referralCode: e.target.value }))}
            placeholder="Friend&apos;s referral code"
          />
        </div>

        <p className="text-xs text-ink-500">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-brand-700 hover:underline">Terms of Service</Link> and{' '}
          <Link href="/privacy" className="text-brand-700 hover:underline">Privacy Policy</Link>.
        </p>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <Button type="submit" variant="brand" className="w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Create account'}
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-ink-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-ink-500">Or sign up with</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="w-full" disabled>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </Button>
          <Button variant="outline" className="w-full" disabled>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#000" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Apple
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
