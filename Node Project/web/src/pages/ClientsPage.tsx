import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Plus, MagnifyingGlass, Trash, ArrowSquareOut, CaretRight,
} from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/format';
import type { Client } from '../types';
import { Modal } from '../components/Modal';
import { EmptyState, Spinner, ErrorNote } from '../components/Feedback';

const emptyForm = {
  name: '', company: '', email: '', phone: '', address: '', notes: '', status: 'active',
};

export function ClientsPage() {
  const { business } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const currency = business?.currency || 'USD';
  const locale = business?.locale || 'en-US';

  const load = () => {
    setLoading(true);
    api.get<Client[]>(`/clients?search=${encodeURIComponent(search)}`)
      .then(setClients)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load clients'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [search]);

  const totals = useMemo(() => ({
    outstanding: clients.reduce((s, c) => s + (c.outstanding || 0), 0),
    value: clients.reduce((s, c) => s + (c.lifetime_value || 0), 0),
  }), [clients]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.post('/clients', form);
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save client');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this client and all their invoices?')) return;
    await api.del(`/clients/${id}`);
    load();
  };

  const portalUrl = (c: Client) => `${window.location.origin}/portal/${c.portal_token}`;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[1.75rem] font-extrabold text-ink">Clients</h1>
          <p className="text-sm text-ink-soft mt-1">
            {clients.length} clients · {formatMoney(totals.outstanding, currency, locale)} outstanding
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" />
          Add client
        </button>
      </header>

      <div className="relative">
        <MagnifyingGlass size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2
          text-ink-soft pointer-events-none" aria-hidden="true" />
        <input
          className="field pl-10"
          placeholder="Search by name, company, email or invoice number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search clients"
        />
      </div>

      {error && <ErrorNote message={error} />}
      {loading ? (
        <Spinner />
      ) : clients.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users size={24} />}
            title={search ? 'No matching clients' : 'No clients yet'}
            description={search
              ? 'Try a different search term.'
              : 'Add your first client to start sending quotes and invoices.'}
            action={!search && (
              <button className="btn btn-primary" onClick={() => setOpen(true)}>
                <Plus size={16} weight="bold" aria-hidden="true" /> Add client
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
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Invoices</th>
                  <th className="text-right">Outstanding</th>
                  <th className="text-right">Lifetime</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/app/clients/${c.id}`} className="flex items-center gap-3 group">
                        <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 grid place-items-center
                          text-xs font-bold shrink-0" aria-hidden="true">
                          {c.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink group-hover:text-brand-700 truncate">
                            {c.name}
                          </span>
                          <span className="block text-xs text-ink-soft truncate">{c.company || '—'}</span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className="block text-sm text-ink truncate max-w-[180px]">{c.email || '—'}</span>
                      <span className="block text-xs text-ink-soft">{c.phone}</span>
                    </td>
                    <td className="num text-sm text-ink-soft">{c.invoice_count ?? 0}</td>
                    <td className="text-right num font-semibold">
                      <span className={(c.outstanding ?? 0) > 0 ? 'text-danger-600' : 'text-ink-soft'}>
                        {formatMoney(c.outstanding ?? 0, currency, locale)}
                      </span>
                    </td>
                    <td className="text-right num text-ink-soft">
                      {formatMoney(c.lifetime_value ?? 0, currency, locale)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={portalUrl(c)}
                          target="_blank"
                          rel="noreferrer"
                          title="Open client portal"
                          className="w-9 h-9 grid place-items-center rounded-lg text-ink-soft hover:bg-brand-50
                            hover:text-brand-700 transition-colors"
                        >
                          <ArrowSquareOut size={16} aria-hidden="true" />
                          <span className="sr-only">Open portal for {c.name}</span>
                        </a>
                        <button
                          onClick={() => remove(c.id)}
                          title="Delete client"
                          className="w-9 h-9 grid place-items-center rounded-lg text-ink-soft hover:bg-danger-50
                            hover:text-danger-600 transition-colors cursor-pointer"
                        >
                          <Trash size={16} aria-hidden="true" />
                          <span className="sr-only">Delete {c.name}</span>
                        </button>
                        <Link
                          to={`/app/clients/${c.id}`}
                          className="w-9 h-9 grid place-items-center rounded-lg text-ink-soft hover:bg-canvas
                            hover:text-ink transition-colors"
                        >
                          <CaretRight size={16} aria-hidden="true" />
                          <span className="sr-only">Open {c.name}</span>
                        </Link>
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
        title="New client"
        description="Clients get a private portal link for viewing and paying invoices."
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} type="button">Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving} type="submit">
              {saving ? 'Saving…' : 'Create client'}
            </button>
          </>
        )}
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="cname">Full name *</label>
            <input id="cname" className="field" value={form.name} required
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ava Bennett" />
          </div>
          <div>
            <label className="label" htmlFor="ccompany">Company</label>
            <input id="ccompany" className="field" value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Ava Bennett Studio" />
          </div>
          <div>
            <label className="label" htmlFor="cstatus">Status</label>
            <select id="cstatus" className="field" value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="lead">Lead</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cemail">Email</label>
            <input id="cemail" type="email" className="field" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ava@studio.co" />
          </div>
          <div>
            <label className="label" htmlFor="cphone">Phone</label>
            <input id="cphone" className="field" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 415 555 0142" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="caddress">Address</label>
            <input id="caddress" className="field" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="1200 Market Street, Suite 400" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="cnotes">Notes</label>
            <textarea id="cnotes" className="field min-h-[80px]" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Payment terms, preferences, context…" />
          </div>
          {formError && <div className="sm:col-span-2"><ErrorNote message={formError} /></div>}
        </form>
      </Modal>
    </div>
  );
}
