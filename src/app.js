import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import routes from './routes/index.js';
import requestLogger from './middlewares/requestLogger.js';
import authentication from './middlewares/authentication.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';
import { globalLimiter } from './middlewares/rateLimiters.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(globalLimiter);
app.use(requestLogger);

const authUnlessHealth = (req, res, next) => {
  if (req.path.startsWith('/health')) {
    return next();
  }
  return authentication(req, res, next);
};

app.use(`/api/${config.apiVersion}`, authUnlessHealth, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
