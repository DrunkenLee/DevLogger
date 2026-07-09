import { jest } from '@jest/globals';
import request from 'supertest';

// Each dynamic import of the app registers a process exit listener.
process.setMaxListeners(20);
import express from 'express';
import validate from '../src/middlewares/validate.js';
import errorHandler from '../src/middlewares/errorHandler.js';
import { sendErrorEmailSchema } from '../src/validators/emailSendValidator.js';

const ERROR_URL = '/api/v1/errors';

const buildValidationApp = () => {
  const app = express();
  app.use(express.json());
  app.post(
    '/api/v1/errors/:id/email',
    validate(sendErrorEmailSchema),
    (req, res) => {
      res.status(200).json({
        success: true,
        data: { body: req.body },
      });
    }
  );
  app.use(errorHandler);
  return app;
};

const sampleError = {
  id: 1,
  request_body: '{"foo":"bar"}',
  headers: '{"x-request-id":"abc"}',
  userid: 'user-1',
  delegatedto: 'admin',
  createdAt: '2024-01-15T08:30:00.000Z',
  updatedAt: '2024-01-15T08:30:00.000Z',
  method: 'POST',
  url: '/api/v1/orders',
  auth_token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  error_message: 'Connection timeout',
  error_stack: 'Error: Connection timeout\n    at handler (src/orders.js:12:5)',
  status_code: 500,
};

const loadApp = async ({ transporter } = {}) => {
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

  const { default: app } = await import('../src/app.js');
  return { app, queryMock };
};

describe('Error log email alert validation', () => {
  test('empty body is valid', () => {
    const result = sendErrorEmailSchema.parse({});
    expect(result).toEqual({});
  });

  test('body with valid recipients and notes is valid', () => {
    const payload = {
      to: ['dev1@example.com', 'dev2@example.com'],
      notes: 'This started after the last deploy.',
    };
    const result = sendErrorEmailSchema.parse(payload);
    expect(result).toEqual(payload);
  });

  test('body with non-array "to" fails validation', () => {
    expect(() =>
      sendErrorEmailSchema.parse({ to: 'dev1@example.com' })
    ).toThrow();
  });

  test('body with empty "to" array fails validation', () => {
    expect(() => sendErrorEmailSchema.parse({ to: [] })).toThrow();
  });

  test('body with invalid email address fails validation', () => {
    expect(() =>
      sendErrorEmailSchema.parse({ to: ['not-an-email'] })
    ).toThrow();
  });

  test('body with non-string notes fails validation', () => {
    expect(() => sendErrorEmailSchema.parse({ notes: 12345 })).toThrow();
  });

  test('middleware accepts a valid payload', async () => {
    const app = buildValidationApp();
    const res = await request(app)
      .post('/api/v1/errors/42/email')
      .send({
        to: ['dev1@example.com'],
        notes: 'Please investigate.',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.body.to).toEqual(['dev1@example.com']);
    expect(res.body.data.body.notes).toBe('Please investigate.');
  });

  test('middleware rejects an invalid payload with 400', async () => {
    const app = buildValidationApp();
    const res = await request(app)
      .post('/api/v1/errors/42/email')
      .send({ to: [] })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/validation error/i);
  });
});

describe('GET /api/v1/errors', () => {
  test('lists recent errors', async () => {
    const { app, queryMock } = await loadApp();
    queryMock.mockResolvedValue([sampleError]);

    const res = await request(app).get(ERROR_URL).expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toMatchObject({ id: sampleError.id });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  test('applies the status_code filter', async () => {
    const { app, queryMock } = await loadApp();
    queryMock.mockResolvedValue([sampleError]);

    const res = await request(app)
      .get(ERROR_URL)
      .query({ status_code: '500' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(queryMock).toHaveBeenCalledTimes(1);

    const [, params] = queryMock.mock.calls[0];
    expect(params).toHaveProperty('status_code', 500);
  });

  test('applies the search filter', async () => {
    const { app, queryMock } = await loadApp();
    queryMock.mockResolvedValue([sampleError]);

    await request(app).get(ERROR_URL).query({ search: 'timeout' }).expect(200);

    const [, params] = queryMock.mock.calls[0];
    expect(params).toHaveProperty('search', '%timeout%');
  });

  test('applies the from and to filters', async () => {
    const { app, queryMock } = await loadApp();
    queryMock.mockResolvedValue([sampleError]);

    await request(app)
      .get(ERROR_URL)
      .query({ from: '2024-01-01', to: '2024-01-31' })
      .expect(200);

    const [, params] = queryMock.mock.calls[0];
    expect(params).toHaveProperty('from', '2024-01-01');
    expect(params).toHaveProperty('to', '2024-01-31');
  });

  test('limits results and clamps values between 1 and 200', async () => {
    const { app, queryMock } = await loadApp();
    queryMock.mockResolvedValue([]);

    await request(app).get(ERROR_URL).query({ limit: '5' }).expect(200);
    const [, paramsLow] = queryMock.mock.calls[0];
    expect(paramsLow).toHaveProperty('limit', 5);

    await request(app).get(ERROR_URL).query({ limit: '999' }).expect(200);
    const [, paramsHigh] = queryMock.mock.calls[1];
    expect(paramsHigh).toHaveProperty('limit', 200);
  });
});

describe('GET /api/v1/errors/:id', () => {
  test('returns a single error by id', async () => {
    const { app, queryMock } = await loadApp();
    queryMock.mockResolvedValue([sampleError]);

    const res = await request(app).get(`${ERROR_URL}/1`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ id: 1 });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = @id'),
      { id: 1 }
    );
  });

  test('returns 404 when the error is not found', async () => {
    const { app, queryMock } = await loadApp();
    queryMock.mockResolvedValue([]);

    const res = await request(app).get(`${ERROR_URL}/99`).expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/error not found/i);
  });

  test('returns 400 for an invalid id', async () => {
    const { app } = await loadApp();
    const res = await request(app).get(`${ERROR_URL}/abc`).expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/id must be a positive integer/i);
  });
});

describe('POST /api/v1/errors/:id/email', () => {
  test('sends an alert email to default recipients', async () => {
    const sendMailMock = jest.fn().mockResolvedValue({
      messageId: 'mock-message-id',
    });
    const { app, queryMock } = await loadApp({
      transporter: { sendMail: sendMailMock },
    });
    queryMock.mockResolvedValue([sampleError]);

    const res = await request(app)
      .post(`${ERROR_URL}/1/email`)
      .send({})
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      messageId: 'mock-message-id',
      recipients: ['ITnotifLMS@lapilabs.co.id', 'michael@mikelabs.cloud'],
    });
    expect(sendMailMock).toHaveBeenCalledTimes(1);

    const mailOptions = sendMailMock.mock.calls[0][0];
    expect(mailOptions.to).toEqual(res.body.data.recipients);
    expect(mailOptions.subject).toContain('Error Alert #1');
    expect(mailOptions.html).toContain(sampleError.error_message);
  });

  test('uses custom recipients and notes when provided', async () => {
    const sendMailMock = jest.fn().mockResolvedValue({
      messageId: 'mock-message-id-2',
    });
    const { app, queryMock } = await loadApp({
      transporter: { sendMail: sendMailMock },
    });
    queryMock.mockResolvedValue([sampleError]);

    const res = await request(app)
      .post(`${ERROR_URL}/1/email`)
      .send({
        to: ['ops@example.com'],
        notes: 'Check the database pool.',
      })
      .expect(200);

    expect(res.body.data.recipients).toEqual(['ops@example.com']);

    const mailOptions = sendMailMock.mock.calls[0][0];
    expect(mailOptions.to).toEqual(['ops@example.com']);
    expect(mailOptions.html).toContain('Check the database pool.');
  });

  test('returns 503 when SMTP is not configured', async () => {
    const { app, queryMock } = await loadApp({ transporter: null });
    queryMock.mockResolvedValue([sampleError]);

    const res = await request(app)
      .post(`${ERROR_URL}/1/email`)
      .send({})
      .expect(503);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/smtp is not configured/i);
  });

  test('returns 404 when the error does not exist', async () => {
    const sendMailMock = jest.fn().mockResolvedValue({
      messageId: 'mock-message-id',
    });
    const { app, queryMock } = await loadApp({
      transporter: { sendMail: sendMailMock },
    });
    queryMock.mockResolvedValue([]);

    const res = await request(app)
      .post(`${ERROR_URL}/99/email`)
      .send({})
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/error not found/i);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  test('returns 400 for an invalid id', async () => {
    const { app } = await loadApp({ transporter: { sendMail: jest.fn() } });
    const res = await request(app)
      .post(`${ERROR_URL}/abc/email`)
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/id must be a positive integer/i);
  });

  test('returns 400 for an invalid request body', async () => {
    const { app } = await loadApp({ transporter: { sendMail: jest.fn() } });
    const res = await request(app)
      .post(`${ERROR_URL}/1/email`)
      .send({ to: ['not-an-email'] })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/validation error/i);
  });
});
