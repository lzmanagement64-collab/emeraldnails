import { Link } from "@tanstack/react-router";
import { Phone, Instagram } from "lucide-react";
import { business } from "@/config/business";

export function MobileBar() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-3 md:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-md gap-2 rounded-full border border-border bg-background/95 p-1.5 shadow-[0_20px_50px_-20px_rgba(28,25,23,0.35)] backdrop-blur">
        <a
          href={`tel:${business.phone}`}
          aria-label="Appeler"
          className="grid size-11 place-items-center rounded-full text-taupe"
        >
          <Phone className="size-4" />
        </a>
        <Link
          to="/reservation"
          className="grid flex-1 place-items-center rounded-full bg-ink font-mono text-[11px] uppercase tracking-widest text-porcelain"
        >
          Prendre rendez-vous
        </Link>
        <a
          href={business.instagramUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram"
          className="grid size-11 place-items-center rounded-full text-taupe"
        >
          <Instagram className="size-4" />
        </a>
      </div>
    </div>
  );
}
