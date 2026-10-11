import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarHeart, Instagram, Phone } from "lucide-react";
import { business } from "@/config/business";

/** Barre mobile toujours visible en bas de l'écran : appeler, réserver, Instagram. */
export function MobileBar() {
  const chemin = useRouterState({ select: (s) => s.location.pathname });
  // Sur la page de réservation, le bouton « Réserver » ferait doublon.
  // Pas de barre « Réserver » pendant la réservation ni sur les pages techniques
  const cachee = ["/reserver", "/paiement", "/auth", "/reset-password", "/annulation", "/admin"];
  if (cachee.some((c) => chemin.startsWith(c))) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-1.5 rounded-full border border-border bg-porcelain/85 p-1.5 shadow-[0_24px_50px_-20px_rgba(20,50,40,0.5)] backdrop-blur-xl">
        <a
          href={`tel:${business.phone}`}
          aria-label="Appeler"
          className="grid size-12 place-items-center rounded-full text-emerald transition-colors hover:bg-sage-soft"
        >
          <Phone className="size-[18px]" strokeWidth={1.6} />
        </a>
        <Link to="/reserver" className="btn-primaire flex-1 !py-3.5">
          <CalendarHeart className="size-[18px]" strokeWidth={1.6} />
          Réserver
        </Link>
        <a
          href={business.instagramUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram"
          className="grid size-12 place-items-center rounded-full text-emerald transition-colors hover:bg-sage-soft"
        >
          <Instagram className="size-[18px]" strokeWidth={1.6} />
        </a>
      </div>
    </div>
  );
}
