import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { business } from "@/config/business";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/emerald-logo.png.asset.json";

const logo = logoAsset as { url: string };

const links = [
  { to: "/", label: "Accueil" },
  { to: "/prestations", label: "Prestations" },
  { to: "/galerie", label: "Galerie" },
  { to: "/a-propos", label: "L'atelier" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logo.url}
            alt="Emerald Beauty"
            className="size-10 rounded-full object-cover ring-1 ring-border"
          />
          <span className="font-display text-lg italic tracking-tight text-ink sm:text-xl">
            {business.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-taupe transition-colors hover:text-ink"
              activeProps={{ className: "text-ink font-medium" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/reserver"
            className="rounded-sm bg-ink px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-porcelain transition-opacity hover:opacity-90"
          >
            Prendre rendez-vous
          </Link>
        </nav>

        <button
          type="button"
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          className="grid size-10 place-items-center md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        className={cn(
          "grid overflow-hidden border-t border-border transition-[grid-template-rows] duration-300 md:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0">
          <nav className="flex flex-col gap-1 px-4 py-4">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-sm px-3 py-3 text-sm text-taupe hover:bg-linen"
                activeProps={{ className: "bg-linen text-ink font-medium" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/reserver"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-sm bg-ink px-4 py-3 text-center font-mono text-[11px] uppercase tracking-widest text-porcelain"
            >
              Prendre rendez-vous
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
