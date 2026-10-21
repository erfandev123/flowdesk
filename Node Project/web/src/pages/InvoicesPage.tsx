import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Receipt, Plus, MagnifyingGlass, DownloadSimple,
} from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, relativeDays } from '../lib/format';
import type { Invoice, InvoiceStatus } from '../types';
import { StatusChip, OverdueBadge } from '../components/StatusChip';
import { EmptyState, Spinner, ErrorNote } from '../components/Feedback';

const filters: { key: '' | InvoiceStatus; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'partial', label: 'Partial' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
];

export function InvoicesPage() {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [status, setStatus] = useState<'' | InvoiceStatus>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currency = business?.currency || 'USD';
  const locale = business?.locale || 'en-US';

  const load = () => {
    setLoading(true);
    api.get<Invoice[]>(`/invoices?status=${status}&search=${encodeURIComponent(search)}`)
      .then(setInvoices)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load invoices'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, search]);

  const totals = invoices.reduce(
    (acc, i) => ({
      total: acc.total + i.total,
      outstanding: acc.outstanding + (i.total - i.paid_amount),
    }),
    { total: 0, outstanding: 0 },
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[1.75rem] font-extrabold text-ink">Invoices</h1>
          <p className="text-sm text-ink-soft mt-1">
            {invoices.length} shown · {formatMoney(totals.outstanding, currency, locale)} outstanding
          </p>
        </div>
        <div className="flex gap-2">
          <a className="btn btn-ghost" href="/api/export/invoices.csv" download>
            <DownloadSimple size={16} /> Export CSV
          </a>
          <button className="btn btn-primary" onClick={() => navigate('/app/invoices/new')}>
            <Plus size={17} weight="bold" aria-hidden="true" /> New invoice
          </button>
        </div>
      </header>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2
            text-ink-soft pointer-events-none" aria-hidden="true" />
          <input
            className="field pl-10"
            placeholder="Search invoice number, client or company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search invoices"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-thin">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`btn ${status === f.key ? 'btn-primary' : 'btn-ghost'} !min-h-[42px] shrink-0`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorNote message={error} />}
      {loading ? (
        <Spinner />
      ) : invoices.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Receipt size={24} />}
            title="No invoices found"
            description={search || status
              ? 'Try clearing the filters or changing your search.'
              : 'Create your first invoice and send it straight to your client portal.'}
            action={(
              <button className="btn btn-primary" onClick={() => navigate('/app/invoices/new')}>
                <Plus size={16} weight="bold" aria-hidden="true" /> New invoice
              </button>
            )}
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Issued</th>
                    <th>Due</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => {
                    const overdueDays = Math.round(
                      (Date.now() - new Date(`${i.due_date}T00:00:00`).getTime()) / 86400000,
                    );
                    return (
                      <tr key={i.id}>
                        <td>
                          <Link to={`/app/invoices/${i.id}`}
                            className="num font-semibold text-brand-700 hover:text-brand-800">
                            {i.number}
                          </Link>
                        </td>
                        <td>
                          <span className="block font-medium text-ink truncate max-w-[220px]">{i.client_name}</span>
                          <span className="block text-xs text-ink-soft truncate max-w-[220px]">
                            {i.client_company}
                          </span>
                        </td>
                        <td><StatusChip status={i.status} /></td>
                        <td className="text-xs text-ink-soft">{i.issue_date}</td>
                        <td>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-ink-soft whitespace-nowrap">
                              {i.status === 'paid' && i.paid_at
                                ? `Paid ${i.paid_at.slice(0, 10)}`
                                : relativeDays(i.due_date)}
                            </span>
                            {i.status === 'overdue' && <OverdueBadge days={overdueDays} />}
                          </div>
                        </td>
                        <td className="text-right num font-semibold text-ink">
                          {formatMoney(i.total, currency, locale)}
                        </td>
                        <td className="text-right num">
                          <span className={(i.total - i.paid_amount) > 0 ? 'text-danger-600 font-medium' : 'text-ink-soft'}>
                            {formatMoney(i.total - i.paid_amount, currency, locale)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {invoices.map((i) => (
              <Link key={i.id} to={`/app/invoices/${i.id}`} className="card p-4 block">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="num font-bold text-brand-700">{i.number}</p>
                    <p className="text-sm font-medium text-ink truncate mt-0.5">{i.client_name}</p>
                    <p className="text-xs text-ink-soft">{i.client_company}</p>
                  </div>
                  <StatusChip status={i.status} />
                </div>
                <div className="flex items-end justify-between mt-3 pt-3 border-t border-line">
                  <span className="text-xs text-ink-soft">
                    {i.status === 'paid' && i.paid_at
                      ? `Paid ${i.paid_at.slice(0, 10)}`
                      : relativeDays(i.due_date)}
                  </span>
                  <span className="num font-extrabold text-ink">
                    {formatMoney(i.total, currency, locale)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
