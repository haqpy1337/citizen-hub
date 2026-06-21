import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(40, "Username too long.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, _ and -."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username required."),
  password: z.string().min(1, "Password required."),
});

export const materialSchema = z.object({
  commodityId: z.number().int().optional(),
  name: z.string().min(1, "Material name required."),
  quantity: z.number().positive("Quantity must be greater than 0."),
  unit: z.enum(["SCU", "cSCU"]).default("SCU"),
  yieldPercent: z.number().min(-100).max(100).optional(),
});

export const jobCreateSchema = z.object({
  stationId: z.number().int().optional(),
  stationName: z.string().min(1, "Station required."),
  systemName: z.string().optional(),
  method: z.string().optional(),
  durationSec: z.number().int().positive("Duration must be greater than 0."),
  note: z.string().max(500).optional(),
  groupId: z.string().optional(),
  materials: z.array(materialSchema).min(1, "At least one material required."),
});

export const jobUpdateSchema = z.object({
  status: z.enum(["running", "done", "collected", "cancelled"]).optional(),
  note: z.string().max(500).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type JobCreateInput = z.infer<typeof jobCreateSchema>;
