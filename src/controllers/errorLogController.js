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

const parseId = (rawId) => {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, 'id must be a positive integer');
  }
  return id;
};

const parseLimit = (rawLimit) => {
  const parsed = Number(rawLimit);
  const limit = Number.isInteger(parsed) ? parsed : 50;
  return Math.min(Math.max(limit, 1), 200);
};

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

export const getErrors = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit);
  const { status_code: rawStatusCode, search, from, to } = req.query;

  let sql = 'SELECT TOP (@limit) * FROM dbo.logging_mike WHERE 1=1';
  const params = { limit };

  if (rawStatusCode !== undefined && rawStatusCode !== '') {
    const statusCode = Number(rawStatusCode);
    if (!Number.isNaN(statusCode)) {
      sql += ' AND status_code = @status_code';
      params.status_code = statusCode;
    }
  }

  if (search) {
    sql += ' AND error_message LIKE @search';
    params.search = `%${search}%`;
  }

  if (from) {
    sql += ' AND createdAt >= @from';
    params.from = from;
  }

  if (to) {
    sql += ' AND createdAt <= @to';
    params.to = to;
  }

  sql += ' ORDER BY createdAt DESC';

  const errors = await query(sql, params);
  res.status(200).json(success(errors, 'Errors retrieved successfully'));
});

export const getErrorById = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const [error] = await query('SELECT * FROM dbo.logging_mike WHERE id = @id', {
    id,
  });

  if (!error) {
    throw new ApiError(404, 'Error not found');
  }

  res.status(200).json(success(error, 'Error retrieved successfully'));
});

export const sendErrorEmail = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const [error] = await query('SELECT * FROM dbo.logging_mike WHERE id = @id', {
    id,
  });

  if (!error) {
    throw new ApiError(404, 'Error not found');
  }

  if (!transporter) {
    throw new ApiError(503, 'SMTP is not configured');
  }

  const { to, notes } = req.body;
  const recipients = getRecipients(to);

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || 'devlogger@lapilabs.co.id',
    to: recipients,
    subject: `[DevLogger] Error Alert #${error.id} - ${error.method ?? 'UNKNOWN'} ${error.url ?? ''}`,
    text: buildEmailText(error, notes),
    html: buildEmailHtml(error, notes),
  });

  res
    .status(200)
    .json(
      success({ messageId: info.messageId, recipients }, 'Error alert sent')
    );
});
