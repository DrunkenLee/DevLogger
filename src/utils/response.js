/**
 * Builds a standardized successful JSON response body.
 *
 * @template T
 * @param {T} data - Response payload.
 * @param {string} [message='Success'] - Human-readable message.
 * @returns {{ success: true, data: T, message: string }}
 */
export const success = (data, message = 'Success') => ({
  success: true,
  data,
  message,
});
