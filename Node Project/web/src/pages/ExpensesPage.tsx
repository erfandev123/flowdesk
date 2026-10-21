import { useEffect, useState } from 'react';
import { Plus, Trash, DownloadSimple, Receipt } from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDate, todayISO } from '../lib/format';
import type { Expense } from '../types';
import { Modal } from '../components/Modal';
import { EmptyState, Spinner, ErrorNote } from '../components/Feedback';

const categories = ['software', 'contractors', 'marketing', 'office', 'travel', 'equipment', 'tax', 'general'];

export function ExpensesPage() {
  const { business } = useAuth();
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: 'general', vendor: '', amount: '', expense_date: todayISO(), note: '',
  });

  const currency = business?.currency || 'USD';
  const locale = business?.locale || 'en-US';

  const load = () => {
    setLoading(true);
    api.get<Expense[]>('/expenses')
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load expenses'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/expenses', {
        category: form.category,
        vendor: form.vendor,
        amount: Math.round(Number(form.amount || 0) * 100),
        expense_date: form.expense_date,
        note: form.note,
      });
      setOpen(false);
      setForm({ category: 'general', vendor: '', amount: '', expense_date: todayISO(), note: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save expense');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    await api.del(`/expenses/${id}`);
    load();
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[1.75rem] font-extrabold text-ink">Expenses</h1>
          <p className="text-sm text-ink-soft mt-1">
            {rows.length} entries · {formatMoney(total, currency, locale)} tracked
          </p>
        </div>
        <div className="flex gap-2">
          <a className="btn btn-ghost" href="/api/export/expenses.csv" download>
            <DownloadSimple size={16} /> Export CSV
          </a>
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus size={17} weight="bold" aria-hidden="true" /> Log expense
          </button>
        </div>
      </header>

      {error && <ErrorNote message={error} />}
      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Receipt size={24} />}
            title="No expenses logged"
            description="Track what you spend so your net profit on the dashboard stays honest."
            action={(
              <button className="btn btn-primary" onClick={() => setOpen(true)}>
                <Plus size={16} weight="bold" aria-hidden="true" /> Log expense
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
                  <th>Date</th>
                  <th>Category</th>
                  <th>Vendor</th>
                  <th>Note</th>
                  <th className="text-right">Amount</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="text-sm text-ink-soft whitespace-nowrap">{formatDate(r.expense_date)}</td>
                    <td>
                      <span className="chip bg-canvas text-ink-soft border-line capitalize">{r.category}</span>
                    </td>
                    <td className="font-medium text-ink">{r.vendor || '—'}</td>
                    <td className="text-sm text-ink-soft max-w-[240px] truncate">{r.note}</td>
                    <td className="text-right num font-semibold text-ink">
                      {formatMoney(r.amount, currency, locale)}
                    </td>
                    <td>
                      <div className="flex justify-end">
                        <button onClick={() => remove(r.id)}
                          className="w-9 h-9 grid place-items-center rounded-lg text-ink-soft hover:bg-danger-50
                            hover:text-danger-600 transition-colors cursor-pointer"
                          aria-label="Delete expense">
                          <Trash size={16} aria-hidden="true" />
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
        title="Log an expense"
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} type="button">Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving} type="submit">
              {saving ? 'Saving…' : 'Save expense'}
            </button>
          </>
        )}
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ecat">Category</label>
            <select id="ecat" className="field" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="edate">Date</label>
            <input id="edate" type="date" className="field" value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="evendor">Vendor</label>
            <input id="evendor" className="field" value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Figma" />
          </div>
          <div>
            <label className="label" htmlFor="eamt">Amount ({currency})</label>
            <input id="eamt" type="number" min="0" step="0.01" className="field num" required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="45.00" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="enote">Note</label>
            <input id="enote" className="field" value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
