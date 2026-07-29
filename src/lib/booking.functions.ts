// ============================================================
// Fonctions serveur — écriture et lecture sécurisées.
// Le navigateur n'écrit jamais directement en base : toute donnée
// est validée côté serveur (Zod) avant insertion. Aucune lecture
// publique des réservations ou des demandes n'est possible.
// ============================================================
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { bookingSchema, leadSchema, bookingStatusSchema } from "./booking-schemas";

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bookingSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { bookingRow } = await import("./admin-guard.server");
    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert(bookingRow(data))
      .select("id")
      .single();
    if (error) {
      console.error("[createBooking]", error.message);
      throw new Error("Impossible d'enregistrer la réservation");
    }
    return { id: row.id as string };
  });

export const createLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => leadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { leadRow } = await import("./admin-guard.server");
    const { error } = await supabaseAdmin.from("leads").insert(leadRow(data));
    if (error) {
      console.error("[createLead]", error.message);
      throw new Error("Impossible d'enregistrer la demande");
    }
    return { ok: true };
  });

export const listBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertStaff } = await import("./admin-guard.server");
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
    const { assertStaff } = await import("./admin-guard.server");
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
  .inputValidator((data: unknown) => bookingStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("./admin-guard.server");
    await assertStaff(context as never);
    const { error } = await context.supabase
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
