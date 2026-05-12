import * as Sentry from '@sentry/browser';

const DSN = import.meta.env.VITE_SENTRY_DSN;
const ENV = import.meta.env.MODE || 'development';
const IS_DEV = !!import.meta.env.DEV;

const PII_KEYS = new Set(['phone', 'email', 'address']);
const REDACTED = '[REDACTED]';

let initialized = false;

function scrubPII(value, depth = 0) {
  if (value == null || depth > 6) return value;
  if (typeof value === 'string') {
    let s = value;
    s = s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, REDACTED);
    s = s.replace(/(\+?\d[\d\s().-]{7,}\d)/g, REDACTED);
    return s;
  }
  if (Array.isArray(value)) return value.map((v) => scrubPII(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const k in value) {
      if (PII_KEYS.has(k.toLowerCase())) { out[k] = REDACTED; continue; }
      out[k] = scrubPII(value[k], depth + 1);
    }
    return out;
  }
  return value;
}

function beforeSend(event) {
  if (event.user) {
    delete event.user.email;
    delete event.user.phone;
    if (event.user.address) event.user.address = REDACTED;
  }
  if (event.contexts) event.contexts = scrubPII(event.contexts);
  if (event.extra) event.extra = scrubPII(event.extra);
  if (event.tags) event.tags = scrubPII(event.tags);
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      data: b.data ? scrubPII(b.data) : b.data,
      message: b.message ? scrubPII(b.message) : b.message,
    }));
  }
  if (event.request) {
    if (event.request.cookies) event.request.cookies = REDACTED;
    if (event.request.headers) {
      const h = event.request.headers;
      if (h.Authorization || h.authorization) h.Authorization = h.authorization = REDACTED;
      if (h.Cookie || h.cookie) h.Cookie = h.cookie = REDACTED;
    }
  }
  return event;
}

export function initSentry() {
  if (initialized) return false;
  if (!DSN) {
    if (IS_DEV) console.info('[sentry] VITE_SENTRY_DSN not set — Sentry disabled.');
    return false;
  }
  Sentry.init({
    dsn: DSN,
    environment: ENV,
    sendDefaultPii: false,
    beforeSend,
  });
  initialized = true;
  return true;
}

export function captureException(err, ctx) {
  if (IS_DEV) console.error('[caught]', err, ctx || '');
  if (!initialized) return;
  try {
    Sentry.withScope((scope) => {
      if (ctx && ctx.tags) scope.setTags(ctx.tags);
      if (ctx && ctx.extra) scope.setExtras(scrubPII(ctx.extra));
      Sentry.captureException(err);
    });
  } catch {
    /* never throw from telemetry */
  }
}

export function showUserError() {
  try {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = 'Algo salió mal, intenta de nuevo';
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2200);
  } catch {
    /* swallow */
  }
}

export function handleMutationError(name, err) {
  captureException(err, { tags: { mutation: name } });
  showUserError();
}

export function safe(name, fn) {
  return function safeWrapped(...args) {
    try {
      return fn.apply(this, args);
    } catch (err) {
      handleMutationError(name, err);
      return undefined;
    }
  };
}
