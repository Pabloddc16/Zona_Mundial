/**
 * Email module — Resend SDK wrapper + transactional templates.
 *
 * Sender:
 *   - Default: onboarding@resend.dev (Resend's test sender, works without
 *     domain verification — fine for launch QA)
 *   - Once zonamundial.mx domain is added in Resend + DKIM/SPF verified,
 *     swap to pedidos@zonamundial.mx
 *
 * If RESEND_API_KEY is missing, sends become no-ops and log a warning.
 * Webhook + checkout flows must NOT break on email failure.
 */
import { Resend } from 'resend'

const FROM_ADDRESS = process.env['EMAIL_FROM'] ?? 'Cromos 26 <onboarding@resend.dev>'
const REPLY_TO = process.env['EMAIL_REPLY_TO'] ?? 'stulanik@gmail.com'

let _client: Resend | null | undefined
function getClient(): Resend | null {
  if (_client !== undefined) return _client
  const key = process.env['RESEND_API_KEY']
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — emails disabled')
    _client = null
    return null
  }
  _client = new Resend(key)
  return _client
}

export interface SendArgs {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  const client = getClient()
  if (!client) return { ok: false, error: 'RESEND_API_KEY not configured' }

  try {
    const r = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
      reply_to: REPLY_TO,
    })
    if (r.error) return { ok: false, error: r.error.message }
    const out: { ok: boolean; id?: string; error?: string } = { ok: true }
    if (r.data?.id) out.id = r.data.id
    return out
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/* ─── Templates ──────────────────────────────────────────────────── */

const BRAND_GREEN = '#006341'
const BRAND_GOLD = '#FFD100'
const BRAND_RED = '#CE1126'
const BRAND_CREAM = '#FAF6EE'

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_CREAM};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_CREAM};padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);">
      <tr><td style="height:6px;background:${BRAND_GREEN}"></td></tr>
      <tr><td style="height:3px;background:${BRAND_GOLD}"></td></tr>
      <tr><td style="height:3px;background:${BRAND_RED}"></td></tr>
      <tr><td style="padding:32px 32px 8px;text-align:center">
        <div style="font-size:11px;font-weight:900;letter-spacing:4px;color:${BRAND_GREEN};">CROMOS 26</div>
      </td></tr>
      <tr><td style="padding:8px 32px 32px;">${body}</td></tr>
      <tr><td style="padding:24px 32px;background:rgba(0,0,0,0.03);text-align:center;font-size:11px;color:rgba(0,0,0,0.5);line-height:1.5;">
        Cromos 26 · ¿Dudas? Responde este correo.<br>
        No afiliado con FIFA o Panini.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!))
}

interface PickupEmailArgs {
  to: string
  customerName: string
  orderNumber: string
  pickupCode: string
  total: number
}

export async function sendPickupCodeEmail(args: PickupEmailArgs) {
  const { to, customerName, orderNumber, pickupCode, total } = args
  const subject = `Tu código de recolección: ${pickupCode}`
  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;color:#0B1F15;font-weight:900;text-align:center;">¡Pago confirmado!</h1>
    <p style="margin:0 0 24px;color:rgba(0,0,0,0.6);font-size:14px;text-align:center;line-height:20px;">
      Gracias ${escapeHtml(customerName)} — tu pedido <strong>${escapeHtml(orderNumber)}</strong> está listo para recoger.
    </p>

    <div style="background:${BRAND_GREEN};border:3px solid ${BRAND_GOLD};border-radius:16px;padding:20px;text-align:center;margin:16px 0 24px;">
      <div style="font-size:10px;font-weight:900;letter-spacing:3px;color:${BRAND_GOLD};margin-bottom:8px;">CÓDIGO DE RECOLECCIÓN</div>
      <div style="font-size:48px;font-weight:900;color:#fff;letter-spacing:8px;font-variant-numeric:tabular-nums;">${escapeHtml(pickupCode)}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:8px;">Muestra este código en el mostrador</div>
    </div>

    <div style="background:rgba(0,0,0,0.04);border-radius:12px;padding:16px;margin:0 0 24px;">
      <div style="font-size:11px;font-weight:900;color:${BRAND_GREEN};letter-spacing:1.5px;margin-bottom:8px;">DIRECCIÓN DE LA TIENDA</div>
      <div style="font-size:14px;color:#0B1F15;line-height:1.5;">
        Miguel Lerdo de Tejada 2081 — casa Anomalistyc<br>
        Col. Americana, Lafayette · 44150 Guadalajara, Jal.<br>
        <span style="color:rgba(0,0,0,0.5);font-size:12px;">Lun–Sáb · 10am – 7pm</span>
      </div>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      <tr>
        <td style="font-size:13px;color:rgba(0,0,0,0.6);">Pedido</td>
        <td style="font-size:13px;color:#0B1F15;text-align:right;font-family:monospace;">${escapeHtml(orderNumber)}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:rgba(0,0,0,0.6);padding-top:6px;">Total pagado</td>
        <td style="font-size:13px;font-weight:900;color:${BRAND_GREEN};text-align:right;padding-top:6px;">
          ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(total)}
        </td>
      </tr>
    </table>

    <p style="margin:16px 0 0;color:rgba(0,0,0,0.5);font-size:12px;line-height:18px;text-align:center;">
      Tu código es único y no expira. Si alguien más recoge por ti, comparte solo este código.
    </p>
  `
  const text = `Cromos 26 — Pago confirmado

Pedido: ${orderNumber}
Código de recolección: ${pickupCode}

Recoge en:
Miguel Lerdo de Tejada 2081 — casa Anomalistyc
Col. Americana, Lafayette · 44150 Guadalajara, Jal.
Lun-Sáb · 10am – 7pm

Total: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(total)}

Muestra el código en el mostrador.`

  return sendEmail({ to, subject, html: shell(subject, body), text })
}

interface OrderConfirmationArgs {
  to: string
  customerName: string
  orderNumber: string
  total: number
  deliveryType: 'local' | 'envio'
  address?: string
}

export async function sendOrderConfirmationEmail(args: OrderConfirmationArgs) {
  const { to, customerName, orderNumber, total, deliveryType, address } = args
  const subject = `Pedido confirmado — ${orderNumber}`
  const deliveryLine = deliveryType === 'local'
    ? 'Recolección en tienda'
    : `Envío a: ${escapeHtml(address ?? 'tu dirección registrada')}`
  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#0B1F15;font-weight:900;text-align:center;">¡Pedido recibido!</h1>
    <p style="margin:0 0 24px;color:rgba(0,0,0,0.6);font-size:14px;text-align:center;line-height:20px;">
      ${escapeHtml(customerName)}, recibimos tu pedido <strong>${escapeHtml(orderNumber)}</strong> y lo estamos preparando.
    </p>
    <div style="background:rgba(0,0,0,0.04);border-radius:12px;padding:16px;margin:0 0 24px;font-size:13px;line-height:1.6;color:#0B1F15;">
      <div><strong>Entrega:</strong> ${deliveryLine}</div>
      <div><strong>Total:</strong> ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(total)}</div>
    </div>
    <p style="margin:0;color:rgba(0,0,0,0.6);font-size:13px;line-height:18px;text-align:center;">
      Te avisaremos por correo cuando tu pedido cambie de estado.
    </p>
  `
  return sendEmail({ to, subject, html: shell(subject, body) })
}
