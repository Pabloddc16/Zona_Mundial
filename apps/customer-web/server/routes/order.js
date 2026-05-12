import { Router } from "express";
import { findOrder } from "../db.js";

const router = Router();

router.get("/:orderNumber", async (req, res) => {
  const order = await findOrder(req.params.orderNumber);
  if(!order) return res.status(404).json({ error: "not_found" });
  // Don't echo internal mpRaw blob to clients.
  const { mpRaw: _ignored, ...safe } = order;
  return res.json(safe);
});

export default router;
