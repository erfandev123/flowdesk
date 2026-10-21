/**
 * Input validation and coercion helpers.
 *
 * Every value that reaches the database passes through one of these, so the
 * database only ever holds strings of a bounded length, finite numbers and
 * values from a known allow-list.
 */

import { HttpError, fail } from '../middleware/errors.js';

export { HttpError, fail };

/** Reject a request body that is not a plain object. */
export function readBody(req) {
  const b = req.body || {};
  if (!b || typeof b !== 'object' || Array.isArray(b)) fail(400, 'Invalid request body');
  return b;
}

/** Coerce to a string, truncated to `max` characters. */
export function str(v, max = 2000) {
  if (v === undefined || v === null) return '';
  return String(v).slice(0, max);
}

/** Coerce to a rounded integer, falling back when the value is not finite. */
export function int(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

/** Coerce to a finite number, falling back when the value is not finite. */
export function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce to a boolean. */
export function bool(v) {
  return v === true || v === 1 || v === '1' || v === 'true';
}

/** Return `value` when it is in `list`, otherwise `fallback`. */
export function oneOf(value, list, fallback) {
  return list.includes(value) ? value : fallback;
}

/** Round a cent amount. */
export const money = (cents) => Math.round(num(cents));

/** Add `days` to a `YYYY-MM-DD` date, returning `YYYY-MM-DD`. */
export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days between two `YYYY-MM-DD` dates. */
export function daysBetween(a, b) {
  return Math.round(
    (new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000,
  );
}

/**
 * Validate an email address.
 *
 * Deliberately permissive: it checks the shape and length, not
 * deliverability. Returns the lower-cased address.
 */
export function validateEmail(value) {
  const email = str(value, 160).trim().toLowerCase();
  if (!email) fail(400, 'Valid email required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Valid email required');
  return email;
}

/**
 * Validate a password.
 *
 * Enforces a minimum length and a maximum length, and returns the value.
 */
export function validatePassword(value) {
  const password = str(value, 200);
  if (password.length < 8) fail(400, 'Password must be at least 8 characters');
  if (password.length > 200) fail(400, 'Password is too long');
  return password;
}

/**
 * Validate a currency code against an ISO 4217 allow-list.
 */
export function validateCurrency(value, fallback = 'USD') {
  const allowed = [
    'USD', 'EUR', 'GBP', 'BDT', 'INR', 'PKR', 'AED', 'SAR',
    'SGD', 'AUD', 'CAD', 'CHF', 'JPY', 'CNY', 'MYR', 'NPR', 'LKR',
  ];
  const code = str(value, 8).trim().toUpperCase();
  return allowed.includes(code) ? code : fallback;
}

/**
 * Normalise a phone number: digits, spaces, dashes and a leading plus.
 */
export function validatePhone(value) {
  const phone = str(value, 60).trim();
  if (!phone) return '';
  if (!/^[+0-9\s\-().]{3,60}$/.test(phone)) fail(400, 'Invalid phone number');
  return phone;
}

/**
 * Validate a hex colour such as `#1E3A5F`.
 */
export function validateHexColor(value, fallback = '#1E3A5F') {
  const color = str(value, 7).trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}
