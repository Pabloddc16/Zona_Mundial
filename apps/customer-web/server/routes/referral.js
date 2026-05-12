import { Router } from "express";
import { getReferralSummary } from "../db.js";

const router = Router();

router.get("/:code/summary", async (req, res) => {
  const code = String(req.params.code || "").trim();
  if(!code || code.length < 2 || code.length > 24){
    return res.status(400).json({ error: "invalid_code" });
  }
  const summary = await getReferralSummary(code);
  return res.json(summary);
});

export default router;
