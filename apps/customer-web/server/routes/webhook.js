import { Router } from "express";
import crypto from "node:crypto";
import { paymentClient } from "../mp.js";
import { findOrder, findOrderByPreference, updateOrder, recordReferralEvent } from "../db.js";

const router = Router();

function parseSignatureHeader(h){
  // Example: "ts=1700000000,v1=abc123..."
  if(!h || typeof h !== "string") return null;
  const out = {};
  for(const part of h.split(",")){
    const [k, v] = part.split("=").map(s => s && s.trim());
    if(k && v) out[k] = v;
  }
  return out.ts && out.v1 ? { ts: out.ts, v1: out.v1 } : null;
}

function verifyMpSignature({ secret, ts, v1, dataId, requestId }){
  if(!secret || !ts || !v1 || !dataId) return false;
  const manifest = `id:${dataId};request-id:${requestId || ""};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  if(expected.length !== v1.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

async function pushToAdmin(order){
  const url = process.env.ADMIN_INGEST_URL;
  const secret = process.env.ADMIN_INGEST_SECRET;
  if(!url || !secret){
    console.warn("[admin-push] ADMIN_INGEST_URL/SECRET not configured — skipping");
    return null;
  }
  const payload = {
    orderNumber: order.orderNumber,
    items: order.items,
    total: order.total,
    delivery: order.delivery,
    user: order.user,
    referralCode: order.referralCode || null,
    paidAt: order.paidAt || new Date().toISOString(),
    paymentId: order.paymentId || null,
  };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await r.text().catch(() => "");
    if(!r.ok){
      console.error("[admin-push] non-2xx", r.status, text.slice(0, 200));
      return null;
    }
    console.log("[admin-push] ok", order.orderNumber);
    return text;
  } catch(err){
    console.error("[admin-push] failed", err?.message || err);
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function markOrderPaid({ orderNumber, paymentId, preferenceId, raw }){
  let order = orderNumber ? await findOrder(orderNumber) : null;
  if(!order && preferenceId) order = await findOrderByPreference(preferenceId);
  if(!order){
    console.warn("[webhook] order not found", { orderNumber, preferenceId });
    return null;
  }
  const updated = await updateOrder(order.orderNumber, {
    status: "paid",
    paymentId,
    paidAt: new Date().toISOString(),
    mpRaw: raw,
  });
  if(order.referralCode){
    try {
      const ev = await recordReferralEvent({
        referrerCode: order.referralCode,
        orderNumber: order.orderNumber,
        buyerName: order.user?.name || "Cliente",
        buyerPhone: order.user?.phone || "",
        orderTotal: Number(order.total) || 0,
      });
      if(ev) console.log("[referral] credited", { code: order.referralCode, commission: ev.commission, order: order.orderNumber });
    } catch(err){
      console.error("[referral] failed to record event", err?.message || err);
    }
  }
  // Fire-and-forget push to admin app. Failure does not affect MP webhook ack.
  pushToAdmin(updated || order).catch(err => console.error("[admin-push] unhandled", err?.message || err));
  return updated;
}

router.post("/", async (req, res) => {
  const sigHeader = req.header("x-signature");
  const requestId = req.header("x-request-id") || "";
  const sig = parseSignatureHeader(sigHeader);
  const secret = process.env.MP_WEBHOOK_SECRET;
  const dataId = String(req.body?.data?.id || req.query?.["data.id"] || "");

  if(secret){
    if(!sig || !verifyMpSignature({ secret, ts: sig.ts, v1: sig.v1, dataId, requestId })){
      console.warn("[webhook] invalid signature", { hasSig: !!sig, hasDataId: !!dataId });
      return res.status(401).json({ error: "invalid_signature" });
    }
  } else {
    console.warn("[webhook] MP_WEBHOOK_SECRET not set — accepting without verification (dev only)");
  }

  // Acknowledge fast; MP retries on non-2xx.
  res.status(200).json({ received: true });

  const topic = req.body?.type || req.body?.topic;
  if(topic !== "payment" || !dataId){
    return; // Nothing to do.
  }

  try {
    const payment = await paymentClient.get({ id: dataId });
    const status = payment?.status;
    const orderNumber = payment?.external_reference || null;
    const preferenceId = payment?.order?.id || null;
    if(status === "approved"){
      await markOrderPaid({
        orderNumber,
        paymentId: String(payment.id),
        preferenceId,
        raw: { id: payment.id, status, status_detail: payment.status_detail },
      });
    } else if(status === "rejected" || status === "cancelled"){
      const order = orderNumber ? await findOrder(orderNumber) : null;
      if(order){
        await updateOrder(order.orderNumber, { status: "failed", paymentId: String(payment.id) });
      }
    }
  } catch(err){
    console.error("[webhook] failed to process payment", dataId, err?.message || err);
  }
});

export default router;
