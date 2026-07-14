import sql from 'mssql';
import logger from './logger.js';
import config from './index.js';

const pools = {
  prod: null,
  dev: null,
};

const buildConfig = (isDev) => {
  const dbConfig = isDev ? config.db.dev : config.db.prod;
  return {
    server: dbConfig.server,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  };
};

export const connectDB = async (devmode = false) => {
  const mode = devmode ? 'dev' : 'prod';

  if (pools[mode]) {
    logger.warn(`Database connection pool for ${mode} already exists`);
    return pools[mode];
  }

  try {
    const pool = new sql.ConnectionPool(buildConfig(devmode));
    pools[mode] = await pool.connect();
    logger.info(`Database connection pool created for ${mode}`);
    return pools[mode];
  } catch (error) {
    logger.error(
      { err: error, mode },
      `Database connection failed for ${mode}`
    );
    throw error;
  }
};

export const query = async (sqlString, params = {}, devmode = false) => {
  const mode = devmode ? 'dev' : 'prod';

  if (!pools[mode]) {
    await connectDB(devmode);
  }

  const pool = pools[mode];

  try {
    const request = pool.request();
    for (const [paramName, value] of Object.entries(params)) {
      request.input(paramName, value);
    }
    const result = await request.query(sqlString);
    return result.recordset;
  } catch (error) {
    logger.error(
      { err: error, sql: sqlString, params, mode },
      'Database query failed'
    );
    throw error;
  }
};

export const closeDb = async () => {
  for (const [mode, pool] of Object.entries(pools)) {
    if (pool) {
      try {
        await pool.close();
        logger.info(`Database connection pool closed for ${mode}`);
      } catch (error) {
        logger.error(
          { err: error, mode },
          'Failed to close database connection pool'
        );
      }
    }
  }

  pools.prod = null;
  pools.dev = null;
};

export default { connectDB, query, closeDb };
