import sql from 'mssql';
import logger from './logger.js';

let pool = null;

const dbConfig = {
  server: process.env.MS_SQL_DB_SERVER,
  database: process.env.MS_SQL_DB_NAME,
  user: process.env.MS_SQL_DB_USER,
  password: process.env.MS_SQL_DB_PWD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

export const connectDB = async () => {
  if (pool) {
    logger.warn('Database connection pool already exists');
    return pool;
  }

  try {
    pool = await sql.connect(dbConfig);
    logger.info('Database connection pool created');
    return pool;
  } catch (error) {
    logger.error({ err: error }, 'Database connection failed');
    throw error;
  }
};

export const query = async (sqlString, params = {}) => {
  if (!pool) {
    await connectDB();
  }

  try {
    const request = pool.request();
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
    const result = await request.query(sqlString);
    return result.recordset;
  } catch (error) {
    logger.error(
      { err: error, sql: sqlString, params },
      'Database query failed'
    );
    throw error;
  }
};

export const closeDb = async () => {
  if (!pool) {
    return;
  }

  try {
    await pool.close();
    pool = null;
    logger.info('Database connection pool closed');
  } catch (error) {
    logger.error({ err: error }, 'Failed to close database connection pool');
    throw error;
  }
};

export default { connectDB, query, closeDb };
