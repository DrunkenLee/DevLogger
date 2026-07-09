/**
 * Custom API error class that carries an HTTP status code.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code.
   * @param {string} message - Error message.
   */
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';

    Error.captureStackTrace?.(this, this.constructor);
  }
}

export default ApiError;
