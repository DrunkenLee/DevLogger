# DevLogger

A minimal Node.js backend boilerplate using Express, Pino, Zod, and Jest with native ES modules.

## Features

- ES modules (`import`/`export`) across the whole project
- Express server with Helmet, CORS, compression, cookie parsing, and rate limiting
- Structured logging with Pino
- Centralized error handling with a custom `ApiError` class
- Zod validation for incoming request bodies
- In-memory "logs" resource for quick prototyping
- MSSQL-backed error log alerts from `logging_mike`
- Nodemailer integration for full-context developer alert emails
- Jest + Supertest test setup configured for ESM

## Project Structure

```
DevLogger/
  package.json
  .env
  .env.example
  .gitignore
  README.md
  eslint.config.js
  jest.config.js
  src/
    app.js
    server.js
    config/
      index.js
      logger.js
      db.js
      email.js
    constants/
      httpStatus.js
    controllers/
      errorLogController.js
      errorReportController.js
      healthController.js
      logController.js
    middlewares/
      errorHandler.js
      notFound.js
      requestLogger.js
      validate.js
    routes/
      index.js
      errorLogRoutes.js
      healthRoutes.js
      logRoutes.js
    services/
      healthService.js
      logService.js
    utils/
      ApiError.js
      asyncHandler.js
      response.js
    validators/
      logValidator.js
      emailSendValidator.js
      errorReportValidator.js
  tests/
    health.test.js
    logs.test.js
    errorLogs.test.js
```

## Getting Started

1. Copy the environment example file:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000/api/v1` by default.

## Available Scripts

| Script             | Description                                 |
| ------------------ | ------------------------------------------- |
| `npm start`        | Run the server in production mode           |
| `npm run dev`      | Run the server with nodemon for development |
| `npm test`         | Run the Jest test suite with ESM support    |
| `npm run lint`     | Lint all source and test files              |
| `npm run lint:fix` | Lint and automatically fix issues           |

## Environment Variables

| Variable               | Default                                            | Description                                               |
| ---------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| `NODE_ENV`             | `development`                                      | Application environment                                   |
| `PORT`                 | `3000`                                             | Port the server listens on                                |
| `LOG_LEVEL`            | `info`                                             | Pino log level (trace, debug, info, warn, error, fatal)   |
| `MS_SQL_DB_SERVER`     | —                                                  | MSSQL server hostname/instance                            |
| `MS_SQL_DB_NAME`       | —                                                  | MSSQL database name (e.g., `lapifactory`)                 |
| `MS_SQL_DB_USER`       | —                                                  | MSSQL username                                            |
| `MS_SQL_DB_PWD`        | —                                                  | MSSQL password                                            |
| `SMTP_HOST`            | —                                                  | SMTP server hostname                                      |
| `SMTP_PORT`            | —                                                  | SMTP server port                                          |
| `SMTP_SECURE`          | `false`                                            | Use TLS for SMTP (`true`/`false`)                         |
| `SMTP_USER`            | —                                                  | SMTP authentication username                              |
| `SMTP_PASS`            | —                                                  | SMTP authentication password                              |
| `SMTP_FROM`            | `devlogger@lapilabs.co.id`                         | Default "From" address for alert emails                   |
| `DEV_EMAIL_RECIPIENTS` | `ITnotifLMS@lapilabs.co.id,michael@mikelabs.cloud` | Comma-separated default recipients for error alert emails |

## API Endpoints

- `GET /api/v1/health` - Health check
- `GET /api/v1/logs` - List all logs
- `POST /api/v1/logs` - Create a new log
- `GET /api/v1/logs/:id` - Get a log by ID
- `DELETE /api/v1/logs/:id` - Delete a log by ID
- `GET /api/v1/errors` - List recent errors from `logging_mike` (supports `limit`, `status_code`, `search`, `from`, `to`)
- `GET /api/v1/errors/:id` - Get a single error by ID
- `POST /api/v1/errors/:id/email` - Send a full-context alert email for an existing error row
- `POST /api/v1/errors/report` - Fallback: receive error context from the client, save it to `logging_mike`, and send an alert email
