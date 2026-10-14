// ============================================================
// App installable « Emerald Beauty Pro » (espace de gestion de Maria).
// Les balises d'installation ne sont ajoutées QUE sur les pages de
// l'espace pro (/admin, /auth, /reset-password, /app) : le site public
// des clientes ne propose jamais d'installer l'app.
// ============================================================
export const NOM_APP = "Emerald Beauty Pro";
export const VERT_APP = "#1e6a4c";

/** Écrans de démarrage iPhone / iPad : [largeur, hauteur, densité] en points CSS. */
const ECRANS: [number, number, number][] = [
  [440, 956, 3],
  [402, 874, 3],
  [430, 932, 3],
  [393, 852, 3],
  [428, 926, 3],
  [390, 844, 3],
  [360, 780, 3],
  [414, 896, 3],
  [375, 812, 3],
  [414, 896, 2],
  [375, 667, 2],
  [320, 568, 2],
  [1024, 1366, 2],
  [834, 1194, 2],
  [820, 1180, 2],
  [834, 1112, 2],
  [810, 1080, 2],
  [744, 1133, 2],
  [768, 1024, 2],
];

/** Balises <head> de l'app (manifeste, icônes iPhone/iPad, écran de démarrage). */
export function teteAppPro() {
  return {
    meta: [
      { name: "theme-color", content: VERT_APP },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: NOM_APP },
      { name: "application-name", content: NOM_APP },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
    ],
    links: [
      { rel: "manifest", href: "/pro/manifest.webmanifest" },
      ...[180, 167, 152, 120].map((t) => ({
        rel: "apple-touch-icon",
        sizes: `${t}x${t}`,
        href: `/pro/apple-icone-${t}.png`,
      })),
      ...ECRANS.map(([w, h, d]) => ({
        rel: "apple-touch-startup-image",
        href: `/pro/demarrage-${w * d}x${h * d}.png`,
        media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${d}) and (orientation: portrait)`,
      })),
    ],
  };
}

/** L'app est-elle ouverte depuis l'écran d'accueil (plein écran) ? */
export function estAppInstallee() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone ou iPad (y compris iPad « bureau » sous iPadOS). */
export function estAppareilApple() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Service worker des notifications (portée limitée à l'espace de gestion). */
export async function serviceWorkerApp() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" });
  } catch {
    return null;
  }
}
