import app from './app.js';
import config from './config/index.js';
import logger from './config/logger.js';
import { connectDB } from './config/db.js';

const startServer = async () => {
  try {
    await connectDB();

    app.listen(config.port, () => {
      logger.info(
        `DevLogger server running in ${config.nodeEnv} mode on port ${config.port}`
      );
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
