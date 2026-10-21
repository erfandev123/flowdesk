/**
 * Application configuration.
 *
 * Every tunable value lives here so nothing is hard-coded in a route
 * handler.
 */

export const PORT = Number(process.env.PORT || 4318);

/** Name of the session cookie. */
export const SESSION_COOKIE_NAME = 'fd_session';

/** Session lifetime in days. */
export const SESSION_DAYS = 30;

/** Maximum accepted request body size. */
export const BODY_LIMIT = '2mb';

/**
 * Whether cookies are marked `Secure`.
 *
 * On by default in production, because the session cookie must never travel
 * over plain HTTP. Set `COOKIE_SECURE=false` when testing a production build
 * over plain HTTP on localhost.
 */
export const COOKIE_SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production';

/**
 * `SameSite` policy for the session cookie.
 *
 * `strict` means the cookie is never sent on a cross-site request. Flowdesk
 * has no cross-site flows that depend on it — the client portal is scoped by
 * its own token and does not use the session cookie at all.
 */
export const COOKIE_SAME_SITE = 'strict';

/**
 * The demo account created by the seed script.
 *
 * These are demo-only values for a fictional sample workspace. They are
 * documented in `HowToSetup.md` and are meant to be deleted before any real
 * deployment.
 */
export const DEMO_ACCOUNT = {
  email: 'demo@flowdesk.app',
  password: 'demo1234',
  name: 'Demo Owner',
  businessName: 'Northlight Studio',
};
