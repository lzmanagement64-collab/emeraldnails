// ============================================================
// emeraldbeauty.fr/app — installer l'app « Emerald Beauty Pro » (Maria).
// Page non référencée par Google, absente du menu et du plan du site.
// ============================================================
import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  estAppareilApple,
  estAppInstallee,
  NOM_APP,
  serviceWorkerApp,
  teteAppPro,
  VERT_APP,
} from "@/lib/app-pro";

export const Route = createFileRoute("/app")({
  head: () => ({
    ...teteAppPro(),
    meta: [
      ...teteAppPro().meta,
      { title: `Installer ${NOM_APP}` },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Installation de l'app de gestion Emerald Beauty Pro." },
    ],
  }),
  component: PageApp,
});

type Systeme = "apple" | "android";
type InvitationInstallation = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function PageApp() {
  const [systeme, setSysteme] = useState<Systeme>("apple");
  const [installee, setInstallee] = useState(false);
  const [invitation, setInvitation] = useState<InvitationInstallation | null>(null);
  const [installeeAndroid, setInstalleeAndroid] = useState(false);

  useEffect(() => {
    setSysteme(
      estAppareilApple() ? "apple" : /Android/.test(navigator.userAgent) ? "android" : "apple",
    );
    setInstallee(estAppInstallee());
    void serviceWorkerApp();
    const garder = (e: Event) => {
      e.preventDefault();
      setInvitation(e as InvitationInstallation);
    };
    const fini = () => setInstalleeAndroid(true);
    window.addEventListener("beforeinstallprompt", garder);
    window.addEventListener("appinstalled", fini);
    return () => {
      window.removeEventListener("beforeinstallprompt", garder);
      window.removeEventListener("appinstalled", fini);
    };
  }, []);

  const installer = async () => {
    if (!invitation) return;
    await invitation.prompt();
    const { outcome } = await invitation.userChoice;
    if (outcome === "accepted") setInstalleeAndroid(true);
    setInvitation(null);
  };

  return (
    <div className="min-h-screen bg-linen/40 pb-16">
      <header
        className="px-5 pb-10 pt-[calc(2.5rem+env(safe-area-inset-top))] text-center text-porcelain"
        style={{ backgroundColor: VERT_APP }}
      >
        <img
          src="/pro/icone-192.png"
          alt=""
          width={88}
          height={88}
          className="mx-auto rounded-[1.4rem] shadow-lg ring-1 ring-white/20"
        />
        <h1 className="mt-5 font-display text-4xl">{NOM_APP}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-porcelain/85">
          L'app de gestion d'Emerald Beauty sur votre téléphone : planning, rendez-vous, clientes,
          chiffre d'affaires et notifications.
        </p>
      </header>

      <main className="mx-auto max-w-xl space-y-6 px-4 pt-6">
        {installee ? (
          <section className="carte space-y-4 p-6 text-center">
            <Check className="mx-auto size-8 text-emerald" />
            <p className="font-display text-2xl text-ink">L'app est installée</p>
            <a href="/admin" className="btn-primaire w-full">
              Ouvrir l'espace de gestion
            </a>
          </section>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-card p-1.5 shadow-sm">
              {(
                [
                  ["apple", "iPhone / iPad"],
                  ["android", "Android"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSysteme(id)}
                  className={cn(
                    "rounded-xl py-3 text-sm font-semibold",
                    systeme === id ? "bg-emerald text-porcelain" : "text-taupe",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {systeme === "apple" ? (
              <ol className="space-y-4">
                <Etape n={1} titre="Ouvrez cette page dans Safari" image={<ImageSafari />}>
                  L'installation ne fonctionne qu'avec Safari (pas Chrome ni Instagram). Adresse :{" "}
                  <strong>emeraldbeauty.fr/app</strong>
                </Etape>
                <Etape n={2} titre="Touchez le bouton Partager" image={<ImagePartager />}>
                  C'est le carré avec une flèche vers le haut : en bas de l'écran sur iPhone, en
                  haut à droite sur iPad.
                </Etape>
                <Etape
                  n={3}
                  titre="Choisissez « Sur l'écran d'accueil »"
                  image={<ImageEcranAccueil />}
                >
                  Faites défiler si besoin, touchez « Sur l'écran d'accueil », puis « Ajouter » en
                  haut à droite. L'icône {NOM_APP} apparaît sur votre écran d'accueil.
                </Etape>
              </ol>
            ) : (
              <ol className="space-y-4">
                <Etape n={1} titre="Ouvrez cette page dans Chrome" image={<ImageChrome />}>
                  Adresse : <strong>emeraldbeauty.fr/app</strong>
                </Etape>
                <Etape n={2} titre="Touchez « Installer »" image={<ImageInstaller />}>
                  {installeeAndroid ? (
                    <span className="font-semibold text-emerald">C'est installé !</span>
                  ) : invitation ? (
                    <button type="button" onClick={installer} className="btn-primaire mt-1 w-full">
                      <Download className="size-4" /> Installer
                    </button>
                  ) : (
                    <>
                      Si le bouton n'apparaît pas, touchez le menu <strong>⋮</strong> en haut à
                      droite de Chrome, puis <strong>« Installer l'application »</strong> (ou «
                      Ajouter à l'écran d'accueil »).
                    </>
                  )}
                </Etape>
                <Etape n={3} titre="Ouvrez l'app depuis son icône" image={<ImageIcone />}>
                  L'icône {NOM_APP} est sur votre écran d'accueil. L'app s'ouvre en plein écran,
                  directement sur l'espace de gestion.
                </Etape>
              </ol>
            )}
          </>
        )}

        <section className="carte space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-display text-xl text-ink">
            <Bell className="size-5 text-emerald" /> Notifications
          </h2>
          <p className="text-sm text-taupe">
            Une fois dans l'app, connectez-vous une seule fois, puis touchez{" "}
            <strong>Plus → « Activer les notifications »</strong>. Vous serez prévenue des nouvelles
            réservations, des paiements, des annulations et, chaque matin, des rendez-vous du jour.
          </p>
          <p className="rounded-xl bg-amber-100 p-3 text-sm text-amber-950">
            Sur iPhone et iPad, les notifications fonctionnent uniquement dans l'app ajoutée à
            l'écran d'accueil (iOS 16.4 ou plus récent), pas dans Safari.
          </p>
        </section>

        <p className="text-center text-xs text-taupe">
          Accès réservé à la gérante : le mot de passe est demandé à la première connexion, puis
          vous restez connectée.
        </p>
      </main>
    </div>
  );
}

function Etape({
  n,
  titre,
  image,
  children,
}: {
  n: number;
  titre: string;
  image: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="carte overflow-hidden p-0">
      <div className="grid place-items-center bg-sage-soft/50 px-6 py-5">{image}</div>
      <div className="space-y-1.5 p-5">
        <p className="flex items-center gap-3 font-display text-xl text-ink">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald font-sans text-sm font-semibold text-porcelain">
            {n}
          </span>
          {titre}
        </p>
        <div className="text-sm leading-relaxed text-taupe">{children}</div>
      </div>
    </li>
  );
}

// ------------------------------------------------------------
// Illustrations (dessins simplifiés des écrans, sans texte de marque)
// ------------------------------------------------------------
const cadre = "h-auto w-full max-w-[260px]";
const ENCRE = "#13342a";
const GRIS = "#d9ddd8";
const BLEU = "#0a84ff";

function Telephone({ children }: { children: ReactNode }) {
  return (
    <>
      <rect
        x="2"
        y="2"
        width="256"
        height="156"
        rx="22"
        fill="#fff"
        stroke={ENCRE}
        strokeWidth="3"
      />
      {children}
    </>
  );
}

function ImageSafari() {
  return (
    <svg viewBox="0 0 260 160" className={cadre} role="img" aria-label="Barre d'adresse de Safari">
      <Telephone>
        <rect x="22" y="104" width="216" height="34" rx="12" fill="#f1f2f0" />
        <text
          x="130"
          y="126"
          textAnchor="middle"
          fontSize="15"
          fill={ENCRE}
          fontFamily="sans-serif"
        >
          emeraldbeauty.fr/app
        </text>
        <circle cx="130" cy="58" r="24" fill="none" stroke={BLEU} strokeWidth="5" />
        <path d="M120 68 l6-16 16-6 -6 16z" fill={BLEU} />
      </Telephone>
    </svg>
  );
}

function ImagePartager() {
  return (
    <svg viewBox="0 0 260 160" className={cadre} role="img" aria-label="Bouton Partager de Safari">
      <Telephone>
        <rect x="16" y="110" width="228" height="34" rx="10" fill="#f1f2f0" />
        {[50, 90, 170, 210].map((x) => (
          <circle key={x} cx={x} cy="127" r="5" fill={GRIS} />
        ))}
        <circle cx="130" cy="127" r="24" fill={BLEU} opacity="0.15" />
        <rect
          x="120"
          y="122"
          width="20"
          height="17"
          rx="3"
          fill="none"
          stroke={BLEU}
          strokeWidth="3"
        />
        <path
          d="M130 112 v18 M123 118 l7-7 7 7"
          fill="none"
          stroke={BLEU}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M150 70 q-12 22 -14 34"
          fill="none"
          stroke={ENCRE}
          strokeWidth="2.5"
          strokeDasharray="5 5"
        />
        <text x="152" y="62" fontSize="15" fill={ENCRE} fontFamily="sans-serif">
          Partager
        </text>
      </Telephone>
    </svg>
  );
}

function ImageEcranAccueil() {
  return (
    <svg
      viewBox="0 0 260 160"
      className={cadre}
      role="img"
      aria-label="Menu « Sur l'écran d'accueil »"
    >
      <Telephone>
        <rect x="20" y="22" width="220" height="36" rx="10" fill="#f1f2f0" />
        <text x="36" y="45" fontSize="14" fill="#7a817b" fontFamily="sans-serif">
          Copier
        </text>
        <rect
          x="20"
          y="64"
          width="220"
          height="40"
          rx="10"
          fill={BLEU}
          opacity="0.12"
          stroke={BLEU}
          strokeWidth="2.5"
        />
        <text x="36" y="89" fontSize="15" fontWeight="600" fill={ENCRE} fontFamily="sans-serif">
          Sur l'écran d'accueil
        </text>
        <rect
          x="206"
          y="74"
          width="20"
          height="20"
          rx="5"
          fill="none"
          stroke={ENCRE}
          strokeWidth="2.5"
        />
        <path d="M216 79 v10 M211 84 h10" stroke={ENCRE} strokeWidth="2.5" strokeLinecap="round" />
        <rect x="20" y="110" width="220" height="36" rx="10" fill="#f1f2f0" />
        <text x="36" y="133" fontSize="14" fill="#7a817b" fontFamily="sans-serif">
          Ajouter aux favoris
        </text>
      </Telephone>
    </svg>
  );
}

function ImageChrome() {
  return (
    <svg viewBox="0 0 260 160" className={cadre} role="img" aria-label="Barre d'adresse de Chrome">
      <Telephone>
        <rect x="22" y="22" width="190" height="34" rx="17" fill="#f1f2f0" />
        <text x="117" y="44" textAnchor="middle" fontSize="14" fill={ENCRE} fontFamily="sans-serif">
          emeraldbeauty.fr/app
        </text>
        {[30, 39, 48].map((y) => (
          <circle key={y} cx="232" cy={y} r="3" fill={ENCRE} />
        ))}
        <circle cx="130" cy="105" r="26" fill="#ea4335" />
        <path d="M130 79 a26 26 0 0 1 22.5 13 L130 105 z" fill="#fbbc05" />
        <path d="M107.5 92 a26 26 0 0 1 22.5-13 L130 105z" fill="#ea4335" />
        <path d="M130 131 a26 26 0 0 1 -22.5-39 L130 105z" fill="#34a853" />
        <path d="M152.5 92 a26 26 0 0 1 -22.5 39 L130 105z" fill="#fbbc05" />
        <circle cx="130" cy="105" r="10" fill="#fff" />
        <circle cx="130" cy="105" r="7" fill="#4285f4" />
      </Telephone>
    </svg>
  );
}

function ImageInstaller() {
  return (
    <svg
      viewBox="0 0 260 160"
      className={cadre}
      role="img"
      aria-label="Menu « Installer l'application »"
    >
      <Telephone>
        <rect
          x="70"
          y="18"
          width="172"
          height="124"
          rx="12"
          fill="#fff"
          stroke={GRIS}
          strokeWidth="2"
        />
        <text x="86" y="44" fontSize="13" fill="#7a817b" fontFamily="sans-serif">
          Nouvel onglet
        </text>
        <rect
          x="76"
          y="58"
          width="160"
          height="34"
          rx="8"
          fill="#e8f0fe"
          stroke="#4285f4"
          strokeWidth="2"
        />
        <path
          d="M90 68 v12 M84 75 l6 6 6-6 M84 85 h12"
          fill="none"
          stroke={ENCRE}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <text x="104" y="80" fontSize="13" fontWeight="600" fill={ENCRE} fontFamily="sans-serif">
          Installer l'application
        </text>
        <text x="86" y="118" fontSize="13" fill="#7a817b" fontFamily="sans-serif">
          Paramètres
        </text>
      </Telephone>
    </svg>
  );
}

function ImageIcone() {
  return (
    <svg
      viewBox="0 0 260 160"
      className={cadre}
      role="img"
      aria-label="Icône de l'app sur l'écran d'accueil"
    >
      <Telephone>
        {[40, 100, 160].map((x) => (
          <rect key={x} x={x} y="30" width="44" height="44" rx="11" fill={GRIS} />
        ))}
        <rect x="40" y="90" width="44" height="44" rx="11" fill={GRIS} />
        <image
          href="/pro/icone-192.png"
          x="100"
          y="90"
          width="44"
          height="44"
          clipPath="inset(0 round 11px)"
        />
        <rect
          x="96"
          y="86"
          width="52"
          height="52"
          rx="14"
          fill="none"
          stroke={VERT_APP}
          strokeWidth="3"
        />
        <text x="178" y="117" fontSize="12" fill={ENCRE} fontFamily="sans-serif">
          Emerald Pro
        </text>
      </Telephone>
    </svg>
  );
}
