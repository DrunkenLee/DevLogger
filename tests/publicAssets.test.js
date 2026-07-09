import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { loadApp } from './loadApp.js';

describe('public static assets (docs + widget)', () => {
  let app;

  beforeAll(async () => {
    ({ app } = await loadApp());
  });

  it('serves the docs landing page at / without auth', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('DevLoggerModal');
  });

  it('serves the workflow page without auth', async () => {
    const res = await request(app).get('/workflow.html');
    expect(res.status).toBe(200);
    expect(res.text).toContain('From a broken screen');
  });

  it('serves the widget as embeddable, cross-origin JS', async () => {
    const res = await request(app).get('/devlogger-modal.js');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/javascript/);
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.text).toContain('DevLoggerModal');
  });

  it('serves the shared stylesheet', async () => {
    const res = await request(app).get('/assets/site.css');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/css/);
  });

  it('still 404s unknown API paths through the hardened stack', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
  });
});
