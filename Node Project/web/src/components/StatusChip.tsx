import type { InvoiceStatus, QuoteStatus } from '../types';

const invoiceStyles: Record<InvoiceStatus, string> = {
  draft: 'bg-canvas text-ink-soft border-line',
  sent: 'bg-info-50 text-info-700 border-info-100',
  partial: 'bg-warn-50 text-warn-700 border-warn-100',
  paid: 'bg-accent-50 text-accent-700 border-accent-100',
  overdue: 'bg-danger-50 text-danger-700 border-danger-100',
  cancelled: 'bg-canvas text-ink-soft border-line',
};

const quoteStyles: Record<QuoteStatus, string> = {
  draft: 'bg-canvas text-ink-soft border-line',
  sent: 'bg-info-50 text-info-700 border-info-100',
  accepted: 'bg-accent-50 text-accent-700 border-accent-100',
  declined: 'bg-danger-50 text-danger-700 border-danger-100',
  expired: 'bg-warn-50 text-warn-700 border-warn-100',
};

const allStyles: Record<string, string> = { ...invoiceStyles, ...quoteStyles };

export function StatusChip({ status }: { status: InvoiceStatus | QuoteStatus }) {
  const style = allStyles[status] ?? invoiceStyles.draft;
  return <span className={`chip ${style}`}>{status}</span>;
}

export function OverdueBadge({ days }: { days: number }) {
  if (days <= 0) return null;
  const tone = days > 30
    ? 'bg-danger-500 text-white border-danger-500'
    : 'bg-danger-50 text-danger-700 border-danger-100';
  return <span className={`chip ${tone}`}>{days}d late</span>;
}
