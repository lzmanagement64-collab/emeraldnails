import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { business } from "@/config/business";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/emerald-logo.png.asset.json";

const logo = logoAsset as { url: string };

const links = [
  { to: "/", label: "Accueil" },
  { to: "/prestations", label: "Prestations" },
  { to: "/galerie", label: "Galerie" },
  { to: "/a-propos", label: "Savoir-faire" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [defile, setDefile] = useState(false);

  // En-tête plus marqué dès que la page défile.
  useEffect(() => {
    const maj = () => setDefile(window.scrollY > 12);
    maj();
    window.addEventListener("scroll", maj, { passive: true });
    return () => window.removeEventListener("scroll", maj);
  }, []);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <div
        className={cn(
          "mx-auto flex h-16 w-full max-w-6xl items-center justify-between rounded-full border px-3 transition-all duration-500 sm:px-4",
          defile || open
            ? "border-border bg-porcelain/80 shadow-[0_18px_40px_-28px_rgba(20,50,40,0.45)] backdrop-blur-xl"
            : "border-transparent bg-transparent",
        )}
      >
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img
            src={logo.url}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover ring-1 ring-border"
          />
          <span className="font-display text-[1.45rem] leading-none text-ink">{business.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-3.5 py-2 text-sm text-taupe transition-colors hover:bg-sage-soft/70 hover:text-ink"
              activeProps={{ className: "bg-sage-soft text-ink font-semibold" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/reserver" className="btn-primaire ml-2 !px-5 !py-2.5">
            Réserver <ArrowUpRight className="size-4" strokeWidth={1.6} />
          </Link>
        </nav>

        <button
          type="button"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          className="grid size-11 place-items-center rounded-full border border-border bg-porcelain/70 lg:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <X className="size-5" strokeWidth={1.5} />
          ) : (
            <Menu className="size-5" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Menu mobile */}
      <div
        className={cn(
          "mx-auto mt-2 grid max-w-6xl overflow-hidden transition-[grid-template-rows,opacity] duration-500 lg:hidden",
          open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <nav className="carte flex flex-col gap-1 p-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3.5 font-display text-2xl text-ink transition-colors hover:bg-sage-soft/60"
                activeProps={{ className: "bg-sage-soft/70" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
