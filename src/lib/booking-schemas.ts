import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);

export const bookingSchema = z.object({
  firstName: str(60).min(1),
  lastName: str(60).min(1),
  email: str(255).email(),
  phone: str(30).min(6),
  instagram: str(60).optional().default(""),
  customerType: z.enum(["new", "returning"]).default("new"),
  city: str(80).optional().default(""),
  serviceId: str(60).min(1),
  serviceName: str(120).min(1),
  options: z
    .array(
      z.object({
        id: str(60),
        name: str(120),
        price: z.number(),
        durationMinutes: z.number(),
      }),
    )
    .max(12)
    .default([]),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().min(5).max(600),
  totalAmount: z.number().min(0).max(2000),
  depositAmount: z.number().min(0).max(2000),
  remainingBalance: z.number().min(0).max(2000),
  preferences: z
    .object({
      shape: str(40).default(""),
      length: str(40).default(""),
      colors: str(200).default(""),
      designDescription: str(1000).default(""),
      notes: str(1000).default(""),
    })
    .default({ shape: "", length: "", colors: "", designDescription: "", notes: "" }),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const leadSchema = z.object({
  type: z.enum(["contact", "franchise", "recrutement"]).default("contact"),
  name: str(80).min(1),
  email: str(255).email(),
  phone: str(30).optional().default(""),
  city: str(80).optional().default(""),
  message: str(2000).optional().default(""),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const bookingStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "done", "cancelled", "absent"]),
});
