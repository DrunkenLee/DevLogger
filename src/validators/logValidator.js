import { z } from 'zod';

export const createLogSchema = z.object({
  level: z.enum(['info', 'warn', 'error', 'debug']),
  message: z.string().min(1, 'message is required'),
  meta: z.record(z.any()).optional(),
});
