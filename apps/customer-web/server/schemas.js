import { z } from "zod";

export const PreferenceItemSchema = z.object({
  title: z.string().min(1).max(256),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
});

export const PreferenceUserSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  address: z.string().min(3),
  city: z.string().optional(),
});

export const PreferenceBodySchema = z.object({
  items: z.array(PreferenceItemSchema).min(1),
  user: PreferenceUserSchema.passthrough(),
  delivery: z.enum(["pickup", "gdl", "nacional"]).optional(),
  referralCode: z.string().trim().toUpperCase().min(2).max(24).optional(),
}).passthrough();
