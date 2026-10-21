/**
 * Shared configuration for the QA and verification scripts.
 *
 * Demo credentials are read from the environment so nothing sensitive is
 * hard-coded in a script. Set them before running:
 *
 *   DEMO_EMAIL=demo@flowdesk.app DEMO_PASSWORD=demo1234 node scripts/capture-auth.js
 *
 * When they are not set, the values below are used as a fallback so the
 * scripts still work out of the box against the bundled demo workspace.
 */

export const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@flowdesk.app';
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo1234';

/** Base URL of a running Flowdesk instance. */
export const BASE_URL = process.env.FLOWDESK_URL || 'http://127.0.0.1:4318';
