import { jest } from '@jest/globals';
import request from 'supertest';

process.setMaxListeners(20);

const REPORT_URL = '/api/v1/errors/report';

const sampleReport = {
  method: 'POST',
  url: 'http://localhost:3001/api/rpm-sessions/2/publish-sertifikat',
  status_code: 422,
  error_message: 'Cannot resolve QA_ID. Provide qa_id explicitly.',
  error_stack:
    'Error: Cannot resolve QA_ID\n    at resolveQaCandidate (src/services/rpmCalculation.service.js:333:9)',
  request_body: { qa_id: 'QA-RPM-000001' },
  headers: { 'content-type': 'application/json' },
  userid: 'SINCHEN',
  delegatedto: 'SINCHEN',
  auth_token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
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

describe('POST /api/v1/errors/report', () => {
  test('saves the error to the DB and sends an alert email', async () => {
    const sendMailMock = jest.fn().mockResolvedValue({
      messageId: 'report-message-id',
    });
    const { app, queryMock } = await loadApp({
      transporter: { sendMail: sendMailMock },
    });
    queryMock.mockResolvedValue([{ id: 9999 }]);

    const res = await request(app)
      .post(REPORT_URL)
      .send(sampleReport)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      messageId: 'report-message-id',
      saved_to_db: true,
      id: 9999,
    });
    expect(queryMock).toHaveBeenCalledTimes(1);

    const mailOptions = sendMailMock.mock.calls[0][0];
    expect(mailOptions.to).toEqual([
      'ITnotifLMS@lapilabs.co.id',
      'michael@mikelabs.cloud',
    ]);
    expect(mailOptions.subject).toContain('Error Alert #9999');
    expect(mailOptions.html).toContain(sampleReport.error_message);
    expect(mailOptions.text).toContain(sampleReport.url);
  });

  test('skips DB insert when save_to_db is false', async () => {
    const sendMailMock = jest.fn().mockResolvedValue({
      messageId: 'report-message-id-2',
    });
    const { app, queryMock } = await loadApp({
      transporter: { sendMail: sendMailMock },
    });

    const res = await request(app)
      .post(REPORT_URL)
      .send({ ...sampleReport, save_to_db: false })
      .expect(200);

    expect(res.body.data.saved_to_db).toBe(false);
    expect(res.body.data.id).toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });

  test('uses custom recipients and notes', async () => {
    const sendMailMock = jest.fn().mockResolvedValue({
      messageId: 'report-message-id-3',
    });
    const { app, queryMock } = await loadApp({
      transporter: { sendMail: sendMailMock },
    });
    queryMock.mockResolvedValue([{ id: 1000 }]);

    const res = await request(app)
      .post(REPORT_URL)
      .send({
        ...sampleReport,
        to: ['ops@example.com'],
        notes: 'Check RPM flow',
      })
      .expect(200);

    expect(res.body.data.recipients).toEqual(['ops@example.com']);

    const mailOptions = sendMailMock.mock.calls[0][0];
    expect(mailOptions.to).toEqual(['ops@example.com']);
    expect(mailOptions.html).toContain('Check RPM flow');
  });

  test('returns 503 when SMTP is not configured', async () => {
    const { app, queryMock } = await loadApp({ transporter: null });
    queryMock.mockResolvedValue([{ id: 1001 }]);

    const res = await request(app)
      .post(REPORT_URL)
      .send(sampleReport)
      .expect(503);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/smtp is not configured/i);
  });

  test('returns 400 for missing required fields', async () => {
    const { app } = await loadApp({
      transporter: { sendMail: jest.fn() },
    });

    const res = await request(app)
      .post(REPORT_URL)
      .send({ error_stack: 'missing url and message' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/validation error/i);
  });
});
