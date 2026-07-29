import { Link } from "@tanstack/react-router";
import { business } from "@/config/business";
import { areas } from "@/data/areas";

export function Footer() {
  return (
    <footer className="border-t border-border bg-linen/40">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">

        <div className="space-y-3">
          <p className="font-display text-2xl italic">{business.name}</p>
          <p className="max-w-xs text-sm text-taupe">{business.shortDescription}</p>
        </div>

        <div className="space-y-3 text-sm">
          <p className="eyebrow">Contact</p>
          <p className="text-taupe">{business.address}</p>
          <p>
            <a href={`tel:${business.phone}`} className="text-ink underline underline-offset-4">
              {business.phoneDisplay}
            </a>
          </p>
          <p>
            <a href={`mailto:${business.email}`} className="text-ink underline underline-offset-4">
              {business.email}
            </a>
          </p>
          <a
            href={business.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-ink underline underline-offset-4"
          >
            {business.instagram}
          </a>
        </div>

        <div className="space-y-3 text-sm">
          <p className="eyebrow">Horaires</p>
          <ul className="space-y-1 text-taupe">
            {business.hours.map((h) => (
              <li key={h.day} className="flex justify-between gap-4">
                <span>{h.day}</span>
                <span className="text-ink">{h.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-4 py-6 font-mono text-[10px] uppercase tracking-widest text-taupe sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {business.name}. Tous droits réservés.</p>
          <div className="flex flex-wrap gap-5">
            <Link to="/mentions-legales">Mentions légales</Link>
            <Link to="/confidentialite">Confidentialité</Link>
            <Link to="/conditions">Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
