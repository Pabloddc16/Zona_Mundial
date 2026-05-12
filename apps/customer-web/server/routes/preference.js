import { Router } from "express";
import { preferenceClient } from "../mp.js";
import { PreferenceBodySchema } from "../schemas.js";
import { createOrder, nextOrderNumber } from "../db.js";

const router = Router();

router.post("/", async (req, res) => {
  const parse = PreferenceBodySchema.safeParse(req.body);
  if(!parse.success){
    return res.status(400).json({
      error: "invalid_body",
      issues: parse.error.issues.map(i => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const { items, user, delivery, referralCode } = parse.data;

  const total = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
  if(total <= 0){
    return res.status(400).json({ error: "invalid_total", message: "El total debe ser mayor a 0." });
  }

  const APP_URL = process.env.APP_URL || "";
  const BACKEND_URL = process.env.BACKEND_URL || "";
  if(!BACKEND_URL){
    return res.status(500).json({ error: "missing_config", message: "BACKEND_URL no está configurado." });
  }
  if(!APP_URL){
    return res.status(500).json({ error: "missing_config", message: "APP_URL no está configurado." });
  }

  const orderNumber = await nextOrderNumber();

  await createOrder({
    orderNumber,
    items,
    total,
    status: "pending",
    delivery: delivery || "pickup",
    user: { name: user.name, phone: user.phone, address: user.address, email: user.email, city: user.city, addressDetails: user.addressDetails, addressForm: user.addressForm },
    referralCode: referralCode ? String(referralCode).trim().toUpperCase() : null,
    createdAt: new Date().toISOString(),
  });

  try {
    const pref = await preferenceClient.create({
      body: {
        items: items.map((it, idx) => ({
          id: `${orderNumber}-${idx}`,
          title: it.title,
          quantity: it.quantity,
          unit_price: it.unit_price,
          currency_id: "MXN",
        })),
        external_reference: orderNumber,
        notification_url: `${BACKEND_URL}/api/webhook`,
        back_urls: {
          success: `${APP_URL}/success`,
          failure: `${APP_URL}/failure`,
          pending: `${APP_URL}/success`,
        },
        auto_return: "approved",
        statement_descriptor: "MUNDIAL26",
        metadata: { orderNumber },
      },
    });

    const initPoint = pref.init_point || pref.sandbox_init_point;
    if(!initPoint){
      throw new Error("Mercado Pago did not return an init_point");
    }

    // Persist preferenceId so webhook can map by it as a fallback.
    const { updateOrder } = await import("../db.js");
    await updateOrder(orderNumber, { preferenceId: pref.id });

    return res.json({
      init_point: initPoint,
      preferenceId: pref.id,
      orderNumber,
    });
  } catch(err){
    console.error("[preference] mp create failed", err?.message || err);
    return res.status(502).json({ error: "mp_failed", message: "No se pudo crear la preferencia de pago." });
  }
});

export default router;
