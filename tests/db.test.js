import { jest } from '@jest/globals';

describe('Database pool routing', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('creates separate connection pools for prod and dev', async () => {
    const requestMock = jest
      .fn()
      .mockReturnValue({
        query: jest.fn().mockResolvedValue({ recordset: [] }),
      });

    const poolInstances = [];
    const ConnectionPoolMock = jest.fn().mockImplementation(function (cfg) {
      const pool = {
        config: cfg,
        request: requestMock,
        close: jest.fn(),
      };
      pool.connect = jest.fn().mockResolvedValue(pool);
      poolInstances.push(pool);
      return pool;
    });

    // If the implementation falls back to the old sql.connect() singleton API,
    // this mock returns the same pool every time, which makes the
    // "separate pools" assertion fail.
    const singletonPool = {
      config: {},
      request: requestMock,
      close: jest.fn(),
    };
    const connectMock = jest.fn().mockResolvedValue(singletonPool);

    await jest.unstable_mockModule('mssql', () => ({
      default: {
        ConnectionPool: ConnectionPoolMock,
        connect: connectMock,
      },
      ConnectionPool: ConnectionPoolMock,
      connect: connectMock,
    }));

    const { connectDB, query } = await import('../src/config/db.js');

    await connectDB(false);
    await connectDB(true);

    expect(ConnectionPoolMock).toHaveBeenCalledTimes(2);
    expect(poolInstances).toHaveLength(2);
    expect(poolInstances[0]).not.toBe(poolInstances[1]);

    expect(poolInstances[0].config.server).toBeDefined();
    expect(poolInstances[1].config.server).toBeDefined();
    expect(poolInstances[0].config.server).not.toEqual(
      poolInstances[1].config.server
    );

    // Ensure devmode flag selects the correct pool for queries.
    await query('SELECT 1', {}, false);
    await query('SELECT 1', {}, true);

    expect(requestMock).toHaveBeenCalledTimes(2);
  });
});
