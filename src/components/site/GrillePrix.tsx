import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock } from "lucide-react";
import type { PrestationPublique } from "@/lib/site-data";
import { parCategorie } from "@/lib/categories";
import { acompteFormate } from "@/lib/acompte";
import { formatDuree, formatEuros } from "@/lib/tz";
import { cn } from "@/lib/utils";

/** Grille de prix moderne, regroupée par catégorie (catégories gérées dans l'admin). */
export function GrillePrix({ prestations }: { prestations: PrestationPublique[] }) {
  const groupes = parCategorie(prestations);
  if (!groupes.length) {
    return <p className="text-taupe">Les prestations sont momentanément indisponibles.</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groupes.map(({ categorie, liste }, i) => {
        const desPrix = Math.min(...liste.map((p) => Number(p.prix)));
        return (
          <section
            key={categorie}
            data-apparait
            style={{ "--delai": `${(i % 2) * 90}ms` } as React.CSSProperties}
            className={cn(
              "carte overflow-hidden p-2",
              // Une catégorie à plusieurs lignes occupe toute la largeur sur ordinateur
              liste.length > 3 && "md:col-span-2",
            )}
          >
            <header className="flex items-end justify-between gap-4 px-4 pb-3 pt-4">
              <h3 className="font-display text-3xl text-ink">{categorie}</h3>
              <p className="text-xs text-taupe">dès {formatEuros(desPrix)}</p>
            </header>
            <ul className={cn("grid gap-1.5", liste.length > 3 && "md:grid-cols-2")}>
              {liste.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/reserver"
                    search={{ prestation: p.id }}
                    className="group flex items-center gap-4 rounded-[1.25rem] bg-porcelain/70 px-4 py-4 transition-colors hover:bg-sage-soft/70"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.98rem] font-semibold text-ink">{p.nom}</span>
                      {p.description && (
                        <span className="mt-0.5 block text-sm leading-snug text-taupe">
                          {p.description}
                        </span>
                      )}
                      <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-taupe">
                        <Clock className="size-3.5" strokeWidth={1.5} />
                        {formatDuree(p.duree_minutes)}
                        <span aria-hidden>·</span>
                        acompte {acompteFormate(p.prix)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-2">
                      <span className="font-display text-[1.7rem] leading-none text-ink">
                        {formatEuros(p.prix)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-porcelain px-3 py-1 text-xs font-semibold text-emerald transition-colors group-hover:border-emerald group-hover:bg-emerald group-hover:text-porcelain">
                        Choisir <ArrowUpRight className="size-3.5" strokeWidth={1.6} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
