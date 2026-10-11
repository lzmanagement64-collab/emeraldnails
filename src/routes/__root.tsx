import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBar } from "@/components/site/MobileBar";
import { AnimationsDefilement } from "@/components/site/AnimationsDefilement";
import { Toaster } from "@/components/ui/sonner";
import { business, SITE_URL } from "@/config/business";
import { schemaSalon } from "@/lib/schema-org";
import { chargerHoraires } from "@/lib/site-data";

const SITE_TITLE = `${business.name} — Prothésiste ongulaire à ${business.city}`;
const SITE_DESCRIPTION = `${business.name}, prothésiste ongulaire à ${business.city}. Semi-permanent, renforcement, pose gel et nail art. Réservation en ligne.`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Horaires d'ouverture (base de données) — affichés dans le pied de page.
  loader: async () => ({ horaires: await chargerHoraires() }),
  staleTime: 5 * 60_000,
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "author", content: business.name },
      { name: "theme-color", content: "#f7f4ec" },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: business.name },
      { property: "og:image", content: `${SITE_URL}/og-image.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: `${business.name} — prothésiste ongulaire à ${business.city}`,
      },
      { property: "og:locale", content: "fr_FR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${SITE_URL}/og-image.png` },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(schemaSalon(loaderData?.horaires ?? [])),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        {!isAdmin && <Header />}
        <main className="flex-1">
          <Outlet />
        </main>
        {!isAdmin && <Footer />}
        {!isAdmin && <MobileBar />}
        <AnimationsDefilement />
      </div>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

function NotFoundComponent() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div className="max-w-md">
        <p className="eyebrow mb-4">404</p>
        <h1 className="mb-3 font-display text-4xl">Cette page n'existe pas</h1>
        <p className="text-taupe">Retournez à l'accueil pour poursuivre votre visite.</p>
        <a href="/" className="btn-primaire mt-6">
          Accueil
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div className="max-w-md">
        <p className="eyebrow mb-4">Erreur</p>
        <h1 className="mb-3 font-display text-3xl">Une erreur est survenue</h1>
        <p className="text-taupe">Merci de réessayer dans un instant.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-primaire"
          >
            Réessayer
          </button>
          <a href="/" className="btn-secondaire">
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}
