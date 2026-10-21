import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Printer, PaperPlaneTilt, CurrencyCircleDollar, BellRinging,
  Copy, Trash, PencilSimple, Check, LinkSimple, Phone, Envelope,
} from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDate, relativeDays } from '../lib/format';
import type { Invoice, LineItem, Payment } from '../types';
import { StatusChip } from '../components/StatusChip';
import { Modal } from '../components/Modal';
import { Spinner, ErrorNote } from '../components/Feedback';

export function InvoiceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { business } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank');
  const [payRef, setPayRef] = useState('');
  const [payNote, setPayNote] = useState('');

  const [remindChannel, setRemindChannel] = useState('email');
  const [remindMessage, setRemindMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const currency = business?.currency || 'USD';
  const locale = business?.locale || 'en-US';

  const load = () => {
    api.get<Invoice>(`/invoices/${id}`)
      .then(setInvoice)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load invoice'));
  };

  useEffect(load, [id]);

  const portalUrl = useMemo(
    () => (invoice?.client ? `${window.location.origin}/portal/${invoice.client.portal_token}` : ''),
    [invoice],
  );

  if (error) return <ErrorNote message={error} />;
  if (!invoice) return <Spinner />;

  const client = invoice.client;
  const outstanding = invoice.total - invoice.paid_amount;
  const items = invoice.items ?? [];
  const paid = invoice.payments ?? [];

  const openPay = () => {
    setPayAmount((outstanding / 100).toFixed(2));
    setPayMethod('bank');
    setPayRef('');
    setPayNote('');
    setPayOpen(true);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/invoices/${invoice.id}/payments`, {
        amount: Math.round(Number(payAmount) * 100),
        method: payMethod,
        reference: payRef,
        note: payNote,
        paid_at: new Date().toISOString(),
      });
      setPayOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record payment');
    } finally {
      setSaving(false);
    }
  };

  const deletePayment = async (pid: string) => {
    if (!window.confirm('Remove this payment record?')) return;
    await api.del(`/payments/${pid}`);
    load();
  };

  const sendInvoice = async () => {
    await api.post(`/invoices/${invoice.id}/send`);
    load();
  };

  const generateReminder = async () => {
    const res = await api.post<{ message: string }>(`/invoices/${invoice.id}/remind`, {
      channel: remindChannel,
      message: remindMessage,
    });
    setRemindMessage(res.message);
  };

  const copyPortal = async () => {
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 print-page">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate('/app/invoices')} className="inline-flex items-center gap-1.5
          text-sm font-medium text-ink-soft hover:text-brand-700 cursor-pointer">
          <ArrowLeft size={16} aria-hidden="true" /> All invoices
        </button>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
          <button className="btn btn-ghost" onClick={() => navigate(`/app/invoices/${invoice.id}/edit`)}>
            <PencilSimple size={16} /> Edit
          </button>
          {invoice.status === 'draft' && (
            <button className="btn btn-accent" onClick={sendInvoice}>
              <PaperPlaneTilt size={16} /> Mark as sent
            </button>
          )}
          <button className="btn btn-primary" onClick={openPay} disabled={outstanding <= 0}>
            <CurrencyCircleDollar size={16} /> Record payment
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] items-start">
        {/* Invoice document */}
        <article className="card p-6 sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b border-line">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-brand-600 text-white grid place-items-center
                  font-extrabold" aria-hidden="true">
                  {(business?.logo_text || 'FD').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-extrabold text-lg text-ink">{business?.name}</p>
                  <p className="text-xs text-ink-soft">{business?.currency} workspace</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">Invoice</p>
              <p className="num text-2xl font-extrabold text-ink">{invoice.number}</p>
              <div className="mt-1.5 flex justify-end">
                <StatusChip status={invoice.status} />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 py-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">Billed to</p>
              <p className="font-bold text-ink">{client?.name}</p>
              {client?.company && <p className="text-sm text-ink-soft">{client.company}</p>}
              {client?.email && <p className="text-sm text-ink-soft break-all">{client.email}</p>}
              {client?.address && <p className="text-sm text-ink-soft mt-1">{client.address}</p>}
            </div>
            <div className="sm:text-right">
              <dl className="space-y-1.5 text-sm">
                <div className="flex sm:justify-end gap-3">
                  <dt className="text-ink-soft">Issued</dt>
                  <dd className="font-medium text-ink min-w-[110px]">{formatDate(invoice.issue_date)}</dd>
                </div>
                <div className="flex sm:justify-end gap-3">
                  <dt className="text-ink-soft">Due</dt>
                  <dd className="font-medium text-ink min-w-[110px]">
                    {formatDate(invoice.due_date)}
                    {invoice.status === 'overdue' && (
                      <span className="block text-xs text-danger-600 font-semibold">
                        {relativeDays(invoice.due_date)}
                      </span>
                    )}
                  </dd>
                </div>
                {invoice.recurring_rule && (
                  <div className="flex sm:justify-end gap-3">
                    <dt className="text-ink-soft">Recurring</dt>
                    <dd className="font-medium text-ink capitalize min-w-[110px]">
                      {invoice.recurring_rule}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Rate</th>
                  <th className="text-right">Tax</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: LineItem) => (
                  <tr key={it.id}>
                    <td className="font-medium text-ink">{it.description}</td>
                    <td className="text-right num text-ink-soft">{it.qty}</td>
                    <td className="text-right num text-ink-soft">
                      {formatMoney(it.unit_price, currency, locale)}
                    </td>
                    <td className="text-right num text-ink-soft">{it.tax_rate}%</td>
                    <td className="text-right num font-semibold text-ink">
                      {formatMoney(Math.round(it.qty * it.unit_price), currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-6">
            <dl className="w-full sm:w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="num font-medium text-ink">{formatMoney(invoice.subtotal, currency, locale)}</dd>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Discount</dt>
                  <dd className="num font-medium text-danger-600">
                    -{formatMoney(invoice.discount, currency, locale)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-soft">Tax</dt>
                <dd className="num font-medium text-ink">{formatMoney(invoice.tax_total, currency, locale)}</dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-line">
                <dt className="font-bold text-ink">Total</dt>
                <dd className="num font-extrabold text-lg text-ink">
                  {formatMoney(invoice.total, currency, locale)}
                </dd>
              </div>
              {invoice.paid_amount > 0 && (
                <div className="flex justify-between text-accent-700">
                  <dt>Paid</dt>
                  <dd className="num font-semibold">
                    -{formatMoney(invoice.paid_amount, currency, locale)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-line">
                <dt className="font-bold text-ink">Balance due</dt>
                <dd className="num font-extrabold text-lg text-brand-700">
                  {formatMoney(outstanding, currency, locale)}
                </dd>
              </div>
            </dl>
          </div>

          {(invoice.notes || invoice.terms) && (
            <div className="mt-8 pt-6 border-t border-line grid sm:grid-cols-2 gap-6 text-sm">
              {invoice.notes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">Notes</p>
                  <p className="text-ink-soft leading-relaxed whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">Terms</p>
                  <p className="text-ink-soft leading-relaxed whitespace-pre-line">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}
        </article>

        {/* Side panel */}
        <div className="space-y-5 no-print">
          <section className="card p-5">
            <h2 className="font-bold text-ink mb-3">Client portal</h2>
            <p className="text-sm text-ink-soft mb-3">
              Share this link so the client can view and pay without an account.
            </p>
            <div className="flex gap-2">
              <input readOnly value={portalUrl} className="field text-xs" aria-label="Portal link" />
              <button className="btn btn-ghost shrink-0 !px-3" onClick={copyPortal}
                aria-label="Copy portal link">
                {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
              </button>
            </div>
            <a href={portalUrl} target="_blank" rel="noreferrer"
              className="btn btn-ghost w-full mt-3">
              <LinkSimple size={16} /> Open portal
            </a>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-ink">Payments</h2>
              <span className="chip bg-accent-50 text-accent-700 border-accent-100">
                {formatMoney(invoice.paid_amount, currency, locale)}
              </span>
            </div>
            {paid.length === 0 ? (
              <p className="text-sm text-ink-soft py-2">No payments recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {paid.map((p: Payment) => (
                  <li key={p.id} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-accent-50 text-accent-700 grid place-items-center shrink-0">
                      <CurrencyCircleDollar size={16} aria-hidden="true" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-ink">
                        {formatMoney(p.amount, currency, locale)}
                      </span>
                      <span className="block text-xs text-ink-soft">
                        {formatDate(p.paid_at)} · {p.method}
                        {p.reference && ` · ${p.reference}`}
                      </span>
                    </span>
                    <button onClick={() => deletePayment(p.id)}
                      className="w-8 h-8 grid place-items-center rounded-lg text-ink-soft hover:bg-danger-50
                        hover:text-danger-600 transition-colors cursor-pointer"
                      aria-label="Delete payment">
                      <Trash size={15} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {outstanding > 0 && (
              <button className="btn btn-primary w-full mt-4" onClick={openPay}>
                <CurrencyCircleDollar size={16} /> Record payment
              </button>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-ink">Reminders</h2>
              <button className="btn btn-ghost !min-h-[36px] !px-2.5 text-xs" onClick={() => setRemindOpen(true)}>
                <BellRinging size={15} /> Send
              </button>
            </div>
            {invoice.reminders && invoice.reminders.length > 0 ? (
              <ul className="space-y-2">
                {invoice.reminders.map((r) => (
                  <li key={r.id} className="text-xs text-ink-soft border-l-2 border-brand-200 pl-3 py-1">
                    <span className="font-semibold text-ink capitalize">{r.channel}</span> ·{' '}
                    {formatDate(r.sent_at)}
                    <p className="mt-1 text-ink-soft line-clamp-3">{r.message}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">No reminders sent yet.</p>
            )}
          </section>

          <section className="card p-5 text-sm space-y-2">
            <p className="font-bold text-ink mb-3">Contact</p>
            {client?.email && (
              <a href={`mailto:${client.email}`}
                className="flex items-center gap-2.5 text-ink-soft hover:text-brand-700 transition-colors">
                <Envelope size={16} aria-hidden="true" /> {client.email}
              </a>
            )}
            {client?.phone && (
              <a href={`tel:${client.phone}`}
                className="flex items-center gap-2.5 text-ink-soft hover:text-brand-700 transition-colors">
                <Phone size={16} aria-hidden="true" /> {client.phone}
              </a>
            )}
          </section>
        </div>
      </div>

      {/* Payment modal */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record a payment"
        description={`Balance due ${formatMoney(outstanding, currency, locale)}`}
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setPayOpen(false)} type="button">Cancel</button>
            <button className="btn btn-primary" onClick={submitPayment} disabled={saving} type="submit">
              {saving ? 'Saving…' : 'Save payment'}
            </button>
          </>
        )}
      >
        <form onSubmit={submitPayment} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pamt">Amount ({business?.currency})</label>
            <input id="pamt" className="field num" type="number" step="0.01" min="0.01"
              value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="pmethod">Method</label>
            <select id="pmethod" className="field" value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}>
              <option value="bank">Bank transfer</option>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
              <option value="mobile">Mobile / bKash</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="pref">Reference</label>
            <input id="pref" className="field" value={payRef}
              onChange={(e) => setPayRef(e.target.value)} placeholder="Transaction ID or cheque no." />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="pnote">Note</label>
            <input id="pnote" className="field" value={payNote}
              onChange={(e) => setPayNote(e.target.value)} placeholder="Optional" />
          </div>
        </form>
      </Modal>

      {/* Reminder modal */}
      <Modal
        open={remindOpen}
        onClose={() => setRemindOpen(false)}
        title="Send a payment reminder"
        description="The message is pre-filled from your template. Copy and send it from any app."
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setRemindOpen(false)} type="button">Close</button>
            <button className="btn btn-primary" onClick={generateReminder} type="button">
              Generate &amp; log
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            {['email', 'whatsapp', 'sms'].map((c) => (
              <button
                key={c}
                onClick={() => { setRemindChannel(c); setRemindMessage(''); }}
                className={`btn ${remindChannel === c ? 'btn-primary' : 'btn-ghost'} capitalize flex-1`}
                type="button"
              >
                {c}
              </button>
            ))}
          </div>
          <div>
            <label className="label" htmlFor="rmsg">Message</label>
            <textarea
              id="rmsg"
              className="field min-h-[170px] text-sm leading-relaxed"
              value={remindMessage}
              onChange={(e) => setRemindMessage(e.target.value)}
              placeholder="Click Generate to build the message from your template."
            />
          </div>
          {remindMessage && (
            <button
              className="btn btn-ghost w-full"
              type="button"
              onClick={() => navigator.clipboard.writeText(remindMessage)}
            >
              <Copy size={16} /> Copy message
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
