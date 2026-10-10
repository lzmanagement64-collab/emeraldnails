import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
import { business } from "@/config/business";
import { ChampPiege } from "@/components/site/ChampPiege";
import { ACOMPTE_TEXTE, acompteFormate, montantAcompte, POURCENT_ACOMPTE } from "@/lib/acompte";
import { ANNULATION_TEXTE, REGLE_ACOMPTE_TEXTE } from "@/lib/annulation";
import { MAX_PRESTATIONS, nomsPrestations, totaux } from "@/lib/selection";
import { parCategorie } from "@/lib/categories";

/** Temps laissé à la cliente pour payer (identique au serveur, voir acompte.server.ts). */
const DELAI_PAIEMENT_AFFICHE = 30;
import { cn } from "@/lib/utils";
import {
  listPrestations,
  getCreneaux,
  getDisponibilitesMois,
  creerReservation,
  infosPaiement,
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
          "Réservez votre rendez-vous ongles en ligne chez Emerald Beauty à Lons (64) : choisissez votre prestation et votre créneau, Maria confirme ensuite votre rendez-vous.",
      },
      { property: "og:title", content: "Réserver en ligne — Emerald Beauty" },
      {
        property: "og:description",
        content:
          "Prise de rendez-vous en ligne en 4 étapes chez Emerald Beauty, prothésiste ongulaire à Lons.",
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
  categorie: string;
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
  const lirePaiement = useServerFn(infosPaiement);
  // Paiement de l'acompte en ligne actif ? (déterminé par le serveur)
  const [paiement, setPaiement] = useState({ actif: false, modeTest: false });
  useEffect(() => {
    lirePaiement({})
      .then(setPaiement)
      .catch(() => undefined);
  }, [lirePaiement]);

  const [etape, setEtape] = useState(1);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [chargement, setChargement] = useState(true);
  // Prestations choisies, dans l'ordre où la cliente les a ajoutées.
  const [selection, setSelection] = useState<Prestation[]>([]);
  const cle = selection.map((p) => p.id).join(",");
  const total = useMemo(() => totaux(selection), [selection]);
  const noms = nomsPrestations(selection);

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
  // Anti-spam : champ piège + temps passé sur la page avant l'envoi.
  const [piege, setPiege] = useState("");
  const ouvertA = useRef(0);
  useEffect(() => {
    ouvertA.current = performance.now();
  }, []);
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
        // Bouton « Choisir » d'une fiche : prestation déjà cochée, d'autres peuvent s'ajouter.
        const demandee = rows.find((p) => p.id === prestationDemandee);
        if (demandee) setSelection([demandee]);
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
    if (!cle || etape !== 2) return;
    let actif = true;
    setChargeMois(true);
    chargerMois({ data: { prestationIds: cle.split(","), mois } })
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
  }, [cle, etape, mois, chargerMois]);

  useEffect(() => {
    if (!cle || !date) return;
    let actif = true;
    setChargeCreneaux(true);
    setHeure(null);
    chargerCreneaux({ data: { prestationIds: cle.split(","), date } })
      .then((rows) => actif && setCreneaux(rows as string[]))
      .catch(() => actif && toast.error("Impossible de charger les créneaux."))
      .finally(() => actif && setChargeCreneaux(false));
    return () => {
      actif = false;
    };
  }, [cle, date, chargerCreneaux]);

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

  /** Ajoute ou retire une prestation ; le créneau est à rechoisir car la durée change. */
  const basculer = (p: Prestation) => {
    const dejaChoisie = selection.some((x) => x.id === p.id);
    if (!dejaChoisie && selection.length >= MAX_PRESTATIONS) {
      toast.error(`${MAX_PRESTATIONS} prestations maximum par rendez-vous.`);
      return;
    }
    setSelection(dejaChoisie ? selection.filter((x) => x.id !== p.id) : [...selection, p]);
    setDate(null);
    setHeure(null);
  };

  const soumettre = async () => {
    if (!selection.length || !date || !heure) return;
    setEnvoi(true);
    try {
      const res = await enregistrer({
        data: {
          prestationIds: selection.map((p) => p.id),
          date,
          heure,
          prenom: form.prenom,
          nom: form.nom,
          telephone: form.telephone,
          email: form.email,
          commentaire: form.commentaire,
          consentement: form.consentement as true,
          siteWeb: piege,
          dureeMs: Math.round(performance.now() - ouvertA.current),
        },
      });
      if (res.paiementUrl) {
        // Paiement de l'acompte sur la page sécurisée Stripe.
        window.location.assign(res.paiementUrl);
        return;
      }
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
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
      <header className="mb-8 text-center">
        <p className="eyebrow">Prise de rendez-vous</p>
        <h1 className="mt-3 font-display text-5xl leading-none text-ink sm:text-6xl">
          Réserver en ligne
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-taupe">
          Quatre étapes, deux minutes. Maria confirme ensuite votre rendez-vous. {ACOMPTE_TEXTE}
        </p>
      </header>

      <div className="carte mb-8 p-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-sand">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sage to-emerald transition-[width] duration-700 ease-out"
            style={{ width: `${(etape / etapes.length) * 100}%` }}
          />
        </div>
        <ol className="mt-3 grid grid-cols-4 gap-1 text-center">
          {etapes.map((label, i) => {
            const n = i + 1;
            return (
              <li
                key={label}
                className={cn(
                  "flex flex-col items-center gap-1 text-[11px] leading-tight sm:flex-row sm:justify-center sm:gap-2 sm:text-xs",
                  etape >= n ? "text-ink" : "text-taupe/70",
                )}
                aria-current={etape === n ? "step" : undefined}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-[11px] font-semibold transition-colors",
                    etape > n && "bg-sage-soft text-emerald",
                    etape === n && "bg-emerald text-porcelain",
                    etape < n && "border border-border",
                  )}
                >
                  {etape > n ? <Check className="size-3.5" strokeWidth={2} /> : n}
                </span>
                <span className={cn(etape === n && "font-semibold")}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>

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
            <>
              <p className="text-sm text-taupe">
                Choisissez une ou plusieurs prestations (par exemple une dépose et une nouvelle
                pose) : les prix et les durées s'additionnent.
              </p>
              {parCategorie(prestations).map(({ categorie, liste }) => (
                <div key={categorie} className="space-y-2 pt-3">
                  <h2 className="px-1 font-display text-2xl text-ink">{categorie}</h2>
                  {liste.map((p) => {
                    const choisie = selection.some((x) => x.id === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={choisie}
                        onClick={() => basculer(p)}
                        className={cn(
                          "flex w-full items-center gap-4 rounded-[1.4rem] border p-4 text-left transition-all duration-300 sm:p-5",
                          choisie
                            ? "border-emerald bg-sage-soft/70 shadow-[0_16px_40px_-28px_rgba(20,80,60,0.6)]"
                            : "border-border bg-porcelain/70 hover:border-emerald/40",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
                            choisie
                              ? "border-emerald bg-emerald text-porcelain"
                              : "border-ink/20 bg-porcelain",
                          )}
                        >
                          {choisie && <Check className="size-3.5" strokeWidth={2.2} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-ink">{p.nom}</span>
                          {p.description && (
                            <span className="mt-0.5 block text-sm leading-snug text-taupe">
                              {p.description}
                            </span>
                          )}
                          <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-taupe">
                            <Clock className="size-3.5" strokeWidth={1.5} />
                            {formatDuree(p.duree_minutes)}
                          </span>
                        </span>
                        <span className="shrink-0 font-display text-2xl text-ink">
                          {formatEuros(p.prix)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Total de la sélection, toujours visible en bas de l'écran */}
              <div className="fond-emeraude sticky bottom-3 z-10 mt-4 rounded-[1.75rem] p-5 shadow-[0_24px_60px_-24px_rgba(15,50,40,0.7)]">
                {selection.length === 0 ? (
                  <p className="text-sm text-porcelain/80">
                    Touchez une ou plusieurs prestations pour composer votre rendez-vous.
                  </p>
                ) : (
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-porcelain/80">{noms}</p>
                      <p className="mt-1 text-xs text-porcelain/60">
                        {selection.length} prestation{selection.length > 1 ? "s" : ""} ·{" "}
                        {formatDuree(total.duree)} · acompte {acompteFormate(total.prix)} (
                        {POURCENT_ACOMPTE} %)
                      </p>
                    </div>
                    <p className="shrink-0 font-display text-4xl leading-none text-porcelain">
                      {formatEuros(total.prix)}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  disabled={selection.length === 0}
                  onClick={() => setEtape(2)}
                  className="btn-primaire mt-4 w-full !bg-none !bg-porcelain !text-emerald-deep"
                >
                  Continuer
                  <ChevronRight className="size-4" strokeWidth={1.8} />
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* ÉTAPE 2 — DATE & HEURE */}
      {etape === 2 && selection.length > 0 && (
        <section aria-label="Choix de la date et de l'heure" className="space-y-6">
          <div className="rounded-[1.4rem] bg-sage-soft/60 p-4 text-sm">
            <p className="text-ink">{noms}</p>
            <p className="mt-1 text-taupe">
              Durée totale {formatDuree(total.duree)} · {formatEuros(total.prix)} — les créneaux
              proposés tiennent compte de la durée totale.
            </p>
          </div>
          <div className="carte p-4 sm:p-6">
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
                className="grid size-9 place-items-center rounded-2xl border border-border disabled:opacity-30"
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
                className="grid size-9 place-items-center rounded-2xl border border-border disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-taupe">
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
                      "aspect-square rounded-full border text-sm transition-colors",
                      date === jour
                        ? "border-emerald bg-emerald text-porcelain"
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
            <div className="carte p-4 sm:p-6">
              <p className="mb-3 font-display text-lg text-ink">
                {parisLongDate(`${date}T12:00:00Z`)}
              </p>
              {chargeCreneaux ? (
                <p className="flex items-center gap-2 py-4 text-sm text-taupe">
                  <Loader2 className="size-4 animate-spin" /> Chargement des créneaux…
                </p>
              ) : creneaux.length === 0 ? (
                <p className="py-4 text-sm text-taupe">
                  Plus de créneau disponible ce jour-là pour une durée de {formatDuree(total.duree)}
                  .
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {creneaux.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setHeure(c)}
                      className={cn(
                        "rounded-full border py-2.5 text-sm transition-colors",
                        heure === c
                          ? "border-emerald bg-emerald text-porcelain"
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
            <button type="button" onClick={() => setEtape(1)} className="btn-secondaire">
              Retour
            </button>
            <button
              type="button"
              disabled={!heure}
              onClick={() => setEtape(3)}
              className="btn-primaire flex-1"
            >
              Continuer
            </button>
          </div>
        </section>
      )}

      {/* ÉTAPE 3 — COORDONNÉES */}
      {etape === 3 && selection.length > 0 && date && heure && (
        <section aria-label="Vos coordonnées" className="space-y-6">
          <div className="fond-aurore rounded-[1.75rem] p-6">
            <p className="font-display text-lg text-ink">
              {parisLongDate(`${date}T12:00:00Z`)} à {heure}
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {selection.map((p) => (
                <li key={p.id} className="flex justify-between gap-4 text-taupe">
                  <span>
                    {p.nom} · {formatDuree(p.duree_minutes)}
                  </span>
                  <span className="text-ink">{formatEuros(p.prix)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-4 border-t border-border pt-2 font-medium text-ink">
                <span>Total · {formatDuree(total.duree)}</span>
                <span>{formatEuros(total.prix)}</span>
              </li>
            </ul>
            <p className="mt-3 text-sm text-ink">
              Acompte pour valider le rendez-vous : {acompteFormate(total.prix)} ({POURCENT_ACOMPTE}{" "}
              % du total), déduit du montant total. Reste à régler sur place :{" "}
              {formatEuros(Math.max(0, total.prix - montantAcompte(total.prix)))}.
            </p>
            <p className="mt-2 text-sm text-taupe">{ANNULATION_TEXTE}</p>
            <p className="mt-2 text-sm text-taupe">{REGLE_ACOMPTE_TEXTE}</p>
            {paiement.actif && (
              <p className="mt-2 text-sm text-taupe">
                L'acompte se règle en ligne sur la page sécurisée de Stripe. Le créneau vous est
                réservé {DELAI_PAIEMENT_AFFICHE} minutes le temps du paiement ; sans paiement, il
                est libéré.
              </p>
            )}
            {paiement.modeTest && (
              <p className="mt-2 rounded-2xl border border-border bg-card p-3 text-xs text-taupe">
                Mode test : aucun paiement réel n'est encaissé. Carte de test : 4242 4242 4242 4242,
                date future, code 123.
              </p>
            )}
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
                    className="w-full rounded-2xl border border-border bg-porcelain/80 px-4 py-3 text-sm"
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
                className="w-full rounded-2xl border border-border bg-porcelain/80 px-4 py-3 text-sm"
              />
            </div>

            <ChampPiege id="reserver-ref" value={piege} onChange={setPiege} />

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
              <button type="button" onClick={() => setEtape(2)} className="btn-secondaire">
                Retour
              </button>
              <button type="submit" disabled={envoi} className="btn-primaire flex-1">
                {envoi && <Loader2 className="size-4 animate-spin" />}
                {envoi
                  ? "Enregistrement…"
                  : paiement.actif
                    ? `Payer l'acompte de ${acompteFormate(total.prix)}`
                    : "Confirmer ma demande"}
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
              Votre demande a bien été transmise. Maria vous contacte pour confirmer le rendez-vous.{" "}
              {ACOMPTE_TEXTE}
            </p>
          </div>

          <div className="mx-auto max-w-md fond-aurore rounded-[1.75rem] p-6 text-left">
            <p className="font-display text-lg text-ink">{confirmation.prestation}</p>
            <p className="mt-1 text-sm text-taupe">
              {parisLongDate(confirmation.dateDebut)} à {parisTime(confirmation.dateDebut)}
            </p>
            <p className="mt-1 text-sm text-taupe">
              {formatDuree(confirmation.dureeMinutes)} · {formatEuros(confirmation.prix)}
            </p>
            <p className="mt-1 text-sm text-ink">
              Acompte : {acompteFormate(confirmation.prix)} ({POURCENT_ACOMPTE} %)
            </p>
            <p className="mt-3 text-sm text-taupe">{ANNULATION_TEXTE}</p>
            <p className="mt-3 text-sm text-taupe">{business.address}</p>
          </div>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={lienCalendrier}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondaire"
            >
              Ajouter à mon calendrier
            </a>
            <Link to="/" className="btn-primaire">
              Retour à l'accueil
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
