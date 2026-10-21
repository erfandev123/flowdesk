import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash, FloppyDisk, ArrowClockwise,
} from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, todayISO, addDaysISO } from '../lib/format';
import type { Client, Invoice, Product } from '../types';
import { ErrorNote } from '../components/Feedback';

interface DraftItem {
  key: string;
  description: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
  product_id?: string | null;
}

const newItem = (): DraftItem => ({
  key: Math.random().toString(36).slice(2),
  description: '',
  qty: 1,
  unit_price: 0,
  tax_rate: 0,
});

export function InvoiceEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { business } = useAuth();
  const isEdit = Boolean(id);

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<DraftItem[]>([newItem()]);
  const [clientId, setClientId] = useState('');
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(addDaysISO(todayISO(), 14));
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [recurring, setRecurring] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const currency = business?.currency || 'USD';
  const locale = business?.locale || 'en-US';

  useEffect(() => {
    api.get<Client[]>('/clients').then(setClients).catch(() => setClients([]));
    api.get<Product[]>('/products').then(setProducts).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!isEdit) {
      setTerms(business?.default_terms ?? '');
      return;
    }
    api.get<Invoice>(`/invoices/${id}`)
      .then((inv) => {
        setClientId(inv.client_id);
        setIssueDate(inv.issue_date);
        setDueDate(inv.due_date);
        setDiscount(inv.discount);
        setNotes(inv.notes);
        setTerms(inv.terms);
        setRecurring(inv.recurring_rule);
        setItems((inv.items ?? []).map((it) => ({
          key: Math.random().toString(36).slice(2),
          description: it.description,
          qty: it.qty,
          unit_price: it.unit_price,
          tax_rate: it.tax_rate,
          product_id: it.product_id,
        })));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load invoice'));
  }, [id, isEdit, business]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    for (const it of items) {
      const line = Math.round(it.qty * it.unit_price);
      subtotal += line;
      taxTotal += Math.round(line * (it.tax_rate / 100));
    }
    const total = Math.max(0, subtotal + taxTotal - discount);
    return { subtotal, taxTotal, total };
  }, [items, discount]);

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const applyProduct = (key: string, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) {
      updateItem(key, { product_id: null });
      return;
    }
    updateItem(key, {
      product_id: p.id,
      description: p.description ? `${p.name} — ${p.description}` : p.name,
      unit_price: p.unit_price,
      tax_rate: p.tax_rate,
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!clientId) {
      setError('Please choose a client.');
      return;
    }
    const payload = {
      client_id: clientId,
      issue_date: issueDate,
      due_date: dueDate,
      discount,
      notes,
      terms,
      recurring_rule: recurring,
      next_invoice_date: recurring ? addDaysISO(issueDate, 30) : null,
      items: items
        .filter((it) => it.description.trim())
        .map((it) => ({
          description: it.description.trim(),
          qty: it.qty,
          unit_price: it.unit_price,
          tax_rate: it.tax_rate,
          product_id: it.product_id ?? null,
        })),
    };
    setSaving(true);
    try {
      const result = isEdit
        ? await api.patch<Invoice>(`/invoices/${id}`, payload)
        : await api.post<Invoice>('/invoices', payload);
      navigate(`/app/invoices/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save invoice');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5
          text-sm font-medium text-ink-soft hover:text-brand-700 cursor-pointer">
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <FloppyDisk size={17} /> {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create invoice'}
        </button>
      </div>

      <header>
        <h1 className="text-2xl sm:text-[1.75rem] font-extrabold text-ink">
          {isEdit ? 'Edit invoice' : 'New invoice'}
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          Amounts are entered in {currency}. The invoice number is assigned automatically.
        </p>
      </header>

      {error && <ErrorNote message={error} />}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] items-start">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="font-bold text-ink mb-4">Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="client">Client *</label>
                <select id="client" className="field" value={clientId}
                  onChange={(e) => setClientId(e.target.value)} required>
                  <option value="">Select a client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.company ? ` — ${c.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="issue">Issue date</label>
                <input id="issue" type="date" className="field" value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="due">Due date</label>
                <input id="due" type="date" className="field" value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="recur">Recurring billing</label>
                <select id="recur" className="field" value={recurring}
                  onChange={(e) => setRecurring(e.target.value)}>
                  <option value="">One-off invoice</option>
                  <option value="weekly">Every week</option>
                  <option value="monthly">Every month</option>
                  <option value="quarterly">Every quarter</option>
                  <option value="yearly">Every year</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="discount">Discount ({currency})</label>
                <input id="discount" type="number" className="field num" min="0" step="0.01"
                  value={(discount / 100).toFixed(2)}
                  onChange={(e) => setDiscount(Math.round(Number(e.target.value || 0) * 100))} />
              </div>
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-ink">Line items</h2>
              <button type="button" className="btn btn-ghost !min-h-[36px] text-xs"
                onClick={() => setItems((l) => [...l, newItem()])}>
                <Plus size={15} weight="bold" /> Add item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.key} className="rounded-xl border border-line p-3 bg-canvas/50">
                  <div className="grid gap-3 sm:grid-cols-[1.6fr_0.5fr_0.9fr_0.6fr_auto] sm:items-end">
                    <div>
                      <label className="label" htmlFor={`d-${it.key}`}>Description</label>
                      <input id={`d-${it.key}`} className="field" value={it.description}
                        onChange={(e) => updateItem(it.key, { description: e.target.value })}
                        placeholder="Design sprint — 2 weeks" />
                    </div>
                    <div>
                      <label className="label" htmlFor={`q-${it.key}`}>Qty</label>
                      <input id={`q-${it.key}`} type="number" min="0" step="0.25" className="field num"
                        value={it.qty}
                        onChange={(e) => updateItem(it.key, { qty: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`r-${it.key}`}>Rate</label>
                      <input id={`r-${it.key}`} type="number" min="0" step="0.01" className="field num"
                        value={(it.unit_price / 100).toFixed(2)}
                        onChange={(e) => updateItem(it.key, {
                          unit_price: Math.round(Number(e.target.value || 0) * 100),
                        })} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`t-${it.key}`}>Tax %</label>
                      <input id={`t-${it.key}`} type="number" min="0" step="0.1" className="field num"
                        value={it.tax_rate}
                        onChange={(e) => updateItem(it.key, { tax_rate: Number(e.target.value) })} />
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      {products.length > 0 && (
                        <select
                          className="field !min-h-[42px] !py-1.5 text-xs max-w-[130px]"
                          value={it.product_id ?? ''}
                          onChange={(e) => applyProduct(it.key, e.target.value)}
                          aria-label="Pick from catalog"
                        >
                          <option value="">Catalog…</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => setItems((l) => l.length > 1 ? l.filter((x) => x.key !== it.key) : l)}
                        className="w-10 h-10 grid place-items-center rounded-lg text-ink-soft hover:bg-danger-50
                          hover:text-danger-600 transition-colors cursor-pointer shrink-0"
                        aria-label="Remove item"
                      >
                        <Trash size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-line
                    text-sm">
                    <span className="text-xs text-ink-soft">
                      Tax {formatMoney(Math.round(it.qty * it.unit_price * (it.tax_rate / 100)), currency, locale)}
                    </span>
                    <span className="num font-semibold text-ink">
                      {formatMoney(Math.round(it.qty * it.unit_price), currency, locale)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="notes">Notes</label>
              <textarea id="notes" className="field min-h-[100px]" value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Thanks for the project. It was a pleasure." />
            </div>
            <div>
              <label className="label" htmlFor="terms">Payment terms</label>
              <textarea id="terms" className="field min-h-[100px]" value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Due within 14 days." />
            </div>
          </section>
        </div>

        {/* Summary */}
        <div className="space-y-5 lg:sticky lg:top-6">
          <section className="card p-5">
            <h2 className="font-bold text-ink mb-4">Summary</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="num font-medium text-ink">
                  {formatMoney(totals.subtotal, currency, locale)}
                </dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Discount</dt>
                  <dd className="num font-medium text-danger-600">
                    -{formatMoney(discount, currency, locale)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-soft">Tax</dt>
                <dd className="num font-medium text-ink">
                  {formatMoney(totals.taxTotal, currency, locale)}
                </dd>
              </div>
              <div className="flex justify-between pt-3 border-t border-line">
                <dt className="font-bold text-ink">Total</dt>
                <dd className="num font-extrabold text-xl text-brand-700">
                  {formatMoney(totals.total, currency, locale)}
                </dd>
              </div>
            </dl>
            <button type="submit" className="btn btn-primary w-full mt-5" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create invoice'}
            </button>
          </section>

          {recurring && (
            <section className="card p-5 border-accent-100 bg-accent-50">
              <div className="flex items-start gap-3">
                <ArrowClockwise size={18} className="text-accent-700 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-accent-900 text-sm">Recurring invoice</p>
                  <p className="text-xs text-accent-800 mt-1 leading-relaxed">
                    The next invoice is scheduled for {addDaysISO(issueDate, 30)}. Generate it from
                    the Recurring page when it is due.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </form>
  );
}
