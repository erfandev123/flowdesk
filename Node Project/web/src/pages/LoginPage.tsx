import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChartPieSlice, CheckCircle, TrendUp, ShieldCheck, Lightning,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';

const highlights = [
  { icon: TrendUp, title: 'Cashflow you can trust', text: 'Revenue, aging and overdue tracking in one dashboard.' },
  { icon: CheckCircle, title: 'Quotes to invoice', text: 'Accept a quote and it becomes a numbered invoice in one click.' },
  { icon: Lightning, title: 'Chase faster', text: 'Prefilled email, SMS and WhatsApp reminders for every overdue invoice.' },
  { icon: ShieldCheck, title: 'Client portal', text: 'A private link where clients review and pay without logging in.' },
];

export function LoginPage() {
  const { user, login, register, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>(
    () => (new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login'),
  );
  const [form, setForm] = useState({
    name: '', email: '', password: '', business_name: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/app', { replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          business_name: form.business_name || `${form.name}'s Studio`,
        });
      }      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-brand-900 text-white p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 60%, #fff 1px, transparent 1px)',
            backgroundSize: '46px 46px',
          }}
          aria-hidden="true"
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white text-brand-900 grid place-items-center font-extrabold">
              FD
            </div>
            <span className="text-xl font-bold tracking-tight">Flowdesk</span>
          </div>
          <h1 className="mt-14 text-4xl xl:text-[2.75rem] font-extrabold leading-[1.12] tracking-tight max-w-lg">
            Every client, quote and invoice in one calm workspace.
          </h1>
          <p className="mt-5 text-brand-200 text-[15px] leading-relaxed max-w-md">
            Built for studios, agencies and independent consultants who are tired of
            chasing invoices in spreadsheets and WhatsApp threads.
          </p>
          <ul className="mt-10 space-y-4 max-w-md">
            {highlights.map((h) => {
              const Icon = h.icon;
              return (
                <li key={h.title} className="flex gap-3.5">
                  <span className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 grid place-items-center shrink-0">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-semibold text-sm">{h.title}</span>
                    <span className="block text-brand-300 text-[13px] leading-relaxed">{h.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-brand-400 text-xs">
          © {new Date().getFullYear()} Flowdesk — client &amp; cashflow workspace.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-5 py-10 sm:px-8 bg-canvas min-h-screen lg:min-h-0">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white grid place-items-center font-extrabold text-sm">
              FD
            </div>
            <span className="text-lg font-bold">Flowdesk</span>
          </div>

          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-ink">
              {mode === 'login' ? 'Welcome back' : 'Create your workspace'}
            </h2>
            <p className="text-sm text-ink-soft mt-1.5 mb-6">
              {mode === 'login'
                ? 'Sign in to manage your clients and cashflow.'
                : 'Start free. No card required, full feature access.'}
            </p>

            <form onSubmit={submit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="label" htmlFor="name">Your name</label>
                    <input id="name" className="field" value={form.name}
                      onChange={set('name')} placeholder="Ava Bennett" autoComplete="name" required />
                  </div>
                  <div>
                    <label className="label" htmlFor="biz">Business name</label>
                    <input id="biz" className="field" value={form.business_name}
                      onChange={set('business_name')} placeholder="Ava Bennett Studio"
                      autoComplete="organization" />
                  </div>
                </>
              )}

              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" className="field" type="email" value={form.email}
                  onChange={set('email')} placeholder="you@studio.com" autoComplete="email" required />
              </div>

              <div>
                <label className="label" htmlFor="password">Password</label>
                <input id="password" className="field" type="password" value={form.password}
                  onChange={set('password')} placeholder="••••••••" autoComplete="current-password"
                  minLength={8} required />
                {mode === 'register' && (
                  <p className="text-xs text-ink-soft mt-1.5">At least 8 characters.</p>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-danger-100 bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create workspace'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-line text-center">
              <p className="text-sm text-ink-soft">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                <button
                  type="button"
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                  className="ml-1.5 font-semibold text-brand-700 hover:text-brand-800 underline underline-offset-2 cursor-pointer"
                >
                  {mode === 'login' ? 'Create one' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2.5 px-2">
            <ChartPieSlice size={16} className="text-brand-500 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-xs text-ink-soft leading-relaxed">
              Demo account available: <span className="font-semibold text-ink">demo@flowdesk.app</span> / demo1234
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
