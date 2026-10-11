import { z } from "zod";
import { champsAntiSpam } from "./anti-spam";

const str = (max: number) => z.string().trim().max(max);

export const leadSchema = z.object({
  type: z.enum(["contact", "franchise", "recrutement"]).default("contact"),
  name: str(80).min(1),
  email: str(255).toLowerCase().email(),
  phone: str(30).optional().default(""),
  city: str(80).optional().default(""),
  message: str(2000).optional().default(""),
  ...champsAntiSpam,
});

export type LeadInput = z.infer<typeof leadSchema>;
