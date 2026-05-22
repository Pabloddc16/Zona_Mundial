/**
 * Referral endpoints — Cromos 26 growth loop.
 *
 *   GET  /api/referral/me      — own code + invited count + balance
 *   POST /api/referral/credit  — internal: webhook calls on payment.created
 *                                (Authorization: Bearer <INGEST_SECRET>)
 *
 * Math (Pablo R3 #12, May 2026):
 *   - Inviter credit = round(payment_amount * 0.05)
 *   - Only on invitee's FIRST paid order
 *   - Credit expires 12 months from grant (set by DB default)
 *   - Anti-double-pay: unique index on (source_order_number, source_user_id)
 */
import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

const REFERRAL_INVITER_PCT = 0.05

const referralRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/referral/me — auth required
  fastify.get('/me', { preHandler: fastify.authenticate }, async (req, reply) => {
    const userId = req.user!.id
    const sb = getClient()

    const { data: profile, error: profErr } = await sb
      .from('users')
      .select('referral_code, referred_by_id, welcome_credit_used')
      .eq('id', userId)
      .single()

    if (profErr || !profile) return reply.notFound('User profile missing')

    // Count people who signed up using this user's code.
    const { count: invitedCount } = await sb
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by_id', userId)

    // Sum unspent, unexpired credits.
    const { data: credits } = await sb
      .from('referral_credits')
      .select('amount_mxn, redeemed_amount, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())

    let balance = 0
    let totalEarned = 0
    for (const c of credits ?? []) {
      const amt = Number(c.amount_mxn)
      const used = Number(c.redeemed_amount ?? 0)
      totalEarned += amt
      balance += Math.max(0, amt - used)
    }

    return {
      referralCode: profile.referral_code,
      referredById: profile.referred_by_id,
      welcomeCreditUsed: profile.welcome_credit_used,
      invitedCount: invitedCount ?? 0,
      balance,
      totalEarned,
      shareUrl: `https://zonamundial.mx/r/${profile.referral_code}`,
    }
  })

  // POST /api/referral/credit — internal, called by MP webhook after payment confirmed.
  // Header: Authorization: Bearer ${INGEST_SECRET}
  fastify.post('/credit', async (req, reply) => {
    const auth = req.headers.authorization ?? ''
    const expected = `Bearer ${process.env['INGEST_SECRET'] ?? ''}`
    if (!process.env['INGEST_SECRET'] || auth !== expected) {
      return reply.unauthorized('Internal endpoint')
    }

    const body = req.body as { orderNumber?: string; payerUserId?: string; amount?: number }
    const orderNumber = String(body.orderNumber ?? '')
    const payerUserId = String(body.payerUserId ?? '')
    const amount = Number(body.amount ?? 0)
    if (!orderNumber || !payerUserId || amount <= 0) {
      return reply.badRequest('orderNumber, payerUserId, amount required')
    }

    const sb = getClient()

    // Resolve inviter via payer's referred_by_id.
    const { data: payer } = await sb
      .from('users')
      .select('id, referred_by_id')
      .eq('id', payerUserId)
      .maybeSingle()
    if (!payer?.referred_by_id) {
      return { ok: true, skipped: 'no inviter' }
    }

    // First-purchase guard: did this payer have any prior PAID order?
    const { count: priorPaidCount } = await sb
      .from('orders')
      .select('order_number', { count: 'exact', head: true })
      .eq('user_id', payerUserId)
      .eq('status', 'PAID')
      .neq('order_number', orderNumber)
    if ((priorPaidCount ?? 0) > 0) {
      return { ok: true, skipped: 'not first purchase' }
    }

    const creditAmount = Math.round(amount * REFERRAL_INVITER_PCT)
    if (creditAmount < 1) return { ok: true, skipped: 'amount below minimum' }

    // Insert; unique index on (source_order_number, source_user_id) makes this idempotent.
    const { error: insertErr } = await sb.from('referral_credits').insert({
      user_id: payer.referred_by_id,
      source_user_id: payerUserId,
      source_order_number: orderNumber,
      amount_mxn: creditAmount,
    })

    if (insertErr && !/duplicate key/.test(insertErr.message)) {
      return reply.internalServerError(insertErr.message)
    }

    return { ok: true, credited: creditAmount, inviter: payer.referred_by_id }
  })
}

export default referralRoutes
