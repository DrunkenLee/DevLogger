import { z } from 'zod';

/**
 * Validates the request body for POST /api/v1/errors/:id/email.
 *
 * - `to` is optional, but when provided it must be a non-empty array of valid
 *   email addresses.
 * - `notes` is an optional string that is appended to the alert email.
 */
export const sendErrorEmailSchema = z.object({
  to: z
    .array(z.string().email('must be a valid email address'))
    .min(1, 'must contain at least one recipient')
    .optional(),
  notes: z.string().optional(),
});
