// ============================================================
// Fonctions serveur — écriture sécurisée en base.
// Les données clientes ne transitent jamais en écriture directe
// depuis le navigateur : tout passe par une validation Zod côté
// serveur, puis un insert privilégié. Aucune lecture publique.
// ============================================================
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const str = (max: number) => z.string().trim().max(max);

const bookingSchema = z.object({
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
    .array(z.object({ id: str(60), name: str(120), price: z.number(), durationMinutes: z.number() }))
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

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bookingSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        instagram: data.instagram || null,
        customer_type: data.customerType,
        city: data.city || null,
        service_id: data.serviceId,
        service_name: data.serviceName,
        options: data.options,
        appointment_date: data.appointmentDate,
        start_time: data.startTime,
        end_time: data.endTime,
        duration_minutes: data.durationMinutes,
        total_amount: data.totalAmount,
        deposit_amount: data.depositAmount,
        remaining_balance: data.remainingBalance,
        preferences: data.preferences,
        notes: data.preferences.notes || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[createBooking]", error.message);
      throw new Error("Impossible d'enregistrer la réservation");
    }
    return { id: row.id as string };
  });

const leadSchema = z.object({
  type: z.enum(["contact", "franchise", "recrutement"]).default("contact"),
  name: str(80).min(1),
  email: str(255).email(),
  phone: str(30).optional().default(""),
  city: str(80).optional().default(""),
  message: str(2000).optional().default(""),
});

export const createLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => leadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("leads").insert({
      type: data.type,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      city: data.city || null,
      message: data.message || null,
    });
    if (error) {
      console.error("[createLead]", error.message);
      throw new Error("Impossible d'enregistrer la demande");
    }
    return { ok: true };
  });

// ---------------- Espace administration (rôle requis) ----------------

async function assertStaff(context: { supabase: ReturnType<typeof Object> ; userId: string } & Record<string, unknown>) {
  const supabase = context.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const [admin, staff] = await Promise.all([
    supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: context.userId, _role: "staff" }),
  ]);
  if (!admin.data && !staff.data) throw new Error("Accès refusé");
}

export const listBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context as never);
    const { data, error } = await context.supabase
      .from("bookings")
      .select("*")
      .order("appointment_date", { ascending: true })
      .limit(300);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context as never);
    const { data, error } = await context.supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "done", "cancelled", "absent"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const { error } = await context.supabase
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const myAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      await assertStaff(context as never);
      return { allowed: true };
    } catch {
      return { allowed: false };
    }
  });
