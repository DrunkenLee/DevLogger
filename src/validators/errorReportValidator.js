import { z } from 'zod';

/**
 * Validates the request body for POST /api/v1/errors/report.
 *
 * This is the fallback endpoint for apps that do not write errors to
 * `logging_mike` themselves. The client sends the full error context and
 * DevLogger both persists it and sends an alert email.
 */
export const errorReportSchema = z.object({
  method: z.string().max(20).optional().default('POST'),
  url: z.string().min(1, 'url is required'),
  status_code: z.coerce.number().int().min(100).max(599).optional(),
  error_message: z.string().min(1, 'error_message is required'),
  error_stack: z.string().optional(),
  request_body: z.union([z.string(), z.record(z.any())]).optional(),
  headers: z.union([z.string(), z.record(z.any())]).optional(),
  userid: z.string().optional(),
  delegatedto: z.string().optional(),
  auth_token: z.string().optional(),
  notes: z.string().optional(),
  to: z
    .array(z.string().email('must be a valid email address'))
    .min(1, 'must contain at least one recipient')
    .optional(),
  save_to_db: z.boolean().optional().default(true),
});
