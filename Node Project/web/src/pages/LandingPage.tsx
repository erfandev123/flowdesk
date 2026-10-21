import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Lightning, ShieldCheck, Receipt, Users, Wallet,
  ArrowRight, Check, Star, Globe, DeviceMobile, Lock, Copy,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: Wallet,
    title: 'Cashflow you can trust',
    text: 'Collected, outstanding and overdue on one screen, updated the moment you record a payment.',
  },
  {
    icon: Receipt,
    title: 'Quote to invoice in one click',
    text: 'Accept a quote and it becomes a numbered invoice with its line items and tax already applied.',
  },
  {
    icon: Lightning,
    title: 'Chase without the awkwardness',
    text: 'Prefilled email, SMS and WhatsApp reminders with your tone, your amounts and your payment link.',
  },
  {
    icon: ShieldCheck,
    title: 'Client portal that converts',
    text: 'A private link where clients review every invoice and pay by card or bank, no account needed.',
  },
  {
    icon: Users,
    title: 'A real client book',
    text: 'Contact details, lifetime value, outstanding balance and full history on every single client.',
  },
  {
    icon: Globe,
    title: 'Built for your market',
    text: 'Multi-currency from day one, plus English, বাংলা and Arabic locales so your clients read it natively.',
  },
];

const audience = [
  { title: 'Freelancers & consultants', text: 'Look professional on the first invoice and get paid without a follow-up call.' },
  { title: 'Agencies & studios', text: 'Quote pipeline, retainers and per-client portals across a whole roster.' },
  { title: 'Local service businesses', text: 'Salons, clinics, tutors, coaches — send a bill that is easy to pay from a phone.' },
  { title: 'Developers & SaaS founders', text: 'A clean white-label billing layer you can ship to your own customers.' },
];

const faqs = [
  {
    q: 'Do my clients need an account?',
    a: 'No. Each client gets a private portal link. They open it, see their invoices and pay — card, bank or mobile. No signup, no password.',
  },
  {
    q: 'Can I rebrand it for my own clients?',
    a: 'Yes. Logo initials, primary and accent colors, currency, invoice numbering and payment terms are all configurable per workspace.',
  },
  {
    q: 'What happens to my data if I stop paying?',
    a: 'You keep read access to every invoice and client forever. Export any time as CSV. We never hold your data hostage.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'No app needed. The whole workspace is responsive, so the dashboard, invoice editor and client portal all work perfectly on a phone.',
  },
];

export function LandingPage() {
  const { user, loading } = useAuth();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      window.location.replace('/app');
    }
  }, [user, loading]);

  const copyEmail = async () => {
    await navigator.clipboard.writeText('hello@flowdesk.app');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white grid place-items-center
              font-extrabold text-sm" aria-hidden="true">FD</div>
            <span className="font-extrabold text-lg tracking-tight">Flowdesk</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-soft">
            <a href="#features" className="hover:text-brand-700 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-brand-700 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-brand-700 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn btn-ghost !min-h-[38px]">Sign in</Link>
            <Link to="/login?mode=register" className="btn btn-primary !min-h-[38px]">Start free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 25%, #1E3A5F 1.5px, transparent 1.5px), radial-gradient(circle at 85% 65%, #1E3A5F 1.5px, transparent 1.5px)',
            backgroundSize: '52px 52px',
          }}
          aria-hidden="true"
        />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-14 sm:pb-20">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-2 chip bg-accent-50 text-accent-700 border-accent-100">
                <Star size={13} weight="fill" aria-hidden="true" />
                Free while you build your client base
              </span>
              <h1 className="mt-5 text-[2.6rem] leading-[1.08] sm:text-6xl font-extrabold tracking-tight text-ink">
                Get paid faster.
                <span className="block text-brand-600">Look professional doing it.</span>
              </h1>
              <p className="mt-6 text-lg text-ink-soft leading-relaxed max-w-xl">
                Flowdesk gives freelancers, agencies and local businesses one calm place for
                clients, quotes, invoices and payments — including a private link where clients
                pay online without ever creating an account.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/login?mode=register" className="btn btn-primary !min-h-[48px] !px-6">
                  Start free — no card <ArrowRight size={17} weight="bold" aria-hidden="true" />
                </Link>
                <a href="#features" className="btn btn-ghost !min-h-[48px] !px-6">
                  See what it does
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-ink-soft">
                {['Set up in 5 minutes', 'Your brand, your currency', 'Cancel anytime'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check size={15} weight="bold" className="text-accent-600" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Preview card */}
            <div className="relative">
              <div className="card p-6 shadow-pop relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-brand-600 text-white grid place-items-center
                      text-xs font-bold" aria-hidden="true">NS</div>
                    <div>
                      <p className="font-bold text-sm text-ink leading-tight">Northlight Studio</p>
                      <p className="text-xs text-ink-soft">USD workspace</p>
                    </div>
                  </div>
                  <span className="chip bg-accent-50 text-accent-700 border-accent-100">Paid</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl bg-canvas border border-line p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Collected</p>
                    <p className="text-xl font-extrabold text-ink num mt-1">$4,177.25</p>
                  </div>
                  <div className="rounded-xl bg-danger-50 border border-danger-100 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-danger-700">Overdue</p>
                    <p className="text-xl font-extrabold text-danger-700 num mt-1">$2,983.75</p>
                  </div>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="font-bold text-ink">Invoice INV-1350</span>
                    <span className="chip bg-danger-50 text-danger-700 border-danger-100">33d late</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      ['Brand Identity Sprint', '$2,400.00'],
                      ['Website Design', '$1,800.00'],
                      ['Frontend Build', '$3,200.00'],
                    ].map(([label, amount]) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-ink-soft truncate">{label}</span>
                        <span className="num font-medium text-ink">{amount}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-line flex justify-between items-center">
                    <span className="text-xs font-semibold text-ink-soft">Balance due</span>
                    <span className="num font-extrabold text-brand-700 text-lg">$1,030.75</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-50 border border-brand-100 px-3.5 py-3">
                  <DeviceMobile size={17} className="text-brand-600 shrink-0" aria-hidden="true" />
                  <p className="text-xs text-brand-800 leading-relaxed">
                    Your client opens a link on their phone and pays in under a minute.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 bg-surface border-y border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
              Everything between “let's work together” and “money in the bank”
            </h2>
            <p className="mt-4 text-lg text-ink-soft leading-relaxed">
              No spreadsheet juggling. No awkward payment chases. One system that remembers
              who owes what, since when, and how to ask for it politely.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl border border-line bg-canvas/50 p-6
                  transition-all duration-200 hover:border-brand-200 hover:bg-canvas hover:-translate-y-0.5">
                  <span className="w-11 h-11 rounded-xl bg-brand-600 text-white grid place-items-center">
                    <Icon size={21} weight="fill" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-bold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm text-ink-soft leading-relaxed">{f.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Audience */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16 items-start">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
                Built for people who bill for their time
              </h2>
              <p className="mt-4 text-lg text-ink-soft leading-relaxed">
                Flowdesk was designed around a real problem: small businesses lose money not
                because clients refuse to pay, but because chasing them is painful, so they
                never chase.
              </p>
              <div className="mt-7 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5">
                <button
                  onClick={copyEmail}
                  className="font-semibold text-brand-700 hover:underline cursor-pointer bg-transparent border-0 p-0 text-sm"
                >
                  hello@flowdesk.app
                </button>
                {copied ? <Check size={16} className="text-accent-600" aria-hidden="true" />
                  : <Copy size={16} className="text-ink-soft" aria-hidden="true" />}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {audience.map((a) => (
                <div key={a.title} className="card p-5">
                  <h3 className="font-bold text-ink">{a.title}</h3>
                  <p className="mt-2 text-sm text-ink-soft leading-relaxed">{a.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-24 bg-surface border-y border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
              Simple pricing that scales with your client list
            </h2>
            <p className="mt-4 text-lg text-ink-soft">
              Start free. Upgrade when Flowdesk is paying for itself.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3 items-start">
            {[
              {
                name: 'Starter',
                price: 'Free',
                note: 'For your first few clients',
                features: ['Up to 5 clients', 'Unlimited invoices', '1 client portal link', 'CSV export', 'Email reminders'],
                cta: 'Start free',
                highlight: false,
              },
              {
                name: 'Professional',
                price: '$19',
                note: 'per month, per workspace',
                features: ['Unlimited clients', 'Full brand control', 'WhatsApp + SMS reminders', 'Recurring billing', 'Cashflow & velocity reports', 'Print-ready invoices', 'Priority support'],
                cta: 'Choose Professional',
                highlight: true,
              },
              {
                name: 'Studio',
                price: '$49',
                note: 'per month, per workspace',
                features: ['Everything in Professional', 'Multiple workspaces', 'Team member roles', 'White-label portal', 'Custom invoice templates', 'Priority migration help'],
                cta: 'Choose Studio',
                highlight: false,
              },
            ].map((plan) => (
              <div key={plan.name}
                className={`rounded-2xl p-7 relative ${plan.highlight
                  ? 'bg-brand-600 text-white shadow-pop lg:-translate-y-3'
                  : 'bg-canvas border border-line text-ink'}`}>
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 chip bg-accent-500
                    text-white border-accent-500">Most popular</span>
                )}
                <h3 className={`font-bold text-lg ${plan.highlight ? 'text-white' : 'text-ink'}`}>
                  {plan.name}
                </h3>
                <p className={`mt-1 text-sm ${plan.highlight ? 'text-brand-200' : 'text-ink-soft'}`}>
                  {plan.note}
                </p>
                <p className="mt-5 flex items-baseline gap-1.5">
                  <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-ink'}`}>
                    {plan.price}
                  </span>
                </p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2.5 text-sm ${plan.highlight ? 'text-brand-100' : 'text-ink-soft'}`}>
                      <Check size={16} weight="bold"
                        className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-accent-300' : 'text-accent-600'}`}
                        aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/login"
                  className={`btn w-full mt-7 ${plan.highlight ? 'btn-accent' : 'btn-primary'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-ink-soft">
            Also available as a one-time white-label license for agencies and software companies.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink text-center">
            Questions people actually ask
          </h2>
          <div className="mt-10 space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="card p-5 group">
                <summary className="font-bold text-ink cursor-pointer list-none flex items-center
                  justify-between gap-4">
                  {f.q}
                  <span className="text-ink-soft text-xl leading-none group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-ink-soft leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="rounded-3xl bg-brand-900 text-white px-6 sm:px-14 py-14 text-center relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: 'radial-gradient(circle at 25% 30%, #fff 1.5px, transparent 1.5px)',
                backgroundSize: '44px 44px',
              }}
              aria-hidden="true"
            />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Send your next invoice today
              </h2>
              <p className="mt-4 text-brand-200 max-w-lg mx-auto leading-relaxed">
                Set up your workspace in five minutes. Import a client list, send your first
                invoice, and let Flowdesk handle the chasing.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/login?mode=register" className="btn btn-accent !min-h-[48px] !px-7">
                  Create your workspace <ArrowRight size={17} weight="bold" aria-hidden="true" />
                </Link>
                <Link to="/login" className="btn !min-h-[48px] !px-7 bg-white/10 text-white
                  border-white/20 hover:bg-white/15">
                  Try the demo
                </Link>
              </div>
              <p className="mt-6 flex items-center justify-center gap-2 text-xs text-brand-400">
                <Lock size={13} aria-hidden="true" />
                Export everything as CSV, any time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-8">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center
          justify-between gap-3 text-sm text-ink-soft">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center
              font-extrabold text-xs" aria-hidden="true">FD</div>
            <span className="font-bold text-ink">Flowdesk</span>
          </div>
          <p>© {new Date().getFullYear()} Flowdesk. Client &amp; cashflow workspace.</p>
        </div>
      </footer>
    </div>
  );
}
