// ============================================================
// Bouton « Activer les notifications » de l'app Emerald Beauty Pro.
// Sur iPhone / iPad, les notifications ne marchent qu'une fois l'app
// ajoutée à l'écran d'accueil (limite d'Apple) : on l'explique.
// ============================================================
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { estAppareilApple, estAppInstallee, serviceWorkerApp } from "@/lib/app-pro";
import {
  adminPushAbonner,
  adminPushCle,
  adminPushDesabonner,
  adminPushTester,
} from "@/lib/push.functions";
import { depuisB64urlNavigateur } from "@/lib/b64url";

type Etat = "chargement" | "indisponible" | "iphone-a-installer" | "refuse" | "inactif" | "actif";

const cartePush = "rounded-xl border border-border bg-card p-5 space-y-3";
const gros =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-base font-semibold disabled:opacity-50 sm:w-auto";

function nomAppareil() {
  const ua = navigator.userAgent;
  if (/iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
    return "iPad";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android";
  return "Ordinateur";
}

export function NotificationsPush() {
  const lireCle = useServerFn(adminPushCle);
  const abonner = useServerFn(adminPushAbonner);
  const desabonner = useServerFn(adminPushDesabonner);
  const tester = useServerFn(adminPushTester);
  const [etat, setEtat] = useState<Etat>("chargement");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    (async () => {
      const possible =
        "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!possible) {
        setEtat(estAppareilApple() && !estAppInstallee() ? "iphone-a-installer" : "indisponible");
        return;
      }
      if (Notification.permission === "denied") return setEtat("refuse");
      const reg = await serviceWorkerApp();
      const abo = await reg?.pushManager.getSubscription();
      setEtat(abo && Notification.permission === "granted" ? "actif" : "inactif");
    })().catch(() => setEtat("indisponible"));
  }, []);

  const activer = async () => {
    setEnvoi(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEtat(permission === "denied" ? "refuse" : "inactif");
        return;
      }
      const reg = await serviceWorkerApp();
      if (!reg) throw new Error("Notifications indisponibles sur cet appareil.");
      await navigator.serviceWorker.ready;
      const { clePublique } = await lireCle({});
      const abo =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: depuisB64urlNavigateur(clePublique),
        }));
      const json = abo.toJSON();
      await abonner({
        data: {
          endpoint: abo.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          appareil: nomAppareil(),
        },
      });
      setEtat("actif");
      await tester({});
      toast.success("Notifications activées : une notification d'essai vient d'être envoyée.");
    } catch (e) {
      toast.error((e as Error).message || "Activation impossible.");
    } finally {
      setEnvoi(false);
    }
  };

  const desactiver = async () => {
    setEnvoi(true);
    try {
      const reg = await serviceWorkerApp();
      const abo = await reg?.pushManager.getSubscription();
      if (abo) {
        await desabonner({ data: { endpoint: abo.endpoint } });
        await abo.unsubscribe();
      }
      setEtat("inactif");
      toast.success("Notifications désactivées sur cet appareil.");
    } catch (e) {
      toast.error((e as Error).message || "Impossible de désactiver.");
    } finally {
      setEnvoi(false);
    }
  };

  const essai = async () => {
    setEnvoi(true);
    try {
      const { envoyes } = await tester({});
      if (envoyes > 0) toast.success("Notification d'essai envoyée.");
      else toast.error("Aucun appareil n'a reçu la notification. Désactivez puis réactivez.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className={cartePush} aria-label="Notifications">
      <h2 className="flex items-center gap-2 font-display text-lg text-ink">
        <Bell className="size-5 text-emerald" /> Notifications
      </h2>
      <p className="text-sm text-taupe">
        Soyez prévenue sur ce téléphone : nouvelle réservation, paiement reçu, annulation, et chaque
        matin la liste des rendez-vous du jour. Les notifications n'affichent jamais le nom ni les
        coordonnées des clientes.
      </p>
      {etat === "chargement" && <Loader2 className="size-5 animate-spin text-taupe" />}
      {etat === "inactif" && (
        <button
          type="button"
          onClick={activer}
          disabled={envoi}
          className={`${gros} bg-emerald text-porcelain`}
        >
          {envoi ? <Loader2 className="size-5 animate-spin" /> : <Bell className="size-5" />}
          Activer les notifications
        </button>
      )}
      {etat === "actif" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald">
            <Bell className="size-4" /> Activées sur cet appareil
          </p>
          <button
            type="button"
            onClick={essai}
            disabled={envoi}
            className={`${gros} border border-border text-ink`}
          >
            Envoyer un essai
          </button>
          <button
            type="button"
            onClick={desactiver}
            disabled={envoi}
            className={`${gros} border border-border text-taupe`}
          >
            <BellOff className="size-5" /> Désactiver
          </button>
        </div>
      )}
      {etat === "iphone-a-installer" && (
        <p className="rounded-xl bg-amber-100 p-4 text-sm text-amber-950">
          Sur iPhone et iPad, les notifications ne fonctionnent que dans l'app installée sur l'écran
          d'accueil. Suivez les étapes de la page{" "}
          <a href="/app" className="font-semibold underline">
            emeraldbeauty.fr/app
          </a>
          , puis ouvrez l'app depuis son icône et revenez ici.
        </p>
      )}
      {etat === "refuse" && (
        <p className="rounded-xl bg-amber-100 p-4 text-sm text-amber-950">
          Les notifications sont bloquées pour cette app. Autorisez-les dans les réglages du
          téléphone (Réglages → Notifications → Emerald Beauty Pro), puis revenez ici.
        </p>
      )}
      {etat === "indisponible" && (
        <p className="text-sm text-taupe">
          Ce navigateur ne permet pas les notifications. Utilisez l'app installée (page{" "}
          <a href="/app" className="underline">
            emeraldbeauty.fr/app
          </a>
          ).
        </p>
      )}
    </section>
  );
}
