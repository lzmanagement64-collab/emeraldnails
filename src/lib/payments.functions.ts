// ============================================================
// Paiement de l'acompte — fonctions serveur.
// Sécurité : le navigateur n'envoie QUE l'identifiant de la
// réservation. Le montant est relu en base côté serveur, jamais
// transmis par le client. Aucune donnée bancaire ne transite par
// le site (formulaire hébergé par le prestataire de paiement).
// ============================================================
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

const inputSchema = z.object({
  bookingId: z.string().uuid(),
  returnUrl: z.string().url().max(500),
  environment: z.enum(["sandbox", "live"]),
});

type CheckoutResult = { clientSecret: string } | { error: string };

export const createDepositCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: booking, error } = await supabaseAdmin
        .from("bookings")
        .select(
          "id, email, service_name, deposit_amount, deposit_status, appointment_date, start_time",
        )
        .eq("id", data.bookingId)
        .maybeSingle();

      if (error || !booking) return { error: "Réservation introuvable." };
      if (booking.deposit_status === "paid") return { error: "Cet acompte a déjà été réglé." };

      const amountInCents = Math.round(Number(booking.deposit_amount) * 100);
      if (!Number.isFinite(amountInCents) || amountInCents < 50 || amountInCents > 200000) {
        return { error: "Montant d'acompte invalide." };
      }

      const stripe = createStripeClient(data.environment as StripeEnv);
      const description = `Acompte — ${booking.service_name} (${booking.appointment_date} ${booking.start_time})`;

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: { name: "Acompte réservation Emerald Beauty" },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer_email: booking.email,
        payment_intent_data: { description },
        metadata: { bookingId: booking.id },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const getDepositStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ bookingId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select(
        "deposit_amount, deposit_status, service_name, first_name, appointment_date, start_time",
      )
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) return null;
    return {
      depositAmount: Number(booking.deposit_amount),
      depositStatus: booking.deposit_status as string,
      serviceName: booking.service_name as string,
      firstName: booking.first_name as string,
      appointmentDate: booking.appointment_date as string,
      startTime: booking.start_time as string,
    };
  });
