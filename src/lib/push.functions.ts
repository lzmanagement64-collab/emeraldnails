// ============================================================
// Notifications de l'app « Emerald Beauty Pro » : activation depuis l'admin.
// Réservé au compte de la gérante (vérification serveur à chaque appel).
// ============================================================
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const abonnementSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(80).max(200),
  auth: z.string().min(16).max(100),
  appareil: z.string().trim().max(120).default(""),
});
const endpointSchema = z.object({ endpoint: z.string().url().max(1000) });

/** Clé publique d'envoi (sans danger : elle sert au téléphone à s'abonner). */
export const adminPushCle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertGerante } = await import("./reservation.server");
    await assertGerante(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { clesVapid } = await import("./push.server");
    return { clePublique: (await clesVapid(supabaseAdmin)).publique };
  });

/** Enregistre ce téléphone pour recevoir les notifications. */
export const adminPushAbonner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => abonnementSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertGerante } = await import("./reservation.server");
    await assertGerante(context as never);
    const { endpointValide } = await import("./push.server");
    if (!endpointValide(data.endpoint)) throw new Error("Service de notification non reconnu.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_abonnements").upsert(
      {
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        appareil: data.appareil,
        user_id: (context as { userId: string }).userId,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error("Impossible d'activer les notifications.");
    return { ok: true };
  });

/** Ce téléphone ne reçoit plus les notifications. */
export const adminPushDesabonner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => endpointSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertGerante } = await import("./reservation.server");
    await assertGerante(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("push_abonnements").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });

/** Notification d'essai sur tous les appareils activés. */
export const adminPushTester = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertGerante } = await import("./reservation.server");
    await assertGerante(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifierGerante } = await import("./push.server");
    const envoyes = await notifierGerante(supabaseAdmin, {
      titre: "Notifications activées",
      corps: "Vous serez prévenue des nouvelles réservations et des annulations.",
      tag: "essai",
    });
    return { envoyes };
  });
