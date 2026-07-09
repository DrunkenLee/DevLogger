import request from 'supertest';
import app from '../src/app.js';

describe('Health API', () => {
  test('GET /api/v1/health returns service status', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      status: 'ok',
    });
    expect(res.body.data).toHaveProperty('uptime');
    expect(res.body.data).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('version');
  });

  test('undefined routes return a standardized 404 response', async () => {
    const res = await request(app).get('/api/v1/not-a-real-route').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  });
});
