import pino from 'pino';
import config from './index.js';

const logger = pino({
  level: config.logLevel,
});

export default logger;
