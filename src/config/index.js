import dotenv from 'dotenv';

dotenv.config({ override: true });

const requiredEnv = [];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  logLevel: process.env.LOG_LEVEL || 'info',
  apiVersion: 'v1',
  version: process.env.npm_package_version || '1.0.0',
  lmsDecodeUrl:
    process.env.LMS_DECODE_URL || 'http://192.168.1.38/api/lms-dev/v1/decode',
  db: {
    prod: {
      server: process.env.MS_SQL_DB_SERVER || '',
      database: process.env.MS_SQL_DB_NAME || '',
      user: process.env.MS_SQL_DB_USER || '',
      password: process.env.MS_SQL_DB_PWD || '',
      port: Number(process.env.MS_SQL_DB_PORT) || 1433,
    },
    dev: {
      server:
        process.env.MS_SQL_DEV_DB_SERVER || process.env.MS_SQL_DB_SERVER || '',
      database:
        process.env.MS_SQL_DEV_DB_NAME || process.env.MS_SQL_DB_NAME || '',
      user: process.env.MS_SQL_DEV_DB_USER || process.env.MS_SQL_DB_USER || '',
      password:
        process.env.MS_SQL_DEV_DB_PWD || process.env.MS_SQL_DB_PWD || '',
      port:
        Number(process.env.MS_SQL_DEV_DB_PORT || process.env.MS_SQL_DB_PORT) ||
        1433,
    },
  },
  email: {
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'devlogger@lapilabs.co.id',
    devRecipients: process.env.DEV_EMAIL_RECIPIENTS
      ? process.env.DEV_EMAIL_RECIPIENTS.split(',')
          .map((r) => r.trim())
          .filter(Boolean)
      : ['ITnotifLMS@lapilabs.co.id', 'michael@mikelabs.cloud'],
  },
};

export default config;
