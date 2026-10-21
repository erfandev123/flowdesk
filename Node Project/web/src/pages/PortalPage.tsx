import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle, CreditCard, Receipt, Lock,
} from '@phosphor-icons/react';
import { api } from '../lib/api';
import { formatMoney, formatDate } from '../lib/format';
import type { Invoice } from '../types';
import { Modal } from '../components/Modal';
import { Spinner } from '../components/Feedback';

interface PortalData {
  client: { name: string; company: string; email: string };
  business: {
    name: string; currency: string; locale: string; brand_color: string;
    accent_color: string; logo_text: string; default_terms: string;
  };
  invoices: Invoice[];
}

export function PortalPage() {
  const { token = '' } = useParams();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState('');
  const [payFor, setPayFor] = useState<Invoice | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('card');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');

  const load = () => {
    api.get<PortalData>(`/portal/${token}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Portal not found'));
  };

  useEffect(load, [token]);

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-canvas px-5">
        <div className="card p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-ink mb-2">Portal unavailable</h1>
          <p className="text-sm text-ink-soft">{error}</p>
        </div>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen grid place-items-center bg-canvas"><Spinner /></div>;

  const { business, client, invoices } = data;
  const currency = business.currency;
  const locale = business.locale;
  const outstanding = invoices.reduce((s, i) => s + (i.total - i.paid_amount), 0);
  const paid = invoices.reduce((s, i) => s + i.paid_amount, 0);

  const openPay = (inv: Invoice) => {
    setPayFor(inv);
    setAmount(((inv.total - inv.paid_amount) / 100).toFixed(2));
    setMethod('card');
    setReference('');
    setSuccess('');
  };

  const submitPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payFor) return;
    setBusy(true);
    try {
      await api.post(`/portal/${token}/pay/${payFor.id}`, {
        amount: Math.round(Number(amount) * 100),
        method,
        reference,
      });
      setSuccess(`Payment of ${formatMoney(Math.round(Number(amount) * 100), currency, locale)} received. Thank you!`);
      setPayFor(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas" style={{ ['--brand' as string]: business.brand_color }}>
      <header className="border-b border-line bg-surface">
        <div className="max-w-3xl mx-auto px-5 py-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl text-white grid place-items-center font-extrabold shrink-0"
            style={{ background: business.brand_color }} aria-hidden="true">
            {(business.logo_text || business.name).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-ink truncate">{business.name}</p>
            <p className="text-xs text-ink-soft truncate">Billing portal</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-7 space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Hello {client.name.split(' ')[0]}</h1>
          <p className="text-sm text-ink-soft mt-1">
            Here are your invoices from {business.name}. Pay online and you are done.
          </p>
        </div>

        {success && (
          <div className="card p-4 border-accent-100 bg-accent-50 flex items-start gap-3">
            <CheckCircle size={20} weight="fill" className="text-accent-600 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-sm text-accent-800 font-medium">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Outstanding</p>
            <p className="text-2xl font-extrabold text-ink num mt-1.5">
              {formatMoney(outstanding, currency, locale)}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Paid to date</p>
            <p className="text-2xl font-extrabold text-accent-700 num mt-1.5">
              {formatMoney(paid, currency, locale)}
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="font-bold text-ink">Invoices</h2>
          {invoices.length === 0 ? (
            <div className="card p-10 text-center text-sm text-ink-soft">No invoices yet.</div>
          ) : invoices.map((inv) => {
            const due = inv.total - inv.paid_amount;
            return (
              <article key={inv.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-lg bg-canvas border border-line grid place-items-center
                        text-ink-soft shrink-0" aria-hidden="true">
                        <Receipt size={17} />
                      </span>
                      <div>
                        <p className="num font-bold text-ink">{inv.number}</p>
                        <p className="text-xs text-ink-soft">
                          Issued {formatDate(inv.issue_date)} · Due {formatDate(inv.due_date)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-ink num">
                      {formatMoney(inv.total, currency, locale)}
                    </p>
                    {inv.paid_amount > 0 && (
                      <p className="text-xs text-accent-700 font-medium">
                        {formatMoney(inv.paid_amount, currency, locale)} paid
                      </p>
                    )}
                  </div>
                </div>

                {(inv.items ?? []).length > 0 && (
                  <ul className="mt-4 pt-4 border-t border-line space-y-2">
                    {(inv.items ?? []).map((it) => (
                      <li key={it.id} className="flex justify-between gap-4 text-sm">
                        <span className="text-ink-soft min-w-0">{it.description}</span>
                        <span className="num text-ink font-medium shrink-0 whitespace-nowrap">
                          {formatMoney(Math.round(it.qty * it.unit_price), currency, locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
                  {due > 0 ? (
                    <>
                      <p className="text-sm text-ink-soft">
                        Balance due <span className="font-bold text-ink num">
                          {formatMoney(due, currency, locale)}
                        </span>
                      </p>
                      <button className="btn btn-primary" onClick={() => openPay(inv)}>
                        <CreditCard size={16} /> Pay now
                      </button>
                    </>
                  ) : (
                    <p className="flex items-center gap-2 text-sm font-semibold text-accent-700">
                      <CheckCircle size={16} weight="fill" /> Paid in full
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {business.default_terms && (
          <section className="card p-5">
            <h2 className="font-bold text-ink mb-2">Payment terms</h2>
            <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-line">
              {business.default_terms}
            </p>
          </section>
        )}

        <p className="flex items-center justify-center gap-2 text-xs text-ink-soft pt-2">
          <Lock size={13} aria-hidden="true" />
          Secure portal powered by {business.name}
        </p>
      </main>

      <Modal
        open={Boolean(payFor)}
        onClose={() => setPayFor(null)}
        title="Pay invoice"
        description={payFor ? `${payFor.number} · ${formatMoney(payFor.total - payFor.paid_amount, currency, locale)} due` : ''}
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setPayFor(null)} type="button">Cancel</button>
            <button className="btn btn-primary" onClick={submitPay} disabled={busy} type="submit">
              {busy ? 'Processing…' : 'Confirm payment'}
            </button>
          </>
        )}
      >
        <form onSubmit={submitPay} className="space-y-4">
          <div>
            <label className="label" htmlFor="payamt">Amount ({currency})</label>
            <input id="payamt" type="number" min="0.01" step="0.01" className="field num" required
              value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="paymethod">Payment method</label>
            <select id="paymethod" className="field" value={method}
              onChange={(e) => setMethod(e.target.value)}>
              <option value="card">Card</option>
              <option value="bank">Bank transfer</option>
              <option value="mobile">Mobile / bKash</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="payref">Reference (optional)</label>
            <input id="payref" className="field" value={reference}
              onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
