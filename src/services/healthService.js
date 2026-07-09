import config from '../config/index.js';

export const getHealth = async () => ({
  status: 'ok',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
  version: config.version,
});
