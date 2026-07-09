import rateLimit from 'express-rate-limit';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const standardLimitResponse = () => ({
  success: false,
  message: 'Too many requests, please try again later.',
  data: null,
});

/**
 * Global gentle limiter applied to all requests.
 * Keeps the existing 100 requests per 15 minutes window.
 */
export const globalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: standardLimitResponse(),
});

/**
 * Stricter limiter for email-sending endpoints.
 * Limits POST /api/v1/errors/:id/email and POST /api/v1/errors/report
 * to 10 requests per 15 minutes per IP.
 */
export const emailLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: standardLimitResponse(),
});

export default { globalLimiter, emailLimiter };
