import { query } from '../config/db.js';
import transporter from '../config/email.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import ApiError from '../utils/ApiError.js';
import { buildEmailHtml, buildEmailText } from '../utils/errorEmailBuilder.js';

const DEFAULT_RECIPIENTS = [
  'ITnotifLMS@lapilabs.co.id',
  'michael@mikelabs.cloud',
];

const getRecipients = (bodyTo) => {
  if (bodyTo && bodyTo.length > 0) {
    return bodyTo;
  }

  const envRecipients = process.env.DEV_EMAIL_RECIPIENTS;
  if (envRecipients) {
    return envRecipients
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }

  return DEFAULT_RECIPIENTS;
};

const stringify = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const insertErrorLog = async (payload) => {
  const sql = `
    INSERT INTO dbo.logging_mike (
      request_body,
      headers,
      userid,
      delegatedto,
      createdAt,
      updatedAt,
      method,
      url,
      auth_token,
      error_message,
      error_stack,
      status_code
    )
    OUTPUT INSERTED.id
    VALUES (
      @request_body,
      @headers,
      @userid,
      @delegatedto,
      SYSDATETIMEOFFSET(),
      SYSDATETIMEOFFSET(),
      @method,
      @url,
      @auth_token,
      @error_message,
      @error_stack,
      @status_code
    )
  `;

  const result = await query(sql, {
    request_body: stringify(payload.request_body),
    headers: stringify(payload.headers),
    userid: payload.userid ?? null,
    delegatedto: payload.delegatedto ?? null,
    method: payload.method,
    url: payload.url,
    auth_token: payload.auth_token ?? null,
    error_message: payload.error_message,
    error_stack: payload.error_stack ?? null,
    status_code: payload.status_code ?? null,
  });

  return result[0]?.id ?? null;
};

export const reportError = asyncHandler(async (req, res) => {
  const { to, notes, save_to_db: saveToDb, ...errorPayload } = req.body;

  let insertedId = null;
  if (saveToDb) {
    insertedId = await insertErrorLog(errorPayload);
  }

  if (!transporter) {
    throw new ApiError(503, 'SMTP is not configured');
  }

  const error = {
    id: insertedId,
    method: errorPayload.method,
    url: errorPayload.url,
    status_code: errorPayload.status_code ?? null,
    error_message: errorPayload.error_message,
    error_stack: errorPayload.error_stack ?? null,
    request_body: errorPayload.request_body ?? null,
    headers: errorPayload.headers ?? null,
    userid: errorPayload.userid ?? null,
    delegatedto: errorPayload.delegatedto ?? null,
    auth_token: errorPayload.auth_token ?? null,
    createdAt: new Date().toISOString(),
  };

  const recipients = getRecipients(to);

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || 'devlogger@lapilabs.co.id',
    to: recipients,
    subject: `[DevLogger] Error Alert #${insertedId ?? 'reported'} - ${error.method ?? 'UNKNOWN'} ${error.url ?? ''}`,
    text: buildEmailText(error, notes),
    html: buildEmailHtml(error, notes),
  });

  res.status(200).json(
    success(
      {
        messageId: info.messageId,
        recipients,
        saved_to_db: saveToDb,
        id: insertedId,
      },
      'Error reported and alert sent'
    )
  );
});
