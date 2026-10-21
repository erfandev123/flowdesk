import { useEffect, useState } from 'react';
import { Package, Plus, Trash, PencilSimple } from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/format';
import type { Product } from '../types';
import { Modal } from '../components/Modal';
import { EmptyState, Spinner, ErrorNote } from '../components/Feedback';

const empty = { name: '', description: '', unit_price: '', unit: 'project', tax_rate: '' };

export function CatalogPage() {
  const { business } = useAuth();
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const currency = business?.currency || 'USD';
  const locale = business?.locale || 'en-US';

  const load = () => {
    setLoading(true);
    api.get<Product[]>('/products?include_inactive=1')
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load catalog'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditId(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      unit_price: (p.unit_price / 100).toFixed(2),
      unit: p.unit,
      tax_rate: String(p.tax_rate),
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name: form.name,
      description: form.description,
      unit_price: Math.round(Number(form.unit_price || 0) * 100),
      unit: form.unit,
      tax_rate: Number(form.tax_rate || 0),
      active: 1,
    };
    try {
      if (editId) await api.patch(`/products/${editId}`, payload);
      else await api.post('/products', payload);
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save product');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remove this item from the catalog?')) return;
    await api.del(`/products/${id}`);
    load();
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[1.75rem] font-extrabold text-ink">Catalog</h1>
          <p className="text-sm text-ink-soft mt-1">
            Reusable services and products. Picking one on an invoice fills the line automatically.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={17} weight="bold" aria-hidden="true" /> New item
        </button>
      </header>

      {error && <ErrorNote message={error} />}
      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Package size={24} />}
            title="Your catalog is empty"
            description="Add the services you sell so invoices take seconds instead of minutes."
            action={(
              <button className="btn btn-primary" onClick={openNew}>
                <Plus size={16} weight="bold" aria-hidden="true" /> Add first item
              </button>
            )}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <div key={p.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-ink truncate">{p.name}</h3>
                  <p className="text-xs text-ink-soft mt-0.5 capitalize">{p.unit}</p>
                </div>
                {!p.active && (
                  <span className="chip bg-canvas text-ink-soft border-line shrink-0">Archived</span>
                )}
              </div>
              <p className="text-sm text-ink-soft mt-2.5 flex-1 leading-relaxed">{p.description || '—'}</p>
              <div className="flex items-end justify-between mt-4 pt-4 border-t border-line">
                <div>
                  <p className="text-lg font-extrabold text-ink num">
                    {formatMoney(p.unit_price, currency, locale)}
                  </p>
                  <p className="text-xs text-ink-soft">Tax {p.tax_rate}%</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)}
                    className="w-9 h-9 grid place-items-center rounded-lg text-ink-soft hover:bg-brand-50
                      hover:text-brand-700 transition-colors cursor-pointer"
                    aria-label={`Edit ${p.name}`}>
                    <PencilSimple size={16} aria-hidden="true" />
                  </button>
                  <button onClick={() => remove(p.id)}
                    className="w-9 h-9 grid place-items-center rounded-lg text-ink-soft hover:bg-danger-50
                      hover:text-danger-600 transition-colors cursor-pointer"
                    aria-label={`Remove ${p.name}`}>
                    <Trash size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Edit catalog item' : 'New catalog item'}
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} type="button">Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving} type="submit">
              {saving ? 'Saving…' : 'Save item'}
            </button>
          </>
        )}
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="pname">Name *</label>
            <input id="pname" className="field" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Brand Identity Sprint" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="pdesc">Description</label>
            <textarea id="pdesc" className="field min-h-[80px]" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Logo system, palette, type scale and brand guide" />
          </div>
          <div>
            <label className="label" htmlFor="pprice">Price ({currency})</label>
            <input id="pprice" type="number" min="0" step="0.01" className="field num" required
              value={form.unit_price}
              onChange={(e) => setForm({ ...form, unit_price: e.target.value })} placeholder="2400.00" />
          </div>
          <div>
            <label className="label" htmlFor="punit">Unit</label>
            <input id="punit" className="field" value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="project, month, hour…" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ptax">Tax rate (%)</label>
            <input id="ptax" type="number" min="0" step="0.1" className="field num"
              value={form.tax_rate}
              onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} placeholder="8.5" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
