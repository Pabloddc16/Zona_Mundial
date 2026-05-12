import { BrowserQRCodeReader } from '@zxing/browser';
import { captureException } from './sentry.js';

const STICKER_CODE_RE = /^[A-Z]{3}\d{1,3}$/;
const INVALID_TOAST_THROTTLE_MS = 1500;

let _active = null;

function appToast(msg, ms){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms || 1500);
}

function buildScannerDOM(){
  const root = document.createElement('div');
  root.className = 'sticker-scan-root';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Escáner de código de sticker');
  root.innerHTML = `
    <video class="sticker-scan-video" autoplay muted playsinline></video>
    <div class="sticker-scan-scrim" aria-hidden="true"></div>
    <div class="sticker-scan-frame" aria-hidden="true">
      <span class="c c-tl"></span><span class="c c-tr"></span>
      <span class="c c-bl"></span><span class="c c-br"></span>
    </div>
    <div class="sticker-scan-top">
      <button class="sticker-scan-close tap" type="button" aria-label="Cerrar">✕</button>
      <div class="sticker-scan-title">Escanea el código</div>
    </div>
    <div class="sticker-scan-hint">Apunta al QR · formato MEX07</div>
    <div class="sticker-scan-error" hidden></div>
  `;
  return root;
}

export async function openStickerScanner(onResult){
  if(_active) return;

  const root = buildScannerDOM();
  document.body.appendChild(root);
  document.documentElement.classList.add('scan-locked');

  const video = root.querySelector('.sticker-scan-video');
  const errBox = root.querySelector('.sticker-scan-error');
  const closeBtn = root.querySelector('.sticker-scan-close');

  let controls = null;
  let stopped = false;

  const cleanup = () => {
    if(stopped) return;
    stopped = true;
    try { controls && typeof controls.stop === 'function' && controls.stop(); } catch(_){}
    if(video.srcObject){
      try { video.srcObject.getTracks().forEach(t => t.stop()); } catch(_){}
      video.srcObject = null;
    }
    document.removeEventListener('keydown', onKey, true);
    if(root.parentNode) root.parentNode.removeChild(root);
    document.documentElement.classList.remove('scan-locked');
    _active = null;
  };

  const onKey = (e) => { if(e.key === 'Escape'){ e.preventDefault(); cleanup(); } };
  document.addEventListener('keydown', onKey, true);
  closeBtn.addEventListener('click', cleanup);

  _active = { cleanup };

  const showError = (html) => {
    errBox.hidden = false;
    errBox.innerHTML = html;
  };

  if(!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function'){
    showError(`
      <strong>Cámara no disponible</strong>
      <p>Tu navegador no permite acceso a la cámara. Captura el código a mano.</p>
      <button class="btn ghost tap sm" type="button" data-close>Cerrar</button>
    `);
    errBox.querySelector('[data-close]').addEventListener('click', cleanup);
    return;
  }

  let reader;
  try {
    reader = new BrowserQRCodeReader();
  } catch(err){
    captureException(err, { tags: { mutation: 'scanner.init' } });
    showError(`
      <strong>No pudimos iniciar el escáner.</strong>
      <button class="btn ghost tap sm" type="button" data-close>Cerrar</button>
    `);
    errBox.querySelector('[data-close]').addEventListener('click', cleanup);
    return;
  }

  const lastInvalidAt = { t: 0 };

  try {
    controls = await reader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      video,
      (result, decodeErr) => {
        if(stopped) return;
        if(!result) return;
        const text = (result.getText && result.getText()) || result.text || String(result);
        const code = text.trim().toUpperCase();
        if(STICKER_CODE_RE.test(code)){
          cleanup();
          try { onResult(code); }
          catch(err){ captureException(err, { tags: { mutation: 'scanner.onResult' } }); }
          return;
        }
        const now = Date.now();
        if(now - lastInvalidAt.t > INVALID_TOAST_THROTTLE_MS){
          lastInvalidAt.t = now;
          appToast('Código inválido');
        }
      }
    );
  } catch(err){
    const name = err && err.name;
    if(name === 'NotAllowedError' || name === 'PermissionDeniedError'){
      showError(`
        <strong>Cámara bloqueada</strong>
        <p>Habilita el permiso para escanear:</p>
        <ul>
          <li><b>iOS Safari:</b> Ajustes → Safari → Cámara → Permitir</li>
          <li><b>Android Chrome:</b> Tres puntos → Ajustes del sitio → Cámara → Permitir</li>
        </ul>
        <p style="opacity:.75;">Después recarga esta pantalla.</p>
        <button class="btn ghost tap sm" type="button" data-close>Cerrar</button>
      `);
    } else if(name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError'){
      showError(`
        <strong>No encontramos cámara</strong>
        <p>Este dispositivo no expone una cámara compatible.</p>
        <button class="btn ghost tap sm" type="button" data-close>Cerrar</button>
      `);
    } else if(name === 'NotReadableError' || name === 'TrackStartError'){
      showError(`
        <strong>Cámara ocupada</strong>
        <p>Otra app está usando la cámara. Ciérrala y vuelve a intentar.</p>
        <button class="btn ghost tap sm" type="button" data-close>Cerrar</button>
      `);
    } else {
      captureException(err, { tags: { mutation: 'scanner.start' } });
      showError(`
        <strong>No pudimos iniciar la cámara</strong>
        <p style="opacity:.75; font-size:11px;">${err && err.message ? String(err.message).slice(0,140) : ''}</p>
        <button class="btn ghost tap sm" type="button" data-close>Cerrar</button>
      `);
    }
    const closeEl = errBox.querySelector('[data-close]');
    if(closeEl) closeEl.addEventListener('click', cleanup);
  }
}

export function closeStickerScanner(){
  if(_active && typeof _active.cleanup === 'function') _active.cleanup();
}

/**
 * Generic peer-QR scanner. Accepts ANY QR text and forwards it to onResult.
 * Used for swap offer / receipt payloads (not single sticker codes).
 */
export async function openPeerScanner(onResult, opts){
  if(_active) return;
  opts = opts || {};

  const root = buildScannerDOM();
  // Customize copy for peer scanning
  const titleEl = root.querySelector('.sticker-scan-title');
  const hintEl  = root.querySelector('.sticker-scan-hint');
  if(titleEl) titleEl.textContent = opts.title || 'Escanea el QR';
  if(hintEl)  hintEl.textContent  = opts.hint  || 'Apunta al QR de tu amigo';

  document.body.appendChild(root);
  document.documentElement.classList.add('scan-locked');

  const video = root.querySelector('.sticker-scan-video');
  const errBox = root.querySelector('.sticker-scan-error');
  const closeBtn = root.querySelector('.sticker-scan-close');

  let controls = null;
  let stopped = false;

  const cleanup = () => {
    if(stopped) return;
    stopped = true;
    try { controls && typeof controls.stop === 'function' && controls.stop(); } catch(_){}
    if(video.srcObject){
      try { video.srcObject.getTracks().forEach(t => t.stop()); } catch(_){}
      video.srcObject = null;
    }
    document.removeEventListener('keydown', onKey, true);
    if(root.parentNode) root.parentNode.removeChild(root);
    document.documentElement.classList.remove('scan-locked');
    _active = null;
  };

  const onKey = (e) => { if(e.key === 'Escape'){ e.preventDefault(); cleanup(); } };
  document.addEventListener('keydown', onKey, true);
  closeBtn.addEventListener('click', cleanup);
  _active = { cleanup };

  const showError = (html) => { errBox.hidden = false; errBox.innerHTML = html; };

  if(!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function'){
    showError(`
      <strong>Cámara no disponible</strong>
      <p>Tu navegador no permite acceso a la cámara.</p>
      <button class="btn ghost tap sm" type="button" data-close>Cerrar</button>
    `);
    errBox.querySelector('[data-close]').addEventListener('click', cleanup);
    return;
  }

  let reader;
  try { reader = new BrowserQRCodeReader(); }
  catch(err){
    captureException(err, { tags: { mutation: 'peerScanner.init' } });
    showError(`<strong>No pudimos iniciar el escáner.</strong><button class="btn ghost tap sm" type="button" data-close>Cerrar</button>`);
    errBox.querySelector('[data-close]').addEventListener('click', cleanup);
    return;
  }

  try {
    controls = await reader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      video,
      (result, decodeErr) => {
        if(stopped) return;
        if(!result) return;
        const text = (result.getText && result.getText()) || result.text || String(result);
        cleanup();
        try { onResult(text); }
        catch(err){ captureException(err, { tags: { mutation: 'peerScanner.onResult' } }); }
      }
    );
  } catch(err){
    const name = err && err.name;
    if(name === 'NotAllowedError' || name === 'PermissionDeniedError'){
      showError(`<strong>Cámara bloqueada</strong><p>Habilita el permiso para escanear y vuelve a intentar.</p><button class="btn ghost tap sm" type="button" data-close>Cerrar</button>`);
    } else if(name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError'){
      showError(`<strong>No encontramos cámara</strong><button class="btn ghost tap sm" type="button" data-close>Cerrar</button>`);
    } else if(name === 'NotReadableError' || name === 'TrackStartError'){
      showError(`<strong>Cámara ocupada</strong><p>Otra app la está usando.</p><button class="btn ghost tap sm" type="button" data-close>Cerrar</button>`);
    } else {
      captureException(err, { tags: { mutation: 'peerScanner.start' } });
      showError(`<strong>No pudimos iniciar la cámara</strong><button class="btn ghost tap sm" type="button" data-close>Cerrar</button>`);
    }
    const closeEl = errBox.querySelector('[data-close]');
    if(closeEl) closeEl.addEventListener('click', cleanup);
  }
}
