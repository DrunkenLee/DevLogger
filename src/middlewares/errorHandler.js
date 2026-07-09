import config from '../config/index.js';
import logger from '../config/logger.js';

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(
    {
      err: {
        message: err.message,
        statusCode,
        stack: err.stack,
      },
      method: req.method,
      url: req.originalUrl,
    },
    'request failed'
  );

  const response = {
    success: false,
    message,
  };

  if (config.nodeEnv === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
