import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const accessToken = process.env.MP_ACCESS_TOKEN;
if(!accessToken){
  console.warn("[mundial26-server] MP_ACCESS_TOKEN is not set — Mercado Pago calls will fail.");
}

export const mp = new MercadoPagoConfig({
  accessToken: accessToken || "MISSING_MP_ACCESS_TOKEN",
  options: { timeout: 8000 },
});

export const preferenceClient = new Preference(mp);
export const paymentClient = new Payment(mp);
