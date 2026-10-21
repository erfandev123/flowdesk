import { useEffect, useState } from 'react';
import { DownloadSimple, ChartBar, Gauge, TrendUp } from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatMonth, formatDate } from '../lib/format';
import type { CashflowRow, VelocityRow } from '../types';
import { DonutChart } from '../components/Charts';
import { Spinner, ErrorNote } from '../components/Feedback';

export function ReportsPage() {
  const { business } = useAuth();
  const [cashflow, setCashflow] = useState<CashflowRow[]>([]);
  const [velocity, setVelocity] = useState<VelocityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currency = business?.currency || 'USD';
  const locale = business?.locale || 'en-US';

  useEffect(() => {
    Promise.all([
      api.get<CashflowRow[]>('/reports/cashflow'),
      api.get<VelocityRow[]>('/reports/invoice-velocity'),
    ])
      .then(([c, v]) => {
        setCashflow(c);
        setVelocity(v);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Building your reports" />;
  if (error) return <ErrorNote message={error} />;

  const totalRevenue = cashflow.reduce((s, r) => s + r.revenue, 0);
  const totalExpenses = cashflow.reduce((s, r) => s + r.expenses, 0);
  const net = totalRevenue - totalExpenses;
  const margin = totalRevenue ? Math.round((net / totalRevenue) * 100) : 0;

  const paidVelocities = velocity.filter((v) => v.paid_at).map((v) => v.days_to_pay);
  const avgDays = paidVelocities.length
    ? Math.round(paidVelocities.reduce((s, d) => s + d, 0) / paidVelocities.length)
    : 0;

  const donutData = [
    { label: 'Revenue', value: totalRevenue, color: '#1E3A5F' },
    { label: 'Expenses', value: totalExpenses, color: '#059669' },
  ];

  const maxNet = Math.max(...cashflow.map((r) => Math.abs(r.net)), 1);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[1.75rem] font-extrabold text-ink">Reports</h1>
          <p className="text-sm text-ink-soft mt-1">Cashflow, margin and how fast clients pay.</p>
        </div>
        <div className="flex gap-2">
          <a className="btn btn-ghost" href="/api/export/payments.csv" download>
            <DownloadSimple size={16} /> Payments CSV
          </a>
          <a className="btn btn-ghost" href="/api/export/invoices.csv" download>
            <DownloadSimple size={16} /> Invoices CSV
          </a>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-ink-soft text-xs font-semibold uppercase tracking-wider">
            <TrendUp size={14} /> Total revenue
          </div>
          <p className="text-2xl font-extrabold text-ink num mt-2">
            {formatMoney(totalRevenue, currency, locale)}
          </p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-ink-soft text-xs font-semibold uppercase tracking-wider">
            <Gauge size={14} /> Net margin
          </div>
          <p className={`text-2xl font-extrabold num mt-2 ${margin >= 0 ? 'text-accent-700' : 'text-danger-600'}`}>
            {margin}%
          </p>
          <p className="text-xs text-ink-soft mt-1">
            {formatMoney(net, currency, locale)} net
          </p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-ink-soft text-xs font-semibold uppercase tracking-wider">
            <ChartBar size={14} /> Average days to pay
          </div>
          <p className="text-2xl font-extrabold text-ink num mt-2">{avgDays} days</p>
          <p className="text-xs text-ink-soft mt-1">From invoice date to payment</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className="card p-5">
          <h2 className="font-bold text-ink">Monthly cashflow</h2>
          <p className="text-xs text-ink-soft mt-0.5 mb-5">Revenue vs expenses, net shown below</p>
          {cashflow.length === 0 ? (
            <p className="text-sm text-ink-soft py-8 text-center">
              Not enough data yet. Add invoices and expenses to see the trend.
            </p>
          ) : (
            <div className="space-y-3">
              {cashflow.map((row) => (
                <div key={row.month} className="grid grid-cols-[52px_1fr_84px] items-center gap-3">
                  <span className="text-xs font-semibold text-ink-soft">{formatMonth(row.month)}</span>
                  <div className="h-8 rounded-lg bg-canvas relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-lg bg-brand-600/85 transition-[width] duration-500"
                      style={{ width: `${Math.min(100, (row.revenue / maxNet) * 100)}%` }} />
                    <div className="absolute inset-y-0 rounded-lg bg-accent-500/70 transition-[width] duration-500"
                      style={{
                        width: `${Math.min(100, (row.expenses / maxNet) * 100)}%`,
                        marginLeft: `${Math.min(100, (row.revenue / maxNet) * 100)}%`,
                      }} />
                  </div>
                  <span className={`text-right num text-xs font-semibold ${row.net >= 0 ? 'text-accent-700' : 'text-danger-600'}`}>
                    {formatMoney(row.net, currency, locale)}
                  </span>
                </div>
              ))}
              <div className="flex gap-5 pt-3 border-t border-line text-xs text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-brand-600" aria-hidden="true" /> Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-accent-500" aria-hidden="true" /> Expenses
                </span>
              </div>
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-ink mb-4">Revenue vs expenses</h2>
          <DonutChart data={donutData} currency={currency} locale={locale} />
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="p-5 border-b border-line">
          <h2 className="font-bold text-ink">Invoice velocity</h2>
          <p className="text-xs text-ink-soft mt-0.5">How long clients take to pay, newest first</p>
        </div>
        {velocity.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">No invoices in the last 180 days.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Issued</th>
                  <th>Paid</th>
                  <th className="text-right">Days to pay</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {velocity.map((v) => (
                  <tr key={v.id}>
                    <td className="num font-semibold text-ink">{v.number}</td>
                    <td className="text-ink">{v.client_name}</td>
                    <td className="text-xs text-ink-soft">{formatDate(v.issue_date)}</td>
                    <td className="text-xs text-ink-soft">{v.paid_at ? formatDate(v.paid_at) : 'Unpaid'}</td>
                    <td className="text-right">
                      <span className={`chip ${v.days_to_pay > 30
                        ? 'bg-danger-50 text-danger-700 border-danger-100'
                        : 'bg-canvas text-ink-soft border-line'}`}>
                        {v.days_to_pay}d
                      </span>
                    </td>
                    <td className="text-right num font-semibold text-ink">
                      {formatMoney(v.total, currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
