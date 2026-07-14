import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import routes from './routes/index.js';
import healthRoutes from './routes/healthRoutes.js';
import requestLogger from './middlewares/requestLogger.js';
import authentication from './middlewares/authentication.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';
import { globalLimiter } from './middlewares/rateLimiters.js';

const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

// Static assets (docs pages + the embeddable devlogger-modal.js widget) are
// served BEFORE helmet so they keep permissive, cross-origin-embeddable headers
// and the docs' inline scripts/styles are not blocked by the API's strict CSP.
// Requests that don't match a file fall through to the hardened API below.
app.use(
  express.static(publicDir, {
    setHeaders: (res, filePath) => {
      // Allow other internal modules on any origin to load the widget.
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    },
  })
);

// Downloadable Postman files for teams that call the raw API instead of the
// widget. They live at the repo root (single source of truth) and are exposed
// here as public attachment downloads for the docs' "raw API" section.
const rootDir = path.join(__dirname, '..');
for (const file of [
  'DevLogger.postman_collection.json',
  'DevLogger.postman_environment.json',
]) {
  app.get(`/${file}`, (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.download(path.join(rootDir, file));
  });
}

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(globalLimiter);
app.use(requestLogger);

// Root-level health check for IIS/PM2 reverse proxy (http://localhost:PORT/health)
app.use('/health', healthRoutes);

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
