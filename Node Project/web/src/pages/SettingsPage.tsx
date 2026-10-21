import { useEffect, useState } from 'react';
import { FloppyDisk, PaintBrush, BellRinging, Buildings } from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Business } from '../types';
import { ErrorNote } from '../components/Feedback';

const currencies = ['USD', 'EUR', 'GBP', 'BDT', 'INR', 'PKR', 'AED', 'SGD', 'AUD', 'CAD'];

export function SettingsPage() {
  const { business, businesses, refreshBusiness } = useAuth();
  const [form, setForm] = useState<Partial<Business>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (business) setForm({ ...business });
  }, [business]);

  const set = <K extends keyof Business>(key: K, value: Business[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.business.update(form);
      await refreshBusiness();
      setMessage('Settings saved.');
      window.setTimeout(() => setMessage(''), 2600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl sm:text-[1.75rem] font-extrabold text-ink">Settings</h1>
        <p className="text-sm text-ink-soft mt-1">
          Branding, invoicing defaults and the reminder template your clients receive.
        </p>
      </header>

      {error && <ErrorNote message={error} />}
      {message && (
        <div className="rounded-xl border border-accent-100 bg-accent-50 px-4 py-3 text-sm text-accent-800">
          {message}
        </div>
      )}

      <form onSubmit={save} className="space-y-5">
        <section className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Buildings size={18} className="text-brand-500" aria-hidden="true" />
            <h2 className="font-bold text-ink">Business</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="bname">Business name</label>
              <input id="bname" className="field" value={form.name ?? ''}
                onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="bcurr">Currency</label>
              <select id="bcurr" className="field" value={form.currency ?? 'USD'}
                onChange={(e) => set('currency', e.target.value)}>
                {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="bloc">Locale</label>
              <select id="bloc" className="field" value={form.locale ?? 'en-US'}
                onChange={(e) => set('locale', e.target.value)}>
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="en-IN">English (India)</option>
                <option value="bn-BD">বাংলা (Bangladesh)</option>
                <option value="ar-AE">العربية (UAE)</option>
                <option value="de-DE">Deutsch</option>
                <option value="es-ES">Español</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="blogo">Logo initials</label>
              <input id="blogo" className="field" maxLength={3} value={form.logo_text ?? ''}
                onChange={(e) => set('logo_text', e.target.value.toUpperCase())}
                placeholder="NS" />
            </div>
            <div>
              <label className="label" htmlFor="btax">Default tax rate (%)</label>
              <input id="btax" type="number" min="0" step="0.1" className="field num"
                value={form.default_tax ?? 0}
                onChange={(e) => set('default_tax', Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="bip">Invoice prefix</label>
              <input id="bip" className="field" value={form.invoice_prefix ?? 'INV'}
                onChange={(e) => set('invoice_prefix', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="bqp">Quote prefix</label>
              <input id="bqp" className="field" value={form.quote_prefix ?? 'QUO'}
                onChange={(e) => set('quote_prefix', e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PaintBrush size={18} className="text-brand-500" aria-hidden="true" />
            <h2 className="font-bold text-ink">Brand colors</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="bbrand">Primary color</label>
              <div className="flex gap-2">
                <input id="bbrand" type="color" value={form.brand_color ?? '#1E3A5F'}
                  onChange={(e) => set('brand_color', e.target.value)}
                  className="w-12 h-11 rounded-lg border border-line cursor-pointer bg-surface p-1" />
                <input className="field flex-1" value={form.brand_color ?? '#1E3A5F'}
                  onChange={(e) => set('brand_color', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="bacc">Accent color</label>
              <div className="flex gap-2">
                <input id="bacc" type="color" value={form.accent_color ?? '#059669'}
                  onChange={(e) => set('accent_color', e.target.value)}
                  className="w-12 h-11 rounded-lg border border-line cursor-pointer bg-surface p-1" />
                <input className="field flex-1" value={form.accent_color ?? '#059669'}
                  onChange={(e) => set('accent_color', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-line p-4 bg-canvas">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-3">Preview</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-4 py-2 rounded-lg text-white font-semibold text-sm"
                style={{ background: form.brand_color ?? '#1E3A5F' }}>
                Primary button
              </span>
              <span className="px-4 py-2 rounded-lg text-white font-semibold text-sm"
                style={{ background: form.accent_color ?? '#059669' }}>
                Paid
              </span>
              <span className="px-4 py-2 rounded-lg border font-semibold text-sm"
                style={{ borderColor: form.brand_color ?? '#1E3A5F', color: form.brand_color ?? '#1E3A5F' }}>
                Outline
              </span>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BellRinging size={18} className="text-brand-500" aria-hidden="true" />
            <h2 className="font-bold text-ink">Payment reminders</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="bterms">Default payment terms</label>
              <textarea id="bterms" className="field min-h-[80px]" value={form.default_terms ?? ''}
                onChange={(e) => set('default_terms', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="btpl">Reminder template</label>
              <textarea id="btpl" className="field min-h-[150px] font-mono text-xs leading-relaxed"
                value={form.reminder_template ?? ''}
                onChange={(e) => set('reminder_template', e.target.value)} />
              <p className="text-xs text-ink-soft mt-2">
                Placeholders: <code className="font-mono text-brand-700">{'{{client}}'}</code>,{' '}
                <code className="font-mono text-brand-700">{'{{number}}'}</code>,{' '}
                <code className="font-mono text-brand-700">{'{{amount}}'}</code>,{' '}
                <code className="font-mono text-brand-700">{'{{due}}'}</code>,{' '}
                <code className="font-mono text-brand-700">{'{{link}}'}</code>,{' '}
                <code className="font-mono text-brand-700">{'{{business}}'}</code>
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <FloppyDisk size={17} /> {saving ? 'Saving…' : 'Save settings'}
          </button>
          <p className="text-sm text-ink-soft">
            {businesses.length > 1
              ? `You manage ${businesses.length} workspaces. Use the sidebar switcher to change.`
              : 'You can invite a teammate from the workspace switcher.'}
          </p>
        </div>
      </form>
    </div>
  );
}
