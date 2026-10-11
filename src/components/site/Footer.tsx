import { useEffect, useState } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { Clock, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { business } from "@/config/business";
import { areas } from "@/data/areas";
import { lignesHoraires } from "@/lib/site-data";
import { supabase } from "@/integrations/supabase/client";

const rootRoute = getRouteApi("__root__");

/** Lien discret vers l'espace de gestion : connexion, ou admin directement si déjà connectée. */
function LienEspacePro() {
  const [connectee, setConnectee] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setConnectee(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setConnectee(!!session));
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <Link to={connectee ? "/admin" : "/auth"} rel="nofollow" className="text-taupe hover:text-ink">
      Espace pro
    </Link>
  );
}

export function Footer() {
  const { horaires } = rootRoute.useLoaderData();
  return (
    <footer className="px-3 pb-28 sm:px-5 lg:pb-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-porcelain/70 backdrop-blur">
        <div className="grid gap-10 p-7 sm:p-10 md:grid-cols-12">
          <div className="space-y-4 md:col-span-4">
            <p className="font-display text-4xl text-ink">{business.name}</p>
            <p className="max-w-xs text-sm text-taupe">{business.shortDescription}</p>
            <a
              href={business.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-ink transition-colors hover:bg-sage-soft"
            >
              <Instagram className="size-4 text-emerald" strokeWidth={1.6} />
              {business.instagram}
            </a>
          </div>

          <div className="space-y-3 text-sm md:col-span-3">
            <p className="eyebrow">Contact</p>
            <p className="flex gap-2 text-taupe">
              <MapPin className="mt-0.5 size-4 shrink-0 text-emerald" strokeWidth={1.5} />
              {business.address}
            </p>
            <a href={`tel:${business.phone}`} className="flex gap-2 text-ink hover:text-emerald">
              <Phone className="mt-0.5 size-4 shrink-0 text-emerald" strokeWidth={1.5} />
              {business.phoneDisplay}
            </a>
            <a href={`mailto:${business.email}`} className="flex gap-2 text-ink hover:text-emerald">
              <Mail className="mt-0.5 size-4 shrink-0 text-emerald" strokeWidth={1.5} />
              {business.email}
            </a>
          </div>

          <div className="space-y-3 text-sm md:col-span-3">
            <p className="eyebrow flex items-center gap-2">
              <Clock className="size-3.5" strokeWidth={1.8} /> Horaires
            </p>
            <ul className="space-y-1.5 text-taupe">
              {lignesHoraires(horaires).map((h) => (
                <li key={h.day} className="flex justify-between gap-4">
                  <span>{h.day}</span>
                  <span className="text-right text-ink">{h.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 text-sm md:col-span-2">
            <p className="eyebrow">Secteur</p>
            <ul className="space-y-1.5 text-taupe">
              {areas.map((a) => (
                <li key={a.slug}>
                  <Link
                    to="/onglerie/$ville"
                    params={{ ville: a.slug }}
                    className="underline-offset-4 hover:text-ink hover:underline"
                  >
                    Onglerie {a.city}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-border px-7 py-5 text-xs text-taupe sm:flex-row sm:px-10">
          <p>
            © {new Date().getFullYear()} {business.name} · SIRET {business.legal.siretAffiche}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/securite" className="hover:text-ink">
              Sécurité
            </Link>
            <Link to="/mentions-legales" className="hover:text-ink">
              Mentions légales
            </Link>
            <Link to="/confidentialite" className="hover:text-ink">
              Confidentialité
            </Link>
            <Link to="/conditions" className="hover:text-ink">
              CGV
            </Link>
            <LienEspacePro />
          </div>
        </div>
      </div>
    </footer>
  );
}
