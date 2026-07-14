import config, { getConfigSummary } from '../src/config/index.js';

describe('Application configuration', () => {
  test('production and dev database servers are resolved to different hosts', () => {
    expect(config.db.prod.server).toBeTruthy();
    expect(config.db.dev.server).toBeTruthy();
    expect(config.db.prod.server).not.toEqual(config.db.dev.server);
  });

  test('config summary exposes servers but omits passwords', () => {
    const summary = getConfigSummary();

    expect(summary.db.prod).toHaveProperty('server');
    expect(summary.db.prod).toHaveProperty('database');
    expect(summary.db.prod).toHaveProperty('port');
    expect(summary.db.prod).not.toHaveProperty('password');

    expect(summary.db.dev).toHaveProperty('server');
    expect(summary.db.dev).toHaveProperty('database');
    expect(summary.db.dev).toHaveProperty('port');
    expect(summary.db.dev).not.toHaveProperty('password');
  });
});
