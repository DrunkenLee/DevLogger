# DevLogger

A minimal Node.js backend boilerplate using Express, Pino, Zod, and Jest with native ES modules.

## Features

- ES modules (`import`/`export`) across the whole project
- Express server with Helmet, CORS, compression, cookie parsing, and rate limiting
- Bearer token authentication backed by an external LMS decode service
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
  public/
    index.html            # docs & landing page
    workflow.html         # end-to-end workflow page
    devlogger-modal.js    # the reusable error modal widget
    assets/
      site.css
      site.js
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

## Authentication

All routes under `/api/v1` require authentication except `GET /api/v1/health`. The server validates the incoming token by calling the LMS decode endpoint configured in `LMS_DECODE_URL`.

Send the token in either of these headers:

```http
authentication: <token>
```

or

```http
Authorization: Bearer <token>
```

The `authentication` header takes precedence. If the `Authorization` header is used, the `Bearer ` prefix is stripped automatically.

Requests without a token, with an invalid token, or when the LMS decode service is unreachable return `401 Unauthorized`.

## Rate Limiting

A global rate limiter runs before authentication:

- **All requests:** 100 requests per 15 minutes per IP.

Email endpoints have an additional, stricter limit:

- **Email endpoints:** 10 requests per 15 minutes per IP for:
  - `POST /api/v1/errors/:id/email`
  - `POST /api/v1/errors/report`

When a limit is exceeded the response is:

```json
{
  "success": false,
  "message": "Too many requests, please try again later.",
  "data": null
}
```

## LMS Decode Dependency

Authentication relies on an external LMS decode service. The default URL is:

```text
http://192.168.1.38/api/lms-dev/v1/decode
```

Override it with the `LMS_DECODE_URL` environment variable. The service must accept a `GET` request with the token passed in the `access_token` header and return a user object containing `log_NIK`. The decode call times out after 5 seconds.

## Environment Variables

| Variable               | Default                                            | Description                                               |
| ---------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| `NODE_ENV`             | `development`                                      | Application environment                                   |
| `PORT`                 | `3000`                                             | Port the server listens on                                |
| `LOG_LEVEL`            | `info`                                             | Pino log level (trace, debug, info, warn, error, fatal)   |
| `LMS_DECODE_URL`       | `http://192.168.1.38/api/lms-dev/v1/decode`        | External LMS token decode endpoint                        |
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

All endpoints except `GET /api/v1/health` require an authentication header.

- `GET /api/v1/health` - Health check
- `GET /api/v1/logs` - List all logs
- `POST /api/v1/logs` - Create a new log
- `GET /api/v1/logs/:id` - Get a log by ID
- `DELETE /api/v1/logs/:id` - Delete a log by ID
- `GET /api/v1/errors` - List recent errors from `logging_mike` (supports `limit`, `status_code`, `search`, `from`, `to`)
- `GET /api/v1/errors/:id` - Get a single error by ID
- `POST /api/v1/errors/:id/email` - Send a full-context alert email for an existing error row (also limited to 10 req / 15 min per IP)
- `POST /api/v1/errors/report` - Fallback: receive error context from the client, save it to `logging_mike`, and send an alert email (also limited to 10 req / 15 min per IP)

## Client Error Modal Widget

DevLogger also ships a **reusable, framework-agnostic error modal** so every internal
module reports errors the same way. It is a single self-contained file that injects its
own styles and exposes one global, `DevLoggerModal`.

The DevLogger server serves the widget and its documentation as static files:

| URL                   | What it is                                                        |
| --------------------- | ----------------------------------------------------------------- |
| `/`                   | Docs & landing page — quickstart, copy-paste snippet, live demo   |
| `/workflow.html`      | Workflow page — how a report flows end-to-end and why it helps    |
| `/devlogger-modal.js` | The drop-in widget (served with cross-origin, embeddable headers) |

Static assets under `public/` are served **before** Helmet with permissive,
cross-origin headers so the widget can be loaded by modules on any origin, and so the
docs pages' inline scripts/styles are not blocked by the API's strict CSP. Requests that
don't match a file fall through to the authenticated API.

### Using the widget in a module

```html
<!-- 1. Load once per page -->
<script src="https://YOUR-DEVLOGGER-HOST/devlogger-modal.js"></script>

<script>
  // 2. Configure once at startup
  DevLoggerModal.init({
    apiBaseUrl: 'https://YOUR-DEVLOGGER-HOST/api/v1',
    token: window.LMS_TOKEN, // the logged-in LMS token
    appName: 'Nama Modul Anda',
  });

  // 3. Show it whenever something fails
  try {
    // ...
  } catch (err) {
    DevLoggerModal.showError({
      title: 'Gagal Menyimpan Data',
      message: 'Data belum tersimpan. Silakan coba lagi atau laporkan ke IT.',
      error: {
        url: '/api/orders',
        method: 'POST',
        status_code: err.status,
        error_message: err.message,
        error_stack: err.stack,
      },
    });
  }
</script>
```

The modal shows two buttons: **"Mengerti"** closes it, and **"Laporkan ke IT"** posts the
full error context to `POST /api/v1/errors/report` (saving it to `logging_mike` and
emailing IT), then confirms with the returned reference number. Full option reference is on
the docs page at `/`.
