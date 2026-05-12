import QRCode from 'qrcode';
import LZString from 'lz-string';

const VERSION = 1;
const PREFIX_PLAIN = 'M26:';
const PREFIX_COMPRESSED = 'M26Z:';
const MAX_PLAIN_LEN = 1024;

export const SWAP_VERSION = VERSION;

export function encodeOffer({ username, repetidas, faltantes, name, avatar }) {
  const p = {
    v: VERSION,
    t: 'o',
    u: username || 'anon',
    r: Array.isArray(repetidas) ? repetidas.slice() : [],
  };
  if (Array.isArray(faltantes) && faltantes.length) p.n = faltantes;
  if (name) p.dn = String(name);
  if (avatar) p.av = String(avatar);
  return encodePayload(p);
}

export function encodeReceipt({ username, took, gave, name }) {
  const p = {
    v: VERSION,
    t: 'r',
    u: username || 'anon',
    k: Array.isArray(took) ? took.slice() : [],
    g: Array.isArray(gave) ? gave.slice() : [],
  };
  if (name) p.dn = String(name);
  return encodePayload(p);
}

function encodePayload(payload) {
  const json = JSON.stringify(payload);
  if (json.length <= MAX_PLAIN_LEN) {
    return PREFIX_PLAIN + encodeURIComponent(json);
  }
  return PREFIX_COMPRESSED + LZString.compressToEncodedURIComponent(json);
}

export function decodePayload(raw) {
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  let json = null;
  if (text.startsWith(PREFIX_COMPRESSED)) {
    const body = text.slice(PREFIX_COMPRESSED.length);
    try { json = LZString.decompressFromEncodedURIComponent(body); }
    catch (_) { return null; }
  } else if (text.startsWith(PREFIX_PLAIN)) {
    const body = text.slice(PREFIX_PLAIN.length);
    try { json = decodeURIComponent(body); }
    catch (_) { return null; }
  } else {
    return null;
  }
  if (!json) return null;
  let p;
  try { p = JSON.parse(json); } catch (_) { return null; }
  if (!p || typeof p !== 'object') return null;
  if (p.v !== VERSION) return null;
  if (p.t !== 'o' && p.t !== 'r') return null;
  if (typeof p.u !== 'string' || !p.u) return null;
  if (p.t === 'o' && !Array.isArray(p.r)) return null;
  if (p.t === 'r' && (!Array.isArray(p.k) || !Array.isArray(p.g))) return null;
  return p;
}

export async function renderQRSvg(targetEl, text, opts) {
  if (!targetEl) throw new Error('renderQRSvg: target element missing');
  if (typeof text !== 'string' || !text) throw new Error('renderQRSvg: empty text');
  const o = opts || {};
  const svgString = await QRCode.toString(text, {
    type: 'svg',
    // Default to "L" (Low ECC) for offer/receipt: smaller payload + fewer
    // modules = lower density = nicer-looking QR. Callers can override.
    errorCorrectionLevel: o.errorCorrectionLevel || 'L',
    // 2-module quiet zone gives the QR room to breathe inside its card
    // without blowing up the rendered size.
    margin: o.margin == null ? 2 : o.margin,
    color: {
      // Brand ink — same green/black-green as the rest of the app, instead
      // of plain black. Reads softer against the cream background.
      dark: o.dark || '#0B2E1F',
      light: o.light || '#FFFFFF',
    },
  });
  targetEl.innerHTML = svgString;
  const svg = targetEl.querySelector('svg');
  if (svg) {
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.style.display = 'block';
  }
}
