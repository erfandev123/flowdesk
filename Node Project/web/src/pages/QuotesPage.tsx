import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Trash, ArrowRight, PaperPlaneTilt,
} from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDate } from '../lib/format';
import type { Quote, Client } from '../types';
import { StatusChip } from '../components/StatusChip';
import { Modal } from '../components/Modal';
import { EmptyState, Spinner, ErrorNote } from '../components/Feedback';

export function QuotesPage() {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_id: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const currency = business?.currency || 'USD';
  const locale = business?.locale || 'en-US';

  const load = () => {
    setLoading(true);
    api.get<Quote[]>('/quotes')
      .then(setQuotes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load quotes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get<Client[]>('/clients').then(setClients).catch(() => setClients([]));
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const quote = await api.post<Quote>('/quotes', form);
      setOpen(false);
      setForm({ client_id: '', notes: '' });
      navigate('/app/invoices/new');
      void quote;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create quote');
      setSaving(false);
    }
  };

  const convert = async (q: Quote) => {
    const inv = await api.post<{ id: string }>(`/quotes/${q.id}/convert`);
    navigate(`/app/invoices/${inv.id}`);
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this quote?')) return;
    await api.del(`/quotes/${id}`);
    load();
  };

  const markSent = async (q: Quote) => {
    await api.patch(`/quotes/${q.id}`, { status: 'sent' });
    load();
  };

  const openValue = quotes
    .filter((q) => !['accepted', 'declined'].includes(q.status))
    .reduce((s, q) => s + q.total, 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[1.75rem] font-extrabold text-ink">Quotes</h1>
          <p className="text-sm text-ink-soft mt-1">
            {quotes.length} quotes · {formatMoney(openValue, currency, locale)} still open
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" /> New quote
        </button>
      </header>

      {error && <ErrorNote message={error} />}
      {loading ? (
        <Spinner />
      ) : quotes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FileText size={24} />}
            title="No quotes yet"
            description="Quote the work first, then convert the accepted quote into an invoice in one click."
            action={(
              <button className="btn btn-primary" onClick={() => setOpen(true)}>
                <Plus size={16} weight="bold" aria-hidden="true" /> New quote
              </button>
            )}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quote</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Issued</th>
                  <th>Valid until</th>
                  <th className="text-right">Total</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id}>
                    <td className="num font-semibold text-ink">{q.number}</td>
                    <td>
                      <span className="block font-medium text-ink">{q.client_name}</span>
                      <span className="block text-xs text-ink-soft">{q.client_company}</span>
                    </td>
                    <td><StatusChip status={q.status} /></td>
                    <td className="text-xs text-ink-soft">{formatDate(q.issue_date)}</td>
                    <td className="text-xs text-ink-soft">{formatDate(q.valid_until)}</td>
                    <td className="text-right num font-semibold text-ink">
                      {formatMoney(q.total, currency, locale)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {q.status === 'draft' && (
                          <button onClick={() => markSent(q)} title="Mark as sent"
                            className="w-9 h-9 grid place-items-center rounded-lg text-ink-soft hover:bg-brand-50
                              hover:text-brand-700 transition-colors cursor-pointer">
                            <PaperPlaneTilt size={16} aria-hidden="true" />
                            <span className="sr-only">Mark {q.number} as sent</span>
                          </button>
                        )}
                        <button onClick={() => convert(q)} title="Convert to invoice"
                          className="w-9 h-9 grid place-items-center rounded-lg text-ink-soft hover:bg-accent-50
                            hover:text-accent-700 transition-colors cursor-pointer">
                          <ArrowRight size={16} aria-hidden="true" />
                          <span className="sr-only">Convert {q.number} to invoice</span>
                        </button>
                        <button onClick={() => remove(q.id)} title="Delete quote"
                          className="w-9 h-9 grid place-items-center rounded-lg text-ink-soft hover:bg-danger-50
                            hover:text-danger-600 transition-colors cursor-pointer">
                          <Trash size={16} aria-hidden="true" />
                          <span className="sr-only">Delete {q.number}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New quote"
        description="Create the quote, then add line items on the invoice screen."
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} type="button">Cancel</button>
            <button className="btn btn-primary" onClick={create} disabled={saving} type="submit">
              {saving ? 'Creating…' : 'Create quote'}
            </button>
          </>
        )}
      >
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="label" htmlFor="qclient">Client *</label>
            <select id="qclient" className="field" value={form.client_id} required
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` — ${c.company}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="qnotes">Scope notes</label>
            <textarea id="qnotes" className="field min-h-[100px]" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Scope includes two revision rounds per deliverable." />
          </div>
          {error && <ErrorNote message={error} />}
        </form>
      </Modal>
    </div>
  );
}
