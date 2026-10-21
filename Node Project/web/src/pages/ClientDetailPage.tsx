import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Copy, ArrowSquareOut, Receipt, FileText, Users, Check,
} from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDate, relativeDays } from '../lib/format';
import type { Client, Invoice, Quote } from '../types';
import { StatusChip } from '../components/StatusChip';
import { Spinner, ErrorNote } from '../components/Feedback';

export function ClientDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { business } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const currency = business?.currency || 'USD';
  const locale = business?.locale || 'en-US';

  useEffect(() => {
    api.get<{ client: Client; invoices: Invoice[]; quotes: Quote[] }>(`/clients/${id}`)
      .then((res) => {
        setClient(res.client);
        setInvoices(res.invoices);
        setQuotes(res.quotes);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load client'));
  }, [id]);

  if (error) return <ErrorNote message={error} />;
  if (!client) return <Spinner />;

  const portalUrl = `${window.location.origin}/portal/${client.portal_token}`;
  const outstanding = invoices
    .filter((i) => !['draft', 'paid', 'cancelled'].includes(i.status))
    .reduce((s, i) => s + (i.total - i.paid_amount), 0);
  const lifetime = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);

  const copyPortal = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Copy the client portal link:', portalUrl);
    }
  };

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/app/clients')} className="inline-flex items-center gap-1.5
        text-sm font-medium text-ink-soft hover:text-brand-700 cursor-pointer">
        <ArrowLeft size={16} aria-hidden="true" /> All clients
      </button>

      <header className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white grid place-items-center
            text-lg font-extrabold shrink-0" aria-hidden="true">
            {client.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-ink">{client.name}</h1>
            <p className="text-sm text-ink-soft mt-0.5">{client.company || 'Individual client'}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 mt-4 text-sm">
              {client.email && (
                <a href={`mailto:${client.email}`} className="text-brand-700 hover:underline break-all">
                  {client.email}
                </a>
              )}
              {client.phone && <span className="text-ink-soft">{client.phone}</span>}
              {client.address && <span className="text-ink-soft">{client.address}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <button className="btn btn-ghost" onClick={copyPortal}>
              {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
              {copied ? 'Link copied' : 'Copy portal link'}
            </button>
            <a className="btn btn-primary" href={portalUrl} target="_blank" rel="noreferrer">
              <ArrowSquareOut size={16} /> Open portal
            </a>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-line">
          <div>
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Outstanding</p>
            <p className="text-lg font-extrabold text-ink num mt-1">
              {formatMoney(outstanding, currency, locale)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Lifetime value</p>
            <p className="text-lg font-extrabold text-ink num mt-1">
              {formatMoney(lifetime, currency, locale)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Since</p>
            <p className="text-lg font-extrabold text-ink mt-1">{formatDate(client.created_at)}</p>
          </div>
        </div>
      </header>

      {client.notes && (
        <div className="card p-5">
          <h2 className="font-bold text-ink mb-2">Notes</h2>
          <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-line">{client.notes}</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="p-5 border-b border-line flex items-center gap-2">
            <Receipt size={17} className="text-brand-500" aria-hidden="true" />
            <h2 className="font-bold text-ink">Invoices ({invoices.length})</h2>
          </div>
          {invoices.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-soft">No invoices yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Status</th>
                    <th>Due</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <Link to={`/app/invoices/${i.id}`} className="num font-semibold text-brand-700 hover:text-brand-800">
                          {i.number}
                        </Link>
                      </td>
                      <td><StatusChip status={i.status} /></td>
                      <td className="text-xs text-ink-soft whitespace-nowrap">
                        {i.status === 'paid' && i.paid_at
                          ? `Paid ${i.paid_at.slice(0, 10)}`
                          : relativeDays(i.due_date)}
                      </td>
                      <td className="text-right num font-semibold text-ink">
                        {formatMoney(i.total, currency, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="p-5 border-b border-line flex items-center gap-2">
            <FileText size={17} className="text-brand-500" aria-hidden="true" />
            <h2 className="font-bold text-ink">Quotes ({quotes.length})</h2>
          </div>
          {quotes.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-soft">No quotes yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Status</th>
                    <th>Valid until</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((qt) => (
                    <tr key={qt.id}>
                      <td className="num font-semibold text-ink">{qt.number}</td>
                      <td><StatusChip status={qt.status} /></td>
                      <td className="text-xs text-ink-soft">{formatDate(qt.valid_until)}</td>
                      <td className="text-right num font-semibold text-ink">
                        {formatMoney(qt.total, currency, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="card p-5 flex flex-wrap gap-3">
        <Link to="/app/invoices/new" className="btn btn-primary">
          <Receipt size={16} /> New invoice
        </Link>
        <Link to="/app/quotes" className="btn btn-ghost">
          <FileText size={16} /> New quote
        </Link>
        <Link to="/app/clients" className="btn btn-ghost">
          <Users size={16} /> All clients
        </Link>
      </div>
    </div>
  );
}
