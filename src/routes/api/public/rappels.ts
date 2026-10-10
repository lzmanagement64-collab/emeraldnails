// ============================================================
// Rappels automatiques : à appeler une fois par heure (cron externe).
// Sécurisé par un secret partagé (en-tête x-cron-secret).
// Envoie un rappel aux clientes dont le RDV confirmé a lieu dans 24 à 25 h.
// ============================================================
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/rappels")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { lireSecret } = await import("@/lib/secrets.server");
        const secret = lireSecret("CRON_SECRET");
        if (!secret || request.headers.get("x-cron-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { versEmail, SELECT_AVEC_PRESTATION } = await import("@/lib/reservation.server");
        const { emailRappelCliente } = await import("@/lib/emails.server");

        // Fenêtre d'une heure : appelé une fois par heure, chaque cliente reçoit un seul rappel.
        const debut = new Date(Date.now() + 24 * 3600_000).toISOString();
        const fin = new Date(Date.now() + 25 * 3600_000).toISOString();

        const { data, error } = await supabaseAdmin
          .from("reservations")
          .select(SELECT_AVEC_PRESTATION)
          .eq("statut", "confirmee")
          .gte("date_debut", debut)
          .lt("date_debut", fin);

        if (error) {
          console.error("[rappels]", error.message);
          return new Response("error", { status: 500 });
        }

        const envois = await Promise.allSettled(
          (data ?? []).map((row) => emailRappelCliente(versEmail(row as never))),
        );
        return Response.json({ traites: envois.length });
      },
    },
  },
});
