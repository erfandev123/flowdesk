import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendUp, Wallet, Warning, Users, Plus, Receipt, ArrowRight, Bank, ChartBar,
} from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatCompact, formatMonth, formatDate, relativeDays } from '../lib/format';
import type { DashboardData } from '../types';
import { StatusChip, OverdueBadge } from '../components/StatusChip';
import { RevenueChart, CategoryBars } from '../components/Charts';
import { Spinner, ErrorNote } from '../components/Feedback';

export function DashboardPage() {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<DashboardData>('/dashboard')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dashboard'));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Spinner label="Crunching your numbers" />;

  const currency = business?.currency || 'USD';
  const locale = business?.locale || 'en-US';

  const stats = [
    {
      label: 'Collected this month',
      value: formatMoney(data.revenueThisMonth, currency, locale),
      hint: 'Paid invoices, current month',
      icon: TrendUp,
      tone: 'bg-accent-50 text-accent-700 border-accent-100',
    },
    {
      label: 'Outstanding',
      value: formatMoney(data.outstanding, currency, locale),
      hint: 'Invoiced but not yet received',
      icon: Wallet,
      tone: 'bg-info-50 text-info-700 border-info-100',
    },
    {
      label: 'Overdue',
      value: formatMoney(data.overdue, currency, locale),
      hint: 'Past due — chase these today',
      icon: Warning,
      tone: data.overdue > 0
        ? 'bg-danger-50 text-danger-700 border-danger-100'
        : 'bg-canvas text-ink-soft border-line',
    },
    {
      label: 'Net this month',
      value: formatMoney(data.netThisMonth, currency, locale),
      hint: 'Collected minus expenses',
      icon: Bank,
      tone: 'bg-brand-50 text-brand-700 border-brand-100',
    },
  ];

  const quoteTotal = data.pipeline.reduce((s, p) => s + (p.status === 'accepted' ? 0 : p.amount), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[1.75rem] font-extrabold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-soft mt-1">
            {data.clientCount} clients · {data.invoiceCount} invoices · {data.collectionRate}% collected on time
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => navigate('/app/quotes')}>
            New quote
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/app/invoices/new')}>
            <Plus size={17} weight="bold" aria-hidden="true" />
            New invoice
          </button>
        </div>
      </header>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">{s.label}</p>
                  <p className="mt-2 text-2xl font-extrabold text-ink num truncate">{s.value}</p>
                  <p className="mt-1.5 text-xs text-ink-soft">{s.hint}</p>
                </div>
                <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 border ${s.tone}`}>
                  <Icon size={19} weight="fill" aria-hidden="true" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        {/* Revenue chart */}
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-ink">Revenue trend</h2>
              <p className="text-xs text-ink-soft mt-0.5">Paid invoices by month</p>
            </div>
            <ChartBar size={20} className="text-brand-400" aria-hidden="true" />
          </div>
          <RevenueChart data={data.monthly} currency={currency} locale={locale} />
        </section>

        {/* Expense split */}
        <section className="card p-5">
          <h2 className="font-bold text-ink">Where money went</h2>
          <p className="text-xs text-ink-soft mt-0.5 mb-4">Expenses this month</p>
          <CategoryBars data={data.expenseByCategory} currency={currency} locale={locale} />
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        {/* Aging */}
        <section className="card overflow-hidden">
          <div className="p-5 border-b border-line flex items-center justify-between">
            <div>
              <h2 className="font-bold text-ink">Needs attention</h2>
              <p className="text-xs text-ink-soft mt-0.5">Unpaid invoices, oldest first</p>
            </div>
            <Link to="/app/invoices" className="text-sm font-semibold text-brand-700 hover:text-brand-800
              inline-flex items-center gap-1">
              View all <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {data.aging.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-ink-soft">
              Nothing outstanding. Enjoy the quiet.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Invoice</th>
                    <th>Due</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.aging.map((row) => (
                    <tr key={row.number}>
                      <td>
                        <Link to={`/app/invoices/${data.recent.find((r) => r.number === row.number)?.id ?? ''}`}
                          className="font-semibold text-ink hover:text-brand-700">
                          {row.client_name}
                        </Link>
                      </td>
                      <td className="num text-ink-soft">{row.number}</td>
                      <td>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-ink-soft">
                            {row.days_overdue > 0
                              ? relativeDays(row.due_date)
                              : `due ${formatDate(row.due_date)}`}
                          </span>
                          {row.days_overdue > 0 && <OverdueBadge days={row.days_overdue} />}
                        </div>
                      </td>
                      <td className="text-right num font-semibold text-ink">
                        {formatMoney(row.amount, currency, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Top clients + pipeline */}
        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} className="text-brand-500" aria-hidden="true" />
              <h2 className="font-bold text-ink">Top clients</h2>
            </div>
            {data.topClients.length === 0 ? (
              <p className="text-sm text-ink-soft">No revenue recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.topClients.map((c) => (
                  <li key={c.client_name} className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 grid place-items-center
                      text-xs font-bold shrink-0" aria-hidden="true">
                      {c.client_name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink truncate">{c.client_name}</span>
                      <span className="block text-xs text-ink-soft truncate">{c.client_company}</span>
                    </span>
                    <span className="num text-sm font-bold text-ink">
                      {formatCompact(c.revenue, currency, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Receipt size={18} className="text-brand-500" aria-hidden="true" />
              <h2 className="font-bold text-ink">Quote pipeline</h2>
            </div>
            <p className="text-xs text-ink-soft mb-3">
              {formatMoney(quoteTotal, currency, locale)} in open quotes
            </p>
            <div className="space-y-2">
              {data.pipeline.map((p) => (
                <div key={p.status} className="flex items-center justify-between text-sm">
                  <StatusChip status={p.status as never} />
                  <span className="num text-ink-soft">
                    {p.count} · {formatMoney(p.amount, currency, locale)}
                  </span>
                </div>
              ))}
              {data.pipeline.length === 0 && (
                <p className="text-sm text-ink-soft">No quotes yet.</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-line flex justify-between text-sm">
              <span className="text-ink-soft">This month</span>
              <span className="num font-semibold text-ink">
                {data.monthly.length ? formatMonth(data.monthly[data.monthly.length - 1].month) : '—'}
              </span>
            </div>
          </section>
        </div>
      </div>

      {/* Recent invoices */}
      <section className="card overflow-hidden">
        <div className="p-5 border-b border-line">
          <h2 className="font-bold text-ink">Recent invoices</h2>
          <p className="text-xs text-ink-soft mt-0.5">Your latest activity</p>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Status</th>
                <th>Due</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/app/invoices/${r.id}`} className="num font-semibold text-brand-700 hover:text-brand-800">
                      {r.number}
                    </Link>
                  </td>
                  <td className="text-ink">{r.client_name}</td>
                  <td><StatusChip status={r.status} /></td>
                  <td className="text-xs text-ink-soft whitespace-nowrap">
                    {r.status === 'paid' && r.paid_at
                      ? `Paid ${formatDate(r.paid_at)}`
                      : relativeDays(r.due_date)}
                  </td>
                  <td className="text-right num font-semibold text-ink">
                    {formatMoney(r.total, currency, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
