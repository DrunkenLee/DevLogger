const formatJson = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(
      typeof value === 'string' ? JSON.parse(value) : value,
      null,
      2
    );
  } catch {
    return String(value);
  }
};

const maskToken = (token) => {
  if (!token) {
    return null;
  }
  const text = String(token);
  return `${text.slice(0, 20)}...`;
};

const buildEmailHtml = (error, notes) => {
  const rows = [
    ['ID', error.id ?? '(not saved)'],
    ['Method', error.method],
    ['URL', error.url],
    ['Status Code', error.status_code],
    ['User ID', error.userid],
    ['Delegated To', error.delegatedto],
    ['Created At', error.createdAt],
    ['Auth Token', maskToken(error.auth_token)],
    ['Error Message', error.error_message],
    [
      'Error Stack',
      `<pre style="white-space:pre-wrap">${error.error_stack}</pre>`,
    ],
    [
      'Request Body',
      `<pre style="white-space:pre-wrap">${formatJson(error.request_body)}</pre>`,
    ],
    [
      'Headers',
      `<pre style="white-space:pre-wrap">${formatJson(error.headers)}</pre>`,
    ],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="vertical-align:top;padding:8px;border:1px solid #ccc;font-weight:bold">${label}</td><td style="vertical-align:top;padding:8px;border:1px solid #ccc">${value ?? '-'}</td></tr>`
    )
    .join('');

  const notesHtml = notes ? `<h3>Notes</h3><p>${notes}</p>` : '';

  return `
    <h2>Error Alert #${error.id ?? 'reported'}</h2>
    <table style="border-collapse:collapse;width:100%;max-width:900px">${rows}</table>
    ${notesHtml}
  `;
};

const buildEmailText = (error, notes) => {
  const sections = [
    `Error Alert #${error.id ?? 'reported'}`,
    '',
    `ID: ${error.id ?? '(not saved)'}`,
    `Method: ${error.method ?? '-'}`,
    `URL: ${error.url ?? '-'}`,
    `Status Code: ${error.status_code ?? '-'}`,
    `User ID: ${error.userid ?? '-'}`,
    `Delegated To: ${error.delegatedto ?? '-'}`,
    `Created At: ${error.createdAt ?? '-'}`,
    '',
    `Auth Token: ${maskToken(error.auth_token) ?? '-'}`,
    '',
    'Error Message:',
    error.error_message ?? '-',
    '',
    'Error Stack:',
    error.error_stack ?? '-',
    '',
    'Request Body:',
    formatJson(error.request_body) ?? '-',
    '',
    'Headers:',
    formatJson(error.headers) ?? '-',
  ];

  if (notes) {
    sections.push('', 'Notes:', notes);
  }

  return sections.join('\n');
};

export { formatJson, maskToken, buildEmailHtml, buildEmailText };
