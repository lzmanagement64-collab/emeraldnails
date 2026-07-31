import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarX, Loader2 } from "lucide-react";
import { business } from "@/config/business";
import { annulerReservation } from "@/lib/reservation.functions";
import { parisDateTime } from "@/lib/tz";

export const Route = createFileRoute("/annulation")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : "",
  }),
  component: AnnulationPage,
  head: () => ({
    meta: [
      { title: "Annuler mon rendez-vous — Emerald Beauty" },
      {
        name: "description",
        content:
          "Annulez votre rendez-vous chez Emerald Beauty à Lons depuis le lien reçu par email, en quelques secondes.",
      },
      { property: "og:title", content: "Annuler mon rendez-vous — Emerald Beauty" },
      {
        property: "og:description",
        content: "Page d'annulation sécurisée des rendez-vous Emerald Beauty.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AnnulationPage() {
  const { token } = Route.useSearch();
  const annuler = useServerFn(annulerReservation);
  const [etat, setEtat] = useState<"attente" | "chargement" | "fait" | "erreur">("attente");
  const [message, setMessage] = useState("");
  const [dateDebut, setDateDebut] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setEtat("erreur");
  }, [token]);

  const confirmer = async () => {
    setEtat("chargement");
    try {
      const res = await annuler({ data: { token } });
      setMessage(res.message);
      setDateDebut(res.dateDebut ?? null);
      setEtat("fait");
    } catch (e) {
      setMessage((e as Error).message || "Lien d'annulation invalide.");
      setEtat("erreur");
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 text-center sm:px-6">
      <div className="mx-auto mb-6 grid size-14 place-items-center rounded-full bg-ink/10">
        <CalendarX className="size-6 text-ink" />
      </div>
      <h1 className="font-display text-3xl text-ink">Annuler mon rendez-vous</h1>

      {etat === "attente" && (
        <>
          <p className="mt-3 text-sm text-taupe">
            Confirmez l'annulation de votre rendez-vous. Le créneau sera immédiatement libéré pour
            une autre cliente.
          </p>
          <button
            type="button"
            onClick={confirmer}
            className="mt-8 w-full rounded-sm bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-porcelain"
          >
            Confirmer l'annulation
          </button>
        </>
      )}

      {etat === "chargement" && (
        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-taupe">
          <Loader2 className="size-4 animate-spin" /> Annulation en cours…
        </p>
      )}

      {(etat === "fait" || etat === "erreur") && (
        <>
          <p className="mt-3 text-sm text-taupe">
            {message ||
              "Lien d'annulation invalide ou expiré. Contactez-nous directement pour modifier votre rendez-vous."}
          </p>
          {dateDebut && (
            <p className="mt-2 text-sm text-taupe">Rendez-vous du {parisDateTime(dateDebut)}</p>
          )}
          <p className="mt-6 text-sm text-taupe">
            Une question ?{" "}
            <a href={`tel:${business.phone}`} className="underline">
              {business.phoneDisplay}
            </a>
          </p>
        </>
      )}

      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to="/reserver"
          className="rounded-sm border border-border px-5 py-3 font-mono text-[11px] uppercase tracking-widest"
        >
          Reprendre un rendez-vous
        </Link>
        <Link
          to="/"
          className="rounded-sm border border-transparent px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-taupe"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
