import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowClockwise, Receipt, Wallet } from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDate } from '../lib/format';
import type { Invoice } from '../types';
import { EmptyState, Spinner, ErrorNote } from '../components/Feedback';

export function RecurringPage() {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currency = business?.currency || 'USD';
  const locale = business?.locale || 'en-US';

  const load = () => {
    setLoading(true);
    api.get<Invoice[]>('/recurring')
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load recurring invoices'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const run = async (row: Invoice) => {
    const created = await api.post<Invoice>(`/recurring/${row.id}/run`, {});
    navigate(`/app/invoices/${created.id}`);
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-[1.75rem] font-extrabold text-ink">Recurring billing</h1>
        <p className="text-sm text-ink-soft mt-1">
          Retainers and subscriptions that renew on a schedule. Generate the next invoice when it is due.
        </p>
      </header>

      {error && <ErrorNote message={error} />}
      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Wallet size={24} />}
            title="No recurring invoices"
            description="Set “Recurring billing” on an invoice to turn it into a subscription that renews weekly, monthly, quarterly or yearly."
            action={(
              <button className="btn btn-primary" onClick={() => navigate('/app/invoices/new')}>
                <Receipt size={16} /> Create a recurring invoice
              </button>
            )}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="num text-xs font-semibold text-ink-soft">{r.number}</p>
                  <p className="font-bold text-ink truncate mt-0.5">{r.client_name}</p>
                  <p className="text-xs text-ink-soft truncate">{r.client_company}</p>
                </div>
                <span className="chip bg-info-50 text-info-700 border-info-100 capitalize shrink-0">
                  {r.recurring_rule}
                </span>
              </div>

              <p className="mt-4 text-2xl font-extrabold text-ink num">
                {formatMoney(r.total, currency, locale)}
              </p>

              <div className="mt-3 text-sm text-ink-soft space-y-1">
                <p>Next invoice: <span className="font-medium text-ink">
                  {r.next_invoice_date ? formatDate(r.next_invoice_date) : 'Not scheduled'}
                </span></p>
                <p>Last issued: <span className="font-medium text-ink">{formatDate(r.issue_date)}</span></p>
              </div>

              <div className="mt-5 pt-4 border-t border-line flex items-center gap-2">
                <button className="btn btn-primary flex-1" onClick={() => run(r)}>
                  <ArrowClockwise size={16} /> Generate next
                </button>
                <button className="btn btn-ghost" onClick={() => navigate(`/app/invoices/${r.id}`)}>
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
