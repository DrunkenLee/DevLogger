import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import authentication from '../src/middlewares/authentication.js';
import errorHandler from '../src/middlewares/errorHandler.js';
import config from '../src/config/index.js';
import { loadApp } from './loadApp.js';

const buildAuthApp = () => {
  const app = express();
  app.use(express.json());
  app.use(authentication);
  app.get('/protected', (req, res) => {
    res.status(200).json({ success: true, user: req.user });
  });
  app.use(errorHandler);
  return app;
};

describe('authentication middleware', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns 401 when no token is provided', async () => {
    const app = buildAuthApp();

    const res = await request(app).get('/protected').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/unauthorized/i);
  });

  test('returns 401 when the LMS decode response has no log_NIK', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ user: { Nama: 'Unknown' } }),
    });

    const app = buildAuthApp();
    const res = await request(app)
      .get('/protected')
      .set('authentication', 'invalid-token')
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  test('allows the request and maps req.user when token is valid', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        user: {
          log_NIK: 'TEST-001',
          Nama: 'Test User',
          Inisial_Name: 'TU',
          emp_JobLevelID: '5',
          emp_DeptID: 'IT',
        },
        delegatedTo: { log_NIK: 'DELEGATED-001' },
      }),
    });

    const app = buildAuthApp();
    const res = await request(app)
      .get('/protected')
      .set('authentication', 'valid-token')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.user).toMatchObject({
      user_id: 'TEST-001',
      nama_user: 'Test User',
      inisial_user: 'TU',
      jabatan_user: '5',
      joblevel_id_user: 5,
      bagian_user: 'IT',
      delegated_to: 'DELEGATED-001',
    });
  });

  test('strips the Bearer prefix from the Authorization header', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        user: { log_NIK: 'TEST-002' },
      }),
    });

    const app = buildAuthApp();
    await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer bearer-token')
      .expect(200);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { access_token: 'bearer-token' },
      })
    );
  });

  test('uses the live decode URL by default', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        user: { log_NIK: 'TEST-003' },
      }),
    });

    const app = buildAuthApp();
    await request(app)
      .get('/protected')
      .set('authentication', 'valid-token')
      .expect(200);

    expect(global.fetch).toHaveBeenCalledWith(
      config.lmsDecodeUrl,
      expect.any(Object)
    );
  });

  test('uses the dev decode URL when devmode=true', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        user: { log_NIK: 'TEST-004' },
      }),
    });

    const app = buildAuthApp();
    await request(app)
      .get('/protected?devmode=true')
      .set('authentication', 'valid-token')
      .expect(200);

    expect(global.fetch).toHaveBeenCalledWith(
      config.lmsDevDecodeUrl,
      expect.any(Object)
    );
  });

  test('forwards fetch errors to the error handler', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));

    const app = buildAuthApp();
    const res = await request(app)
      .get('/protected')
      .set('authentication', 'valid-token')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

describe('authentication wiring in app.js', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('GET /api/v1/health is reachable without authentication', async () => {
    const { app } = await loadApp({ mockAuth: false });

    const res = await request(app).get('/api/v1/health').expect(200);
    expect(res.body.success).toBe(true);
  });

  test('protected routes require authentication', async () => {
    const { app, queryMock } = await loadApp({ mockAuth: false });
    queryMock.mockResolvedValue([]);

    const res = await request(app).get('/api/v1/errors').expect(401);
    expect(res.body.success).toBe(false);
  });

  test('protected routes accept a valid authentication header', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        user: { log_NIK: 'TEST-001', Nama: 'Test User' },
      }),
    });

    const { app, queryMock } = await loadApp({ mockAuth: false });
    queryMock.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/errors')
      .set('authentication', 'valid-token')
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});
