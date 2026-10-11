import { createFileRoute, redirect } from "@tanstack/react-router";

// Ancienne page de confirmation (ancienne réservation) : la confirmation
// s'affiche désormais dans /reserver. Redirection permanente pour les anciens liens.
export const Route = createFileRoute("/confirmation")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 });
  },
});
