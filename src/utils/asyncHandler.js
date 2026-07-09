/**
 * Wraps an async Express route handler so that rejected promises
 * are forwarded to the centralized error handler via `next()`.
 *
 * @param {Function} fn - Async route handler (req, res, next) => Promise.
 * @returns {Function} Express-compatible middleware.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
