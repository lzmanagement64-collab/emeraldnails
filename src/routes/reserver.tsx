import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { business } from "@/config/business";
import { cn } from "@/lib/utils";
import {
  listPrestations,
  getCreneaux,
  getDisponibilitesMois,
  creerReservation,
} from "@/lib/reservation.functions";
import {
  formatDuree,
  formatEuros,
  parisLongDate,
  parisTime,
  todayParisISO,
  addDaysISO,
} from "@/lib/tz";
import { REGLES } from "@/lib/reservation-schemas";

export const Route = createFileRoute("/reserver")({
  component: ReserverPage,
  // ?prestation=<id> : présélection depuis le bouton « Choisir » d'une fiche prestation.
  validateSearch: (search: Record<string, unknown>): { prestation?: string } =>
    typeof search.prestation === "string" ? { prestation: search.prestation } : {},
  head: () => ({
    meta: [
      { title: "Réserver en ligne — Emerald Beauty, prothésiste ongulaire à Lons" },
      {
        name: "description",
        content:
          "Réservez votre rendez-vous ongles en ligne chez Emerald Beauty à Lons (64) : choisissez votre prestation, votre créneau et recevez votre confirmation par email.",
      },
      { property: "og:title", content: "Réserver en ligne — Emerald Beauty" },
      {
        property: "og:description",
        content:
          "Prise de rendez-vous en ligne en 4 étapes chez Emerald Beauty, studio d'ongles à Lons.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Prestation = {
  id: string;
  nom: string;
  description: string;
  duree_minutes: number;
  prix: number;
  couleur: string;
};

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];
const MOIS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function moisCourant(dateISO: string) {
  return dateISO.slice(0, 7);
}

function ReserverPage() {
  const { prestation: prestationDemandee } = Route.useSearch();
  const chargerPrestations = useServerFn(listPrestations);
  const chargerCreneaux = useServerFn(getCreneaux);
  const chargerMois = useServerFn(getDisponibilitesMois);
  const enregistrer = useServerFn(creerReservation);

  const [etape, setEtape] = useState(1);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [prestation, setPrestation] = useState<Prestation | null>(null);

  const aujourdhui = todayParisISO();
  const dernierJour = addDaysISO(aujourdhui, REGLES.maxJoursAvance);
  const [mois, setMois] = useState(moisCourant(aujourdhui));
  const [dispoMois, setDispoMois] = useState<Record<string, number>>({});
  const [chargeMois, setChargeMois] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [creneaux, setCreneaux] = useState<string[]>([]);
  const [chargeCreneaux, setChargeCreneaux] = useState(false);
  const [heure, setHeure] = useState<string | null>(null);

  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    telephone: "",
    email: "",
    commentaire: "",
    consentement: false,
  });
  const [envoi, setEnvoi] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    dateDebut: string;
    dateFin: string;
    prestation: string;
    dureeMinutes: number;
    prix: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = (await chargerPrestations({})) as unknown as Prestation[];
        setPrestations(rows);
        const demandee = rows.find((p) => p.id === prestationDemandee);
        if (demandee) {
          setPrestation(demandee);
          setEtape(2);
        }
      } catch {
        toast.error("Impossible de charger les prestations.");
      } finally {
        setChargement(false);
      }
    })();
    // Présélection uniquement au premier chargement de la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargerPrestations]);

  useEffect(() => {
    if (!prestation) return;
    let actif = true;
    setChargeMois(true);
    chargerMois({ data: { prestationId: prestation.id, mois } })
      .then((rows) => {
        if (!actif) return;
        const map: Record<string, number> = {};
        for (const r of rows as Array<{ date: string; creneaux: number }>) map[r.date] = r.creneaux;
        setDispoMois(map);
      })
      .catch(() => actif && toast.error("Impossible de charger le calendrier."))
      .finally(() => actif && setChargeMois(false));
    return () => {
      actif = false;
    };
  }, [prestation, mois, chargerMois]);

  useEffect(() => {
    if (!prestation || !date) return;
    let actif = true;
    setChargeCreneaux(true);
    setHeure(null);
    chargerCreneaux({ data: { prestationId: prestation.id, date } })
      .then((rows) => actif && setCreneaux(rows as string[]))
      .catch(() => actif && toast.error("Impossible de charger les créneaux."))
      .finally(() => actif && setChargeCreneaux(false));
    return () => {
      actif = false;
    };
  }, [prestation, date, chargerCreneaux]);

  const grille = useMemo(() => {
    const [y, m] = mois.split("-").map(Number);
    const premier = new Date(Date.UTC(y, m - 1, 1, 12));
    const decalage = (premier.getUTCDay() + 6) % 7; // lundi en premier
    const nbJours = new Date(Date.UTC(y, m, 0, 12)).getUTCDate();
    const cases: Array<string | null> = Array.from({ length: decalage }, () => null);
    for (let d = 1; d <= nbJours; d++) {
      cases.push(`${mois}-${String(d).padStart(2, "0")}`);
    }
    return cases;
  }, [mois]);

  const soumettre = async () => {
    if (!prestation || !date || !heure) return;
    setEnvoi(true);
    try {
      const res = await enregistrer({
        data: {
          prestationId: prestation.id,
          date,
          heure,
          prenom: form.prenom,
          nom: form.nom,
          telephone: form.telephone,
          email: form.email,
          commentaire: form.commentaire,
          consentement: form.consentement as true,
        },
      });
      setConfirmation({
        dateDebut: res.dateDebut,
        dateFin: res.dateFin,
        prestation: res.prestation,
        dureeMinutes: res.dureeMinutes,
        prix: res.prix,
      });
      setEtape(4);
    } catch (e) {
      const msg = (e as Error).message || "Une erreur est survenue.";
      toast.error(msg.includes("créneau") ? msg : msg.replace(/^Error:\s*/, ""));
      if (msg.includes("créneau")) {
        setEtape(2);
        setHeure(null);
      }
    } finally {
      setEnvoi(false);
    }
  };

  const lienCalendrier = useMemo(() => {
    if (!confirmation) return "#";
    const fmt = (s: string) => s.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${confirmation.prestation} — ${business.name}`,
      dates: `${fmt(new Date(confirmation.dateDebut).toISOString())}/${fmt(new Date(confirmation.dateFin).toISOString())}`,
      location: business.address,
      details: `Rendez-vous chez ${business.name}. ${business.phoneDisplay}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [confirmation]);

  const etapes = ["Prestation", "Date & heure", "Coordonnées", "Confirmation"];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-8 text-center">
        <p className="eyebrow">Prise de rendez-vous</p>
        <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">Réserver en ligne</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-taupe">
          Quatre étapes, deux minutes. Vous recevez un email récapitulatif immédiatement, puis la
          confirmation définitive de Maria.
        </p>
      </header>

      <ol className="mb-8 flex items-center justify-between gap-1">
        {etapes.map((label, i) => {
          const n = i + 1;
          const fait = etape > n;
          return (
            <li key={label} className="flex flex-1 flex-col items-center gap-2 text-center">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full border font-mono text-[11px]",
                  etape === n && "border-ink bg-ink text-porcelain",
                  fait && "border-ink/30 bg-ink/10 text-ink",
                  etape < n && "border-border text-taupe",
                )}
              >
                {fait ? <Check className="size-4" /> : n}
              </span>
              <span
                className={cn(
                  "font-mono text-[9px] uppercase tracking-widest",
                  etape === n ? "text-ink" : "text-taupe",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* ÉTAPE 1 — PRESTATION */}
      {etape === 1 && (
        <section aria-label="Choix de la prestation" className="space-y-3">
          {chargement ? (
            <p className="flex items-center justify-center gap-2 py-16 text-taupe">
              <Loader2 className="size-4 animate-spin" /> Chargement des prestations…
            </p>
          ) : prestations.length === 0 ? (
            <p className="py-16 text-center text-taupe">
              Aucune prestation disponible pour le moment. Contactez-nous au {business.phoneDisplay}
              .
            </p>
          ) : (
            prestations.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPrestation(p);
                  setDate(null);
                  setHeure(null);
                  setEtape(2);
                }}
                className={cn(
                  "flex w-full items-start gap-4 rounded-sm border p-5 text-left transition-colors",
                  prestation?.id === p.id
                    ? "border-ink bg-linen/40"
                    : "border-border bg-card hover:border-ink/40",
                )}
              >
                <span
                  aria-hidden
                  className="mt-1 size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: p.couleur }}
                />
                <span className="flex-1">
                  <span className="block font-display text-lg text-ink">{p.nom}</span>
                  {p.description && (
                    <span className="mt-1 block text-sm text-taupe">{p.description}</span>
                  )}
                  <span className="mt-2 block font-mono text-[11px] uppercase tracking-widest text-taupe">
                    {formatDuree(p.duree_minutes)} · {formatEuros(p.prix)}
                  </span>
                </span>
              </button>
            ))
          )}
        </section>
      )}

      {/* ÉTAPE 2 — DATE & HEURE */}
      {etape === 2 && prestation && (
        <section aria-label="Choix de la date et de l'heure" className="space-y-6">
          <div className="rounded-sm border border-border bg-card p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                aria-label="Mois précédent"
                disabled={mois <= moisCourant(aujourdhui)}
                onClick={() => {
                  const [y, m] = mois.split("-").map(Number);
                  const d = new Date(Date.UTC(y, m - 2, 1));
                  setMois(d.toISOString().slice(0, 7));
                }}
                className="grid size-9 place-items-center rounded-sm border border-border disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="font-display text-lg text-ink">
                {MOIS_FR[Number(mois.slice(5, 7)) - 1]} {mois.slice(0, 4)}
              </p>
              <button
                type="button"
                aria-label="Mois suivant"
                disabled={mois >= moisCourant(dernierJour)}
                onClick={() => {
                  const [y, m] = mois.split("-").map(Number);
                  const d = new Date(Date.UTC(y, m, 1));
                  setMois(d.toISOString().slice(0, 7));
                }}
                className="grid size-9 place-items-center rounded-sm border border-border disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1 text-center font-mono text-[10px] uppercase text-taupe">
              {JOURS.map((j, i) => (
                <span key={i}>{j}</span>
              ))}
            </div>

            <div className={cn("grid grid-cols-7 gap-1", chargeMois && "opacity-50")}>
              {grille.map((jour, i) =>
                jour === null ? (
                  <span key={`v${i}`} />
                ) : (
                  <button
                    key={jour}
                    type="button"
                    disabled={
                      (dispoMois[jour] ?? 0) === 0 || jour < aujourdhui || jour > dernierJour
                    }
                    onClick={() => setDate(jour)}
                    className={cn(
                      "aspect-square rounded-sm border text-sm transition-colors",
                      date === jour
                        ? "border-ink bg-ink text-porcelain"
                        : (dispoMois[jour] ?? 0) > 0
                          ? "border-border bg-background text-ink hover:border-ink/50"
                          : "border-transparent text-taupe/40",
                    )}
                    aria-label={`${jour} — ${dispoMois[jour] ?? 0} créneaux`}
                  >
                    {Number(jour.slice(8))}
                  </button>
                ),
              )}
            </div>
            {chargeMois && (
              <p className="mt-3 flex items-center gap-2 text-xs text-taupe">
                <Loader2 className="size-3 animate-spin" /> Recherche des disponibilités…
              </p>
            )}
          </div>

          {date && (
            <div className="rounded-sm border border-border bg-card p-4 sm:p-6">
              <p className="mb-3 font-display text-lg text-ink">
                {parisLongDate(`${date}T12:00:00Z`)}
              </p>
              {chargeCreneaux ? (
                <p className="flex items-center gap-2 py-4 text-sm text-taupe">
                  <Loader2 className="size-4 animate-spin" /> Chargement des créneaux…
                </p>
              ) : creneaux.length === 0 ? (
                <p className="py-4 text-sm text-taupe">
                  Plus de créneau disponible ce jour-là pour cette prestation.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {creneaux.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setHeure(c)}
                      className={cn(
                        "rounded-sm border py-2.5 text-sm transition-colors",
                        heure === c
                          ? "border-ink bg-ink text-porcelain"
                          : "border-border hover:border-ink/50",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-taupe">
            Réservation possible au plus tôt {REGLES.delaiMinHeures} h à l'avance et jusqu'à{" "}
            {REGLES.maxJoursAvance} jours. Horaires affichés en heure de Paris.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEtape(1)}
              className="rounded-sm border border-border px-5 py-3 font-mono text-[11px] uppercase tracking-widest"
            >
              Retour
            </button>
            <button
              type="button"
              disabled={!heure}
              onClick={() => setEtape(3)}
              className="flex-1 rounded-sm bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-porcelain disabled:opacity-40"
            >
              Continuer
            </button>
          </div>
        </section>
      )}

      {/* ÉTAPE 3 — COORDONNÉES */}
      {etape === 3 && prestation && date && heure && (
        <section aria-label="Vos coordonnées" className="space-y-6">
          <div className="rounded-sm border border-border bg-linen/40 p-5">
            <p className="font-display text-lg text-ink">{prestation.nom}</p>
            <p className="mt-1 text-sm text-taupe">
              {parisLongDate(`${date}T12:00:00Z`)} à {heure} ·{" "}
              {formatDuree(prestation.duree_minutes)} · {formatEuros(prestation.prix)}
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              soumettre();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { id: "prenom", label: "Prénom", type: "text", autoComplete: "given-name" },
                { id: "nom", label: "Nom", type: "text", autoComplete: "family-name" },
                { id: "telephone", label: "Téléphone", type: "tel", autoComplete: "tel" },
                { id: "email", label: "Email", type: "email", autoComplete: "email" },
              ].map((f) => (
                <div key={f.id}>
                  <label htmlFor={f.id} className="mb-1 block text-sm text-taupe">
                    {f.label} <span aria-hidden>*</span>
                  </label>
                  <input
                    id={f.id}
                    type={f.type}
                    required
                    autoComplete={f.autoComplete}
                    value={form[f.id as "prenom"]}
                    onChange={(e) => setForm((s) => ({ ...s, [f.id]: e.target.value }))}
                    className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
              ))}
            </div>

            <div>
              <label htmlFor="commentaire" className="mb-1 block text-sm text-taupe">
                Commentaire (inspiration, longueur souhaitée, allergies…)
              </label>
              <textarea
                id="commentaire"
                rows={4}
                maxLength={1000}
                value={form.commentaire}
                onChange={(e) => setForm((s) => ({ ...s, commentaire: e.target.value }))}
                className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-taupe">
              <input
                type="checkbox"
                required
                checked={form.consentement}
                onChange={(e) => setForm((s) => ({ ...s, consentement: e.target.checked }))}
                className="mt-1 size-4 accent-[var(--color-ink)]"
              />
              <span>
                J'accepte que mes données soient utilisées pour la gestion de mon rendez-vous,
                conformément à la{" "}
                <Link to="/confidentialite" className="underline">
                  politique de confidentialité
                </Link>
                .
              </span>
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEtape(2)}
                className="rounded-sm border border-border px-5 py-3 font-mono text-[11px] uppercase tracking-widest"
              >
                Retour
              </button>
              <button
                type="submit"
                disabled={envoi}
                className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-porcelain disabled:opacity-60"
              >
                {envoi && <Loader2 className="size-4 animate-spin" />}
                {envoi ? "Enregistrement…" : "Confirmer ma demande"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ÉTAPE 4 — CONFIRMATION */}
      {etape === 4 && confirmation && (
        <section aria-label="Confirmation" className="space-y-6 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-ink/10">
            <Check className="size-6 text-ink" />
          </div>
          <div>
            <h2 className="font-display text-2xl text-ink">Demande enregistrée</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-taupe">
              Un email récapitulatif vient de vous être envoyé à <strong>{form.email}</strong>.
              Maria vous adresse la confirmation définitive très rapidement.
            </p>
          </div>

          <div className="mx-auto max-w-md rounded-sm border border-border bg-linen/40 p-5 text-left">
            <p className="font-display text-lg text-ink">{confirmation.prestation}</p>
            <p className="mt-1 text-sm text-taupe">
              {parisLongDate(confirmation.dateDebut)} à {parisTime(confirmation.dateDebut)}
            </p>
            <p className="mt-1 text-sm text-taupe">
              {formatDuree(confirmation.dureeMinutes)} · {formatEuros(confirmation.prix)}
            </p>
            <p className="mt-3 text-sm text-taupe">{business.address}</p>
          </div>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={lienCalendrier}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm border border-border px-5 py-3 font-mono text-[11px] uppercase tracking-widest"
            >
              Ajouter à mon calendrier
            </a>
            <Link
              to="/"
              className="rounded-sm bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-porcelain"
            >
              Retour à l'accueil
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
