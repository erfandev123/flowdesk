import { useEffect, useState } from 'react';
import {
  Users, Plus, Trash, ShieldCheck, Crown, Copy, Check, UserCircleGear,
} from '@phosphor-icons/react';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { Modal } from '../components/Modal';
import { EmptyState, Spinner, ErrorNote } from '../components/Feedback';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
  is_you: boolean;
}

const roleMeta: Record<Member['role'], { label: string; blurb: string; chip: string }> = {
  owner: {
    label: 'Owner',
    blurb: 'Full control, including billing and deleting the workspace.',
    chip: 'bg-brand-600 text-white border-brand-600',
  },
  admin: {
    label: 'Admin',
    blurb: 'Can manage the team, clients, invoices and settings.',
    chip: 'bg-info-50 text-info-700 border-info-100',
  },
  member: {
    label: 'Member',
    blurb: 'Can create and edit clients, quotes, invoices and payments.',
    chip: 'bg-accent-50 text-accent-700 border-accent-100',
  },
  viewer: {
    label: 'Viewer',
    blurb: 'Read-only access to everything, changes nothing.',
    chip: 'bg-canvas text-ink-soft border-line',
  },
};

const roles: Member['role'][] = ['admin', 'member', 'viewer'];

export function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'member' as Member['role'] });
  const [invite, setInvite] = useState<{ email: string; temp_password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<Member[]>('/team')
      .then(setMembers)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load team'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post<{ temp_password?: string; member: { email: string } }>(
        '/team/invite', form,
      );
      setOpen(false);
      setForm({ name: '', email: '', role: 'member' });
      if (res.temp_password) {
        setInvite({ email: res.member.email, temp_password: res.temp_password });
      } else {
        setInvite({ email: res.member.email, temp_password: '' });
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add team member');
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      await api.patch(`/team/${id}`, { role });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change role');
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name} from this workspace?`)) return;
    try {
      await api.del(`/team/${id}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove member');
    }
  };

  const copyPassword = async () => {
    if (!invite?.temp_password) return;
    await navigator.clipboard.writeText(invite.temp_password);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[1.75rem] font-extrabold text-ink">Team</h1>
          <p className="text-sm text-ink-soft mt-1">
            {members.length} {members.length === 1 ? 'person' : 'people'} in this workspace.
            Everyone here sees the same clients and invoices.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={17} weight="bold" aria-hidden="true" /> Add member
        </button>
      </header>

      {error && <ErrorNote message={error} />}

      {invite && (
        <div className="card p-5 border-accent-100 bg-accent-50">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} weight="fill" className="text-accent-600 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-accent-900">
                {invite.email} has been added
              </p>
              {invite.temp_password ? (
                <>
                  <p className="text-sm text-accent-800 mt-1">
                    Send them this temporary password. They can sign in and change it from
                    their profile.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <code className="px-3 py-2 rounded-lg bg-surface border border-accent-100
                      font-mono text-sm text-ink">
                      {invite.temp_password}
                    </code>
                    <button className="btn btn-ghost !min-h-[38px]" onClick={copyPassword}>
                      {copied ? <Check size={15} weight="bold" /> : <Copy size={15} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-accent-800 mt-1">
                  They already had an account, so they can sign in with their existing password
                  and the workspace will appear for them.
                </p>
              )}
              <button
                onClick={() => setInvite(null)}
                className="mt-3 text-sm font-semibold text-accent-700 hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : members.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users size={24} />}
            title="No team members yet"
            description="Add the people who work with you so everyone can bill from the same place."
            action={(
              <button className="btn btn-primary" onClick={() => setOpen(true)}>
                <Plus size={16} weight="bold" aria-hidden="true" /> Add member
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
                  <th>Person</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 grid place-items-center
                          text-xs font-bold shrink-0" aria-hidden="true">
                          {m.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink truncate">
                            {m.name}{m.is_you && <span className="text-ink-soft font-normal"> (you)</span>}
                          </span>
                          <span className="block text-xs text-ink-soft truncate">{m.email}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      {m.role === 'owner' ? (
                        <span className={`chip ${roleMeta.owner.chip}`}>
                          <Crown size={12} weight="fill" aria-hidden="true" /> Owner
                        </span>
                      ) : (
                        <select
                          className="field !min-h-[38px] !py-1 text-xs max-w-[130px]"
                          value={m.role}
                          onChange={(e) => changeRole(m.id, e.target.value)}
                          aria-label={`Role for ${m.name}`}
                        >
                          {roles.map((r) => (
                            <option key={r} value={r}>{roleMeta[r].label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="text-xs text-ink-soft whitespace-nowrap">
                      {formatDate(m.joined_at)}
                    </td>
                    <td>
                      <div className="flex justify-end">
                        {m.role !== 'owner' && !m.is_you && (
                          <button
                            onClick={() => remove(m.id, m.name)}
                            className="w-9 h-9 grid place-items-center rounded-lg text-ink-soft hover:bg-danger-50
                              hover:text-danger-600 transition-colors cursor-pointer"
                            aria-label={`Remove ${m.name}`}
                          >
                            <Trash size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserCircleGear size={18} className="text-brand-500" aria-hidden="true" />
          <h2 className="font-bold text-ink">What each role can do</h2>
        </div>
        <ul className="space-y-3">
          {roles.map((r) => (
            <li key={r} className="flex items-start gap-3">
              <span className={`chip ${roleMeta[r].chip} shrink-0`}>{roleMeta[r].label}</span>
              <span className="text-sm text-ink-soft leading-relaxed">{roleMeta[r].blurb}</span>
            </li>
          ))}
        </ul>
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a team member"
        description="They will get their own login and see this workspace only."
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} type="button">Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving} type="submit">
              {saving ? 'Adding…' : 'Add member'}
            </button>
          </>
        )}
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="tname">Name *</label>
            <input id="tname" className="field" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Riley Ahmed" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="temail">Email *</label>
            <input id="temail" type="email" className="field" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="riley@studio.com" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="trole">Role</label>
            <select id="trole" className="field" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Member['role'] })}>
              {roles.map((r) => (
                <option key={r} value={r}>{roleMeta[r].label}</option>
              ))}
            </select>
            <p className="text-xs text-ink-soft mt-2">{roleMeta[form.role].blurb}</p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
