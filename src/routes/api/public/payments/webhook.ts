// ============================================================
// Webhook Stripe — adresse à déclarer dans Stripe :
//   https://<adresse-du-site>/api/public/payments/webhook
// Événements : payment_intent.succeeded (paiement intégré au site),
//              charge.refunded (les anciens événements checkout.session.*
//              restent gérés pour les paiements faits avant le paiement intégré)
// Chaque appel est authentifié par sa signature (STRIPE_WEBHOOK_SECRET) :
// une requête non signée par Stripe est rejetée. Un événement d'un autre mode
// que la clé du site (test alors que le site est en réel) est ignoré.
// ============================================================
import { createFileRoute } from "@tanstack/react-router";
import { type StripeWebhookObject, evenementAutreMode, verifyWebhook } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      // Permet de vérifier l'adresse dans un navigateur (aucune donnée exposée).
      GET: async () =>
        new Response("Webhook Stripe Emerald Beauty : adresse correcte.", {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
      POST: async ({ request }) => {
        let event: {
          id: string;
          type: string;
          livemode?: boolean;
          data: { object: StripeWebhookObject };
        };
        try {
          const { preparerSecrets } = await import("@/lib/secrets.server");
          await preparerSecrets();
          event = await verifyWebhook(request);
        } catch (e) {
          console.error("[webhook] signature refusée :", (e as Error).message);
          return new Response("Signature invalide", { status: 400 });
        }

        if (evenementAutreMode(event.livemode)) {
          console.warn(
            `[webhook] ${event.type} (${event.id}) ignoré : autre mode que la clé du site`,
          );
          return Response.json({ received: true, ignore: true });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const {
          enregistrerPaiement,
          enregistrerIntention,
          enregistrerExpiration,
          enregistrerRemboursement,
        } = await import("@/lib/acompte.server");
        const objet = event.data.object as never;
        try {
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
              await enregistrerPaiement(supabaseAdmin, objet);
              break;
            case "payment_intent.succeeded":
              await enregistrerIntention(supabaseAdmin, objet);
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
