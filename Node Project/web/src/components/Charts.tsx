import { useId } from 'react';

export function RevenueChart({
  data, currency, locale,
}: {
  data: { month: string; revenue: number }[];
  currency: string;
  locale: string;
}) {
  const gid = useId().replace(/:/g, '');
  if (!data.length) {
    return (
      <div className="h-56 grid place-items-center text-sm text-ink-soft">
        No paid invoices yet — chart appears once money lands.
      </div>
    );
  }
  const width = 720;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 28, left: 56 };
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const step = innerW / data.length;
  const barW = Math.min(38, step * 0.55);

  const fmt = (v: number) => new Intl.NumberFormat(locale, {
    style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1,
  }).format(v / 100);

  const ticks = 4;
  const gridLines = Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i);

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img"
        aria-label="Monthly revenue chart">
        <defs>
          <linearGradient id={`bar-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E3A5F" />
            <stop offset="100%" stopColor="#38639A" />
          </linearGradient>
        </defs>
        {gridLines.map((v, i) => {
          const y = pad.top + innerH - (v / max) * innerH;
          return (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y}
                stroke="#E4E7EB" strokeWidth={1} />
              <text x={pad.left - 10} y={y + 4} textAnchor="end" fontSize={11} fill="#64748B">
                {fmt(v)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const barH = Math.max(3, (d.revenue / max) * innerH);
          const x = pad.left + i * step + (step - barW) / 2;
          const y = pad.top + innerH - barH;
          const label = new Date(`${d.month}-01T00:00:00`).toLocaleDateString('en-US', {
            month: 'short',
          });
          return (
            <g key={d.month}>
              <rect x={x} y={y} width={barW} height={barH} rx={5}
                fill={`url(#bar-${gid})`} />
              <title>{`${label} — ${fmt(d.revenue)}`}</title>
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="#64748B">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function CategoryBars({
  data, currency, locale,
}: {
  data: { category: string; amount: number }[];
  currency: string;
  locale: string;
}) {
  if (!data.length) {
    return <div className="h-40 grid place-items-center text-sm text-ink-soft">No expenses logged yet.</div>;
  }
  const max = Math.max(...data.map((d) => d.amount), 1);
  const fmt = (v: number) => new Intl.NumberFormat(locale, {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(v / 100);
  const palette = ['#1E3A5F', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626'];

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.category}>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium capitalize text-ink">{d.category}</span>
            <span className="num text-ink-soft">{fmt(d.amount)}</span>
          </div>
          <div className="h-2 rounded-full bg-canvas overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(d.amount / max) * 100}%`, background: palette[i % palette.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  data, currency, locale,
}: {
  data: { label: string; value: number; color: string }[];
  currency: string;
  locale: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (!total) {
    return <div className="h-40 grid place-items-center text-sm text-ink-soft">No data yet.</div>;
  }
  const size = 180;
  const r = 70;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const fmt = (v: number) => new Intl.NumberFormat(locale, {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(v / 100);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Breakdown chart">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F3F5" strokeWidth={26} />
        {data.map((d) => {
          const len = (d.value / total) * circumference;
          const el = (
            <circle
              key={d.label}
              cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={26}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
            >
              <title>{`${d.label}: ${fmt(d.value)}`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={13} fill="#64748B">Total</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize={15} fontWeight={700} fill="#0F172A">
          {fmt(total)}
        </text>
      </svg>
      <ul className="space-y-2 flex-1 w-full">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2.5 text-sm">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.color }} aria-hidden="true" />
            <span className="text-ink-soft capitalize flex-1">{d.label}</span>
            <span className="num font-semibold text-ink">{fmt(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
