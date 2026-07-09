import request from 'supertest';
import app from '../src/app.js';

const LOGS_URL = '/api/v1/logs';

describe('Logs API', () => {
  test('GET /api/v1/logs returns a list of logs', async () => {
    const res = await request(app).get(LOGS_URL).expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/v1/logs creates a new log entry', async () => {
    const payload = {
      level: 'info',
      message: 'Jest test log',
      meta: { source: 'jest' },
    };

    const res = await request(app).post(LOGS_URL).send(payload).expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      level: payload.level,
      message: payload.message,
      meta: payload.meta,
    });
    expect(typeof res.body.data.id).toBe('string');
  });

  test('POST /api/v1/logs rejects invalid payloads with 400', async () => {
    const res = await request(app)
      .post(LOGS_URL)
      .send({ level: 'critical', message: '' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  });

  test('full log lifecycle: create, read, delete', async () => {
    const createRes = await request(app)
      .post(LOGS_URL)
      .send({ level: 'debug', message: 'Lifecycle log' })
      .expect(201);

    const { id } = createRes.body.data;

    const getRes = await request(app).get(`${LOGS_URL}/${id}`).expect(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.id).toBe(id);

    await request(app).delete(`${LOGS_URL}/${id}`).expect(200);

    await request(app).get(`${LOGS_URL}/${id}`).expect(404);
  });
});
