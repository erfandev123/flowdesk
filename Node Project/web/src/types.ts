export interface Business {
  id: string;
  name: string;
  currency: string;
  locale: string;
  timezone: string;
  brand_color: string;
  accent_color: string;
  logo_text: string;
  invoice_prefix: string;
  quote_prefix: string;
  next_invoice_seq: number;
  next_quote_seq: number;
  default_tax: number;
  default_terms: string;
  reminder_template: string;
}

export interface Client {
  id: string;
  business_id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  status: 'active' | 'lead' | 'archived';
  portal_token: string;
  created_at: string;
  outstanding?: number;
  lifetime_value?: number;
  invoice_count?: number;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string;
  unit_price: number;
  unit: string;
  tax_rate: number;
  active: number;
}

export interface LineItem {
  id?: string;
  product_id?: string | null;
  description: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
  position?: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

export interface Invoice {
  id: string;
  business_id: string;
  client_id: string;
  quote_id: string | null;
  number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  notes: string;
  terms: string;
  subtotal: number;
  discount: number;
  tax_total: number;
  total: number;
  paid_amount: number;
  recurring_rule: string;
  next_invoice_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  items?: LineItem[];
  payments?: Payment[];
  reminders?: Reminder[];
  client?: Client;
  client_name?: string;
  client_company?: string;
  client_email?: string;
}

export interface Quote {
  id: string;
  business_id: string;
  client_id: string;
  number: string;
  status: QuoteStatus;
  issue_date: string;
  valid_until: string;
  notes: string;
  subtotal: number;
  tax_total: number;
  total: number;
  items?: LineItem[];
  client_name?: string;
  client_company?: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: string;
  reference: string;
  note: string;
  paid_at: string;
}

export interface Reminder {
  id: string;
  invoice_id: string;
  channel: string;
  message: string;
  sent_at: string;
}

export interface Expense {
  id: string;
  business_id: string;
  category: string;
  vendor: string;
  amount: number;
  expense_date: string;
  note: string;
  created_at: string;
}

export interface DashboardData {
  revenueThisMonth: number;
  outstanding: number;
  overdue: number;
  expensesThisMonth: number;
  netThisMonth: number;
  invoiceCount: number;
  clientCount: number;
  collectionRate: number;
  monthly: { month: string; revenue: number }[];
  aging: {
    client_name: string; number: string; due_date: string; amount: number; days_overdue: number;
  }[];
  topClients: { client_name: string; client_company: string; revenue: number }[];
  recent: {
    id: string; number: string; status: InvoiceStatus; total: number; paid_amount: number;
    due_date: string; issue_date: string; paid_at: string | null;
    client_name: string; client_company: string;
  }[];
  pipeline: { status: string; count: number; amount: number }[];
  expenseByCategory: { category: string; amount: number }[];
  currency: string;
  locale: string;
}

export interface CashflowRow {
  month: string; revenue: number; expenses: number; net: number;
}

export interface VelocityRow {
  id: string; number: string; issue_date: string; due_date: string; paid_at: string | null;
  total: number; paid_amount: number; client_name: string; days_to_pay: number;
}
