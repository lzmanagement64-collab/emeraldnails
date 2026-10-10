// ============================================================
// Webhook Stripe — adresse à déclarer dans Stripe :
//   https://<adresse-du-site>/api/public/payments/webhook
// Événements : checkout.session.completed, checkout.session.expired,
//              charge.refunded
// Chaque appel est authentifié par sa signature (STRIPE_WEBHOOK_SECRET) :
// une requête non signée par Stripe est rejetée.
// ============================================================
import { createFileRoute } from "@tanstack/react-router";
import { type StripeWebhookObject, verifyWebhook } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      // Permet de vérifier l'adresse dans un navigateur (aucune donnée exposée).
      GET: async () =>
        new Response("Webhook Stripe Emerald Beauty : adresse correcte.", {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
      POST: async ({ request }) => {
        let event: { id: string; type: string; data: { object: StripeWebhookObject } };
        try {
          event = await verifyWebhook(request);
        } catch (e) {
          console.error("[webhook] signature refusée :", (e as Error).message);
          return new Response("Signature invalide", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { enregistrerPaiement, enregistrerExpiration, enregistrerRemboursement } =
          await import("@/lib/acompte.server");
        const objet = event.data.object as never;
        try {
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
              await enregistrerPaiement(supabaseAdmin, objet);
              break;
            case "checkout.session.expired":
              await enregistrerExpiration(supabaseAdmin, objet);
              break;
            case "charge.refunded":
              await enregistrerRemboursement(supabaseAdmin, objet);
              break;
            default:
              break;
          }
          return Response.json({ received: true });
        } catch (e) {
          // Erreur temporaire : Stripe renverra l'événement automatiquement.
          console.error(`[webhook] ${event.type} (${event.id})`, e);
          return new Response("Erreur temporaire", { status: 500 });
        }
      },
    },
  },
});
