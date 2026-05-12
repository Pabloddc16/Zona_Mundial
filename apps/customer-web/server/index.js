import express from "express";
import cors from "cors";
import preferenceRoute from "./routes/preference.js";
import webhookRoute from "./routes/webhook.js";
import orderRoute from "./routes/order.js";
import referralRoute from "./routes/referral.js";

const app = express();

app.use(cors({ origin: process.env.APP_URL || true }));
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/api/preference", preferenceRoute);
app.use("/api/webhook", webhookRoute);
app.use("/api/order", orderRoute);
app.use("/api/referral", referralRoute);

app.use((err, _req, res, _next) => {
  console.error("[server] unhandled error", err);
  res.status(500).json({ error: "internal_error" });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`[mundial26-server] listening on http://localhost:${PORT}`);
  console.log(`  APP_URL    = ${process.env.APP_URL || "(unset)"}`);
  console.log(`  BACKEND_URL= ${process.env.BACKEND_URL || "(unset)"}`);
  console.log(`  MP_TOKEN   = ${process.env.MP_ACCESS_TOKEN ? "[set]" : "[unset]"}`);
});
