import { Link } from "@tanstack/react-router";
import type { PrestationPublique } from "@/lib/site-data";

export function ServiceCard({ service }: { service: PrestationPublique }) {
  return (
    <article className="group flex flex-col justify-between gap-5 rounded-sm border border-border bg-card p-6 transition-shadow hover:shadow-[0_20px_50px_-30px_rgba(28,25,23,0.35)]">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-xl text-ink">{service.nom}</h3>
          <span className="font-mono text-sm text-bordeaux">{service.prix} €</span>
        </div>
        <p className="text-sm text-taupe">{service.description}</p>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-taupe">
          {formatDuration(service.duree_minutes)}
        </span>
        <Link
          to="/reserver"
          search={{ prestation: service.id }}
          className="border-b border-ink pb-0.5 text-[11px] font-medium uppercase tracking-widest text-ink"
        >
          Choisir
        </Link>
      </div>
    </article>
  );
}

export function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h${String(m).padStart(2, "0")}`;
  if (h) return `${h}h`;
  return `${m} min`;
}
