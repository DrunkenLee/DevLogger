/*!
 * DevLogger Error Modal — reusable, framework-agnostic error dialog.
 * v1.0.0 · Drop-in <script> widget for internal LMS/company modules.
 *
 * One file, zero dependencies. Injects its own scoped CSS.
 * Exposes a single global: window.DevLoggerModal
 *
 *   DevLoggerModal.init({ apiBaseUrl, token, appName });
 *   DevLoggerModal.showError({ title, message, error });
 *
 * Two actions per modal:
 *   • "Mengerti"        → closes the modal (no network call)
 *   • "Laporkan ke IT"  → POST {apiBaseUrl}/errors/report → saves to
 *                          logging_mike + emails IT, then shows a receipt.
 *
 * See the docs page served at the DevLogger root (`/`) for copy-paste snippets.
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.0';
  var STYLE_ID = 'devlogger-modal-styles';

  // ---------------------------------------------------------------------------
  // Global configuration (set once via DevLoggerModal.init)
  // ---------------------------------------------------------------------------
  var config = {
    apiBaseUrl: '', // e.g. "https://server:3110/api/v1" — required to report
    token: '', // LMS auth token (string) OR use getToken() below
    getToken: null, // optional () => string, evaluated at report time
    appName: '', // your module name, included in the IT report notes
    recipients: null, // optional array of override emails (maps to `to`)
    saveToDb: true, // persist the error row to logging_mike
    autoContext: true, // auto-fill url/method/userid from the browser
    userId: '', // optional current user id/NIK for the report
    timeoutMs: 15000, // report request timeout
    devmode: false, // append ?devmode=true so DevLogger uses the dev LMS/DB
    onReport: null, // optional (result) => void  on success
    onReportError: null, // optional (error) => void  on failure
  };

  // ---------------------------------------------------------------------------
  // Scoped styles — injected once. Everything is prefixed `dlm-`.
  // ---------------------------------------------------------------------------
  var CSS =
    '@keyframes dlm-fade{from{opacity:0}to{opacity:1}}' +
    '@keyframes dlm-pop{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}' +
    '@keyframes dlm-spin{to{transform:rotate(360deg)}}' +
    '@keyframes dlm-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}' +
    '.dlm-root{--dlm-danger:#e5484d;--dlm-danger-soft:#fdecec;--dlm-ink:#1a1d21;--dlm-muted:#6b7280;' +
    '--dlm-line:#e6e8eb;--dlm-surface:#ffffff;--dlm-brand:#3b6ef5;--dlm-ok:#12855f;' +
    '--dlm-radius:16px;--dlm-shadow:0 24px 60px -12px rgba(16,24,40,.35),0 0 0 1px rgba(16,24,40,.04);' +
    'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;' +
    'padding:20px;font-family:"Segoe UI",Roboto,system-ui,-apple-system,sans-serif;' +
    '-webkit-font-smoothing:antialiased;box-sizing:border-box}' +
    '.dlm-root *,.dlm-root *::before,.dlm-root *::after{box-sizing:border-box}' +
    '.dlm-backdrop{position:absolute;inset:0;background:rgba(16,24,40,.55);' +
    'backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);animation:dlm-fade .2s ease}' +
    '.dlm-card{position:relative;width:100%;max-width:460px;background:var(--dlm-surface);' +
    'border-radius:var(--dlm-radius);box-shadow:var(--dlm-shadow);overflow:hidden;' +
    'animation:dlm-pop .28s cubic-bezier(.2,.9,.3,1.2);max-height:calc(100vh - 40px);display:flex;flex-direction:column}' +
    '.dlm-accent{height:5px;background:linear-gradient(90deg,var(--dlm-danger),#ff7a7d)}' +
    '.dlm-body{padding:26px 26px 8px;overflow:auto}' +
    '.dlm-icon{width:52px;height:52px;border-radius:50%;background:var(--dlm-danger-soft);' +
    'display:flex;align-items:center;justify-content:center;margin-bottom:16px}' +
    '.dlm-icon svg{width:28px;height:28px;color:var(--dlm-danger)}' +
    '.dlm-title{margin:0 0 8px;font-size:20px;line-height:1.25;font-weight:700;color:var(--dlm-ink)}' +
    '.dlm-message{margin:0;font-size:15px;line-height:1.6;color:var(--dlm-muted);white-space:pre-wrap;word-break:break-word}' +
    '.dlm-details{margin-top:16px;border:1px solid var(--dlm-line);border-radius:10px;overflow:hidden}' +
    '.dlm-details summary{cursor:pointer;list-style:none;padding:11px 14px;font-size:13px;font-weight:600;' +
    'color:var(--dlm-muted);user-select:none;display:flex;align-items:center;gap:8px}' +
    '.dlm-details summary::-webkit-details-marker{display:none}' +
    '.dlm-details summary::before{content:"›";font-size:18px;line-height:1;transition:transform .2s;display:inline-block}' +
    '.dlm-details[open] summary::before{transform:rotate(90deg)}' +
    '.dlm-details pre{margin:0;padding:0 14px 14px;font-size:12px;line-height:1.55;color:#475467;' +
    'font-family:ui-monospace,"Cascadia Code",Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word;max-height:180px;overflow:auto}' +
    '.dlm-footer{padding:18px 26px 24px;display:flex;gap:12px;flex-wrap:wrap}' +
    '.dlm-btn{flex:1 1 auto;min-width:130px;border:0;border-radius:11px;padding:13px 18px;font-size:15px;' +
    'font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:9px;' +
    'transition:transform .12s ease,background .15s ease,box-shadow .15s ease;font-family:inherit}' +
    '.dlm-btn:active{transform:translateY(1px)}' +
    '.dlm-btn:focus-visible{outline:3px solid rgba(59,110,245,.4);outline-offset:2px}' +
    '.dlm-btn-ghost{background:#f2f4f7;color:var(--dlm-ink)}' +
    '.dlm-btn-ghost:hover{background:#e6e9ee}' +
    '.dlm-btn-report{background:var(--dlm-brand);color:#fff;box-shadow:0 8px 18px -6px rgba(59,110,245,.6)}' +
    '.dlm-btn-report:hover{background:#2f5fe0}' +
    '.dlm-btn[disabled]{opacity:.65;cursor:not-allowed;transform:none}' +
    '.dlm-btn svg{width:18px;height:18px}' +
    '.dlm-spinner{width:17px;height:17px;border:2.5px solid rgba(255,255,255,.45);border-top-color:#fff;' +
    'border-radius:50%;animation:dlm-spin .7s linear infinite}' +
    '.dlm-status{padding:0 26px;margin:-4px 0 4px;font-size:13.5px;line-height:1.5;min-height:0;transition:min-height .2s}' +
    '.dlm-status.show{min-height:22px;margin-bottom:10px}' +
    '.dlm-status-ok{color:var(--dlm-ok)}' +
    '.dlm-status-err{color:var(--dlm-danger)}' +
    '.dlm-receipt{display:flex;align-items:flex-start;gap:10px}' +
    '.dlm-receipt svg{flex:none;width:20px;height:20px;margin-top:1px}' +
    '.dlm-ref{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700}' +
    '.dlm-hidden{display:none!important}' +
    '@media (max-width:480px){.dlm-card{max-width:100%}.dlm-footer{flex-direction:column-reverse}' +
    '.dlm-btn{width:100%}}' +
    '@media (prefers-color-scheme:dark){.dlm-root{--dlm-surface:#1c1f24;--dlm-ink:#f0f2f5;' +
    '--dlm-muted:#9aa4b2;--dlm-line:#2c3138;--dlm-danger-soft:#3a1e1f}' +
    '.dlm-btn-ghost{background:#2a2f36;color:#e7eaee}.dlm-btn-ghost:hover{background:#333944}' +
    '.dlm-details pre{color:#aeb6c2}}' +
    '@media (prefers-reduced-motion:reduce){.dlm-root *,.dlm-root *::before,.dlm-root *::after{' +
    'animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------
  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    if (html != null) node.innerHTML = html;
    return node;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c];
    });
  }

  function resolveToken() {
    if (typeof config.getToken === 'function') {
      try {
        return config.getToken() || '';
      } catch (e) {
        return '';
      }
    }
    return config.token || '';
  }

  var ICON_ALERT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"/></svg>';
  var ICON_INFO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
  var ICON_CHECK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  // ---------------------------------------------------------------------------
  // Build the report payload from the caller's error context + config.
  // Matches POST /api/v1/errors/report (errorReportSchema).
  // ---------------------------------------------------------------------------
  function buildPayload(opts) {
    var e = opts.error || {};
    var noteParts = [];
    if (config.appName) noteParts.push('App: ' + config.appName);
    if (opts.message) noteParts.push('User saw: ' + opts.message);
    if (e.notes) noteParts.push(e.notes);
    noteParts.push(
      'Reported from: ' + (config.autoContext ? location.href : e.url || '')
    );

    var payload = {
      method: e.method || (config.autoContext ? 'GET' : 'POST'),
      url: e.url || (config.autoContext ? location.href : ''),
      error_message:
        e.error_message || opts.message || opts.title || 'Reported by user',
      save_to_db: config.saveToDb,
      notes: noteParts.join(' | '),
    };

    if (e.status_code != null) payload.status_code = e.status_code;
    if (e.error_stack) payload.error_stack = e.error_stack;
    if (e.request_body != null) payload.request_body = e.request_body;
    if (e.headers != null) payload.headers = e.headers;
    var uid = e.userid || config.userId;
    if (uid) payload.userid = String(uid);
    if (e.delegatedto) payload.delegatedto = e.delegatedto;
    if (Array.isArray(config.recipients) && config.recipients.length)
      payload.to = config.recipients;

    return payload;
  }

  // ---------------------------------------------------------------------------
  // POST the report. Returns a Promise resolving to the parsed response body.
  // ---------------------------------------------------------------------------
  function sendReport(opts) {
    if (!config.apiBaseUrl) {
      return Promise.reject(
        new Error('DevLoggerModal.init({ apiBaseUrl }) belum diset.')
      );
    }
    var url = config.apiBaseUrl.replace(/\/+$/, '') + '/errors/report';
    if (config.devmode) {
      url += '?devmode=true';
    }
    var token = resolveToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.authentication = token;
      headers.Authorization = 'Bearer ' + token;
    }

    var controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () {
          controller.abort();
        }, config.timeoutMs)
      : null;

    return fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(buildPayload(opts)),
      signal: controller ? controller.signal : undefined,
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (body) {
            if (timer) clearTimeout(timer);
            if (!res.ok || body.success === false) {
              var msg =
                body.message ||
                'Gagal mengirim laporan (HTTP ' + res.status + ')';
              var err = new Error(msg);
              err.status = res.status;
              throw err;
            }
            return body;
          });
      })
      .catch(function (err) {
        if (timer) clearTimeout(timer);
        if (err && err.name === 'AbortError')
          throw new Error('Permintaan timeout. Coba lagi.');
        throw err;
      });
  }

  // ---------------------------------------------------------------------------
  // Modal instance
  // ---------------------------------------------------------------------------
  var openInstance = null;

  function showError(opts) {
    opts = opts || {};
    injectStyles();
    if (openInstance) openInstance.close();

    var lastFocused = document.activeElement;
    var title = opts.title || 'Terjadi Kesalahan';
    var message =
      opts.message ||
      'Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi, atau laporkan ke tim IT bila masalah berlanjut.';
    var e = opts.error || {};
    var techLines = [];
    if (e.error_message) techLines.push(e.error_message);
    if (e.status_code) techLines.push('Status: ' + e.status_code);
    if (e.method || e.url)
      techLines.push((e.method || '') + ' ' + (e.url || ''));
    if (e.error_stack) techLines.push('\n' + e.error_stack);
    var techText = techLines.join('\n').trim();

    var root = el('div', { class: 'dlm-root', role: 'presentation' });
    var backdrop = el('div', { class: 'dlm-backdrop' });
    var card = el('div', {
      class: 'dlm-card',
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-labelledby': 'dlm-title',
      'aria-describedby': 'dlm-msg',
    });

    var detailsHtml = techText
      ? '<details class="dlm-details"><summary>Detail teknis (untuk IT)</summary><pre>' +
        esc(techText) +
        '</pre></details>'
      : '';

    card.innerHTML =
      '<div class="dlm-accent"></div>' +
      '<div class="dlm-body">' +
      '<div class="dlm-icon" aria-hidden="true">' +
      ICON_ALERT +
      '</div>' +
      '<h2 class="dlm-title" id="dlm-title">' +
      esc(title) +
      '</h2>' +
      '<p class="dlm-message" id="dlm-msg">' +
      esc(message) +
      '</p>' +
      detailsHtml +
      '</div>' +
      '<div class="dlm-status" role="status" aria-live="polite"></div>' +
      '<div class="dlm-footer">' +
      '<button type="button" class="dlm-btn dlm-btn-ghost" data-act="close">Mengerti</button>' +
      '<button type="button" class="dlm-btn dlm-btn-report" data-act="report">' +
      ICON_INFO +
      '<span class="dlm-report-label">Laporkan ke IT</span></button>' +
      '</div>';

    root.appendChild(backdrop);
    root.appendChild(card);
    document.body.appendChild(root);

    var statusEl = card.querySelector('.dlm-status');
    var reportBtn = card.querySelector('[data-act="report"]');
    var closeBtn = card.querySelector('[data-act="close"]');
    var reportLabel = card.querySelector('.dlm-report-label');
    var reported = false;

    function setStatus(kind, html) {
      statusEl.className =
        'dlm-status show ' +
        (kind === 'ok' ? 'dlm-status-ok' : 'dlm-status-err');
      statusEl.innerHTML = html;
    }

    function close() {
      if (!root.parentNode) return;
      document.removeEventListener('keydown', onKey, true);
      root.parentNode.removeChild(root);
      openInstance = null;
      if (lastFocused && typeof lastFocused.focus === 'function') {
        try {
          lastFocused.focus();
        } catch (err) {
          /* ignore */
        }
      }
      if (typeof opts.onClose === 'function') opts.onClose();
    }

    function doReport() {
      if (reported) return close();
      reportBtn.disabled = true;
      reportLabel.textContent = 'Mengirim…';
      reportBtn.querySelector('svg').outerHTML =
        '<span class="dlm-spinner" aria-hidden="true"></span>';
      setStatus('ok', 'Mengirim laporan ke tim IT…');

      sendReport(opts)
        .then(function (body) {
          reported = true;
          var data = body && body.data ? body.data : {};
          var ref = data.id ? '#' + data.id : data.messageId ? '' : '';
          setStatus(
            'ok',
            '<span class="dlm-receipt">' +
              ICON_CHECK +
              '<span>Laporan terkirim ke tim IT.' +
              (ref
                ? ' Nomor referensi <span class="dlm-ref">' +
                  esc(ref) +
                  '</span>.'
                : '') +
              ' Terima kasih.</span></span>'
          );
          reportBtn.querySelector('.dlm-spinner')
            ? (reportBtn.innerHTML =
                ICON_CHECK + '<span class="dlm-report-label">Terkirim</span>')
            : null;
          reportBtn.disabled = false;
          reportBtn.classList.remove('dlm-btn-report');
          reportBtn.classList.add('dlm-btn-ghost');
          reportBtn.setAttribute('data-act', 'close');
          if (typeof config.onReport === 'function') config.onReport(body);
        })
        .catch(function (err) {
          setStatus(
            'err',
            esc(err && err.message ? err.message : 'Gagal mengirim laporan.') +
              ' Silakan coba lagi.'
          );
          reportBtn.disabled = false;
          reportBtn.innerHTML =
            ICON_INFO + '<span class="dlm-report-label">Coba lagi</span>';
          if (typeof config.onReportError === 'function')
            config.onReportError(err);
        });
    }

    closeBtn.addEventListener('click', close);
    reportBtn.addEventListener('click', function () {
      reportBtn.getAttribute('data-act') === 'close' ? close() : doReport();
    });
    backdrop.addEventListener('click', close);

    // Focus trap + ESC
    function focusable() {
      return card.querySelectorAll(
        'button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
      );
    }
    function onKey(ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        return close();
      }
      if (ev.key === 'Tab') {
        var items = focusable();
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        if (ev.shiftKey && document.activeElement === first) {
          ev.preventDefault();
          last.focus();
        } else if (!ev.shiftKey && document.activeElement === last) {
          ev.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey, true);
    closeBtn.focus();

    openInstance = { close: close, report: doReport, root: root };
    return openInstance;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  var DevLoggerModal = {
    version: VERSION,

    /** Set global defaults once at app startup. */
    init: function (options) {
      if (options && typeof options === 'object') {
        for (var k in options) {
          if (Object.prototype.hasOwnProperty.call(options, k))
            config[k] = options[k];
        }
      }
      return DevLoggerModal;
    },

    /** Read the current merged config (mostly for debugging). */
    getConfig: function () {
      var copy = {};
      for (var k in config) copy[k] = config[k];
      return copy;
    },

    /** Show the error modal. Returns { close, report } handle. */
    showError: showError,

    /** Report silently (no UI) — resolves to the API response body. */
    report: function (errorContext, extra) {
      return sendReport({
        error: errorContext || {},
        message: extra && extra.message,
      });
    },

    /** Close whatever modal is currently open. */
    close: function () {
      if (openInstance) openInstance.close();
    },
  };

  // UMD-ish export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DevLoggerModal;
  } else {
    global.DevLoggerModal = DevLoggerModal;
  }
})(typeof window !== 'undefined' ? window : this);
