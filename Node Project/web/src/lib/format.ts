export function formatMoney(cents: number, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format((cents || 0) / 100);
}

export function formatCompact(cents: number, currency = 'USD', locale = 'en-US') {
  const value = (cents || 0) / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatMonth(month: string) {
  const d = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return month;
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function relativeDays(dateStr?: string | null) {
  if (!dateStr) return '';
  const target = new Date(`${dateStr.slice(0, 10)}T00:00:00`).getTime();
  const now = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime();
  const diff = Math.round((target - now) / 86400000);
  if (diff === 0) return 'due today';
  if (diff === 1) return 'due tomorrow';
  if (diff === -1) return '1 day overdue';
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  return `due in ${diff} days`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function humanStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
