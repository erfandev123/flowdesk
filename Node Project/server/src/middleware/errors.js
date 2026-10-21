/**
 * HTTP error type and helper.
 *
 * Throwing an `HttpError` anywhere in a route aborts the handler and is
 * converted into a JSON error response by the error middleware in server.js.
 */
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    Object.assign(this, extra);
  }
}

/** Throw an `HttpError` with the given status and message. */
export const fail = (status, message, extra) => {
  throw new HttpError(status, message, extra);
};
