import { jest } from '@jest/globals';
import mockAuthentication from './__mocks__/authentication.js';

export const loadApp = async ({ transporter, mockAuth = true } = {}) => {
  jest.resetModules();
  jest.clearAllMocks();

  const queryMock = jest.fn();

  await jest.unstable_mockModule('../src/config/db.js', () => ({
    connectDB: jest.fn(),
    query: queryMock,
    closeDb: jest.fn(),
  }));

  await jest.unstable_mockModule('../src/config/email.js', () => ({
    default: transporter ?? null,
  }));

  if (mockAuth) {
    await jest.unstable_mockModule(
      '../src/middlewares/authentication.js',
      () => ({
        default: mockAuthentication,
      })
    );
  }

  const { default: app } = await import('../src/app.js');
  return { app, queryMock };
};

export const resetEmailLimiter = async () => {
  const { emailLimiter } = await import('../src/middlewares/rateLimiters.js');
  emailLimiter.resetKey('::ffff:127.0.0.1');
  emailLimiter.resetKey('127.0.0.1');
};
