import { createFileRoute, redirect } from "@tanstack/react-router";

// Ancienne page de réservation : remplacée par /reserver (reliée à la base de données).
// On garde l'adresse pour les anciens liens et favoris, avec une redirection permanente.
export const Route = createFileRoute("/reservation")({
  beforeLoad: () => {
    throw redirect({ to: "/reserver", statusCode: 301 });
  },
});
