import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2, LogOut, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { business } from "@/config/business";
import { cn } from "@/lib/utils";
import { listLeads } from "@/lib/booking.functions";
import {
  adminReservations,
  adminPrestations,
  adminHoraires,
  adminIndisponibilites,
  adminChangerStatut,
  adminCreerReservation,
  adminEnregistrerPrestation,
  adminEnregistrerHoraire,
  adminAjouterIndisponibilite,
  adminSupprimerIndisponibilite,
  adminEmailTest,
  adminReglages,
  adminEnregistrerReglages,
  adminRefuserReservation,
  adminDiagnosticPaiement,
} from "@/lib/reservation.functions";
import { STATUTS, STATUT_LABEL, type Statut } from "@/lib/reservation-schemas";
import {
  devisAFaire,
  lignesDuRendezVous,
  nomComplet,
  nomsPrestations,
  prixAffiche,
  totaux,
} from "@/lib/selection";
import { ORDRE_CATEGORIES } from "@/lib/categories";
import { GalerieAdmin } from "@/components/admin/GalerieAdmin";
import {
  formatDuree,
  formatEuros,
  parisDateISO,
  parisLongDate,
  parisTime,
  todayParisISO,
} from "@/lib/tz";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Administration — Emerald Beauty" },
      { name: "description", content: "Espace privé de gestion des rendez-vous Emerald Beauty." },
      { property: "og:title", content: "Administration — Emerald Beauty" },
      { property: "og:description", content: "Espace privé de gestion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type Reservation = {
  id: string;
  prestation_id: string;
  date_debut: string;
  date_fin: string;
  statut: Statut;
  cliente_prenom: string;
  cliente_nom: string;
  cliente_telephone: string;
  cliente_email: string;
  commentaire: string | null;
  cree_le: string;
  prix_total: number | null;
  prestations_detail: unknown;
  acompte_montant: number | null;
  acompte_statut: "non_requis" | "en_attente" | "paye" | "rembourse" | "expire";
  acompte_expire_le: string | null;
  acompte_paye_le: string | null;
  prestations: { nom: string; duree_minutes: number; prix: number; couleur: string } | null;
};

/** Montant total d'un rendez-vous (toutes prestations comprises). */
const totalRdv = (r: Reservation) =>
  Number(r.prix_total ?? totaux(lignesDuRendezVous(r)).prix ?? 0);

/** Liste des prestations d'un rendez-vous, avec le prix de chacune et le total. */
function DetailPrestations({ r }: { r: Reservation }) {
  const lignes = lignesDuRendezVous(r);
  const { duree } = totaux(lignes);
  return (
    <div>
      <ul className="space-y-0.5">
        {lignes.map((l, i) => (
          <li key={`${l.id}-${i}`} className="flex justify-between gap-3">
            <span className="text-ink">{l.nom}</span>
            <span className={l.sur_devis ? "font-semibold text-amber-800" : "text-taupe"}>
              {prixAffiche(l)}
            </span>
          </li>
        ))}
      </ul>
      {lignes.length > 1 && (
        <p className="mt-1 flex justify-between gap-3 border-t border-border pt-1 text-ink">
          <span>Total · {formatDuree(duree)}</span>
          <span>{formatEuros(totalRdv(r))}</span>
        </p>
      )}
      {lignes.length === 1 && <p className="text-taupe">{formatDuree(duree)}</p>}
      {devisAFaire(lignes) && (
        <p className="mt-1.5 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
          Devis à faire : prix à fixer avec la cliente (non compté dans le total ni l'acompte)
        </p>
      )}
    </div>
  );
}

/** Acompte d'un rendez-vous : payé ou non, montant payé, reste à payer sur place. */
function InfoAcompte({ r }: { r: Reservation }) {
  const prix = totalRdv(r);
  const acompte = Number(r.acompte_montant ?? 0);
  switch (r.acompte_statut) {
    case "paye": {
      // Annulation à moins de 72 h ou absence : l'acompte est conservé.
      const conserve = r.statut === "absente" || r.statut === "annulee";
      return (
        <p className="text-xs">
          <span className="text-emerald">Acompte payé : {formatEuros(acompte)}</span>
          <span className="text-taupe">
            {conserve
              ? " · conservé"
              : ` · reste à payer sur place : ${formatEuros(Math.max(0, prix - acompte))}`}
          </span>
        </p>
      );
    }
    case "en_attente":
      return (
        <p className="text-xs text-amber-800">
          Acompte non payé (réservation provisoire
          {r.acompte_expire_le ? ` jusqu'à ${parisTime(r.acompte_expire_le)}` : ""}) · à payer sur
          place si confirmé : {formatEuros(prix)}
        </p>
      );
    case "rembourse":
      return <p className="text-xs text-taupe">Acompte remboursé : {formatEuros(acompte)}</p>;
    case "expire":
      return <p className="text-xs text-taupe">Acompte non payé dans le délai (créneau libéré)</p>;
    default:
      return (
        <p className="text-xs text-taupe">
          Pas d'acompte en ligne · à payer sur place : {formatEuros(prix)}
        </p>
      );
  }
}

type Prestation = {
  id: string;
  nom: string;
  description: string;
  categorie: string;
  duree_minutes: number;
  prix: number;
  couleur: string;
  actif: boolean;
  ordre: number;
  sur_devis: boolean;
  en_option: boolean;
};

type Horaire = {
  id: string;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  pause_debut: string | null;
  pause_fin: string | null;
  ferme: boolean;
};

type Indispo = { id: string; date_debut: string; date_fin: string; motif: string };

type Lead = {
  id: string;
  created_at: string;
  type: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  message: string | null;
};

const STATUT_COULEUR: Record<Statut, string> = {
  en_attente: "bg-amber-100 text-amber-900",
  confirmee: "bg-emerald-100 text-emerald-900",
  annulee: "bg-rose-100 text-rose-900",
  honoree: "bg-stone-100 text-stone-700",
  absente: "bg-neutral-200 text-neutral-700",
};

const JOURS_LONG = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const ONGLETS = [
  { id: "planning", label: "Planning" },
  { id: "reservations", label: "Réservations" },
  { id: "clientes", label: "Clientes" },
  { id: "prestations", label: "Prestations" },
  { id: "galerie", label: "Galerie" },
  { id: "horaires", label: "Horaires" },
  { id: "indispos", label: "Absences" },
  { id: "leads", label: "Demandes" },
  { id: "emails", label: "E-mails & paiement" },
] as const;

type Onglet = (typeof ONGLETS)[number]["id"];

const champ = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";
const btnPrimaire =
  "rounded-xl bg-ink px-4 py-2.5 text-[10px] uppercase tracking-widest text-porcelain disabled:opacity-50";
const btnSecondaire =
  "rounded-xl border border-border px-4 py-2.5 text-[10px] uppercase tracking-widest";
const carte = "rounded-xl border border-border bg-card p-5";

function AdminPage() {
  const navigate = useNavigate();
  const chargerReservations = useServerFn(adminReservations);
  const chargerPrestations = useServerFn(adminPrestations);
  const chargerHoraires = useServerFn(adminHoraires);
  const chargerIndispos = useServerFn(adminIndisponibilites);
  const chargerLeads = useServerFn(listLeads);
  const changerStatut = useServerFn(adminChangerStatut);

  const [pret, setPret] = useState(false);
  const [refuse, setRefuse] = useState(false);
  const [onglet, setOnglet] = useState<Onglet>("planning");

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [horaires, setHoraires] = useState<Horaire[]>([]);
  const [indispos, setIndispos] = useState<Indispo[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  const rafraichir = useCallback(async () => {
    const [r, p, h, i, l] = await Promise.all([
      chargerReservations({ data: undefined }),
      chargerPrestations({ data: undefined }),
      chargerHoraires({ data: undefined }),
      chargerIndispos({ data: undefined }),
      chargerLeads({ data: undefined }).catch(() => []),
    ]);
    setReservations(r as unknown as Reservation[]);
    setPrestations(p as unknown as Prestation[]);
    setHoraires(h as unknown as Horaire[]);
    setIndispos(i as unknown as Indispo[]);
    setLeads(l as unknown as Lead[]);
  }, [chargerReservations, chargerPrestations, chargerHoraires, chargerIndispos, chargerLeads]);

  useEffect(() => {
    let actif = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      try {
        await rafraichir();
      } catch {
        if (actif) setRefuse(true);
      } finally {
        if (actif) setPret(true);
      }
    })();
    return () => {
      actif = false;
    };
  }, [navigate, rafraichir]);

  const deconnexion = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const majStatut = async (id: string, statut: Statut) => {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, statut } : r)));
    try {
      await changerStatut({ data: { id, statut } });
      toast.success(
        statut === "confirmee"
          ? "Rendez-vous validé : e-mail de confirmation envoyé à la cliente."
          : "Statut mis à jour.",
      );
    } catch (e) {
      toast.error((e as Error).message || "Mise à jour impossible");
    }
  };

  const aujourdhui = todayParisISO();
  const aVenir = useMemo(
    () =>
      reservations
        .filter(
          (r) =>
            parisDateISO(r.date_debut) >= aujourdhui &&
            r.statut !== "annulee" &&
            // Réservation provisoire dont le délai de paiement est passé : créneau libéré.
            !(
              r.acompte_statut === "en_attente" &&
              r.acompte_expire_le &&
              new Date(r.acompte_expire_le).getTime() < Date.now()
            ),
        )
        .sort((a, b) => a.date_debut.localeCompare(b.date_debut)),
    [reservations, aujourdhui],
  );

  if (!pret) {
    return (
      <div className="grid min-h-screen place-items-center text-taupe">
        <p className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Chargement…
        </p>
      </div>
    );
  }

  if (refuse) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-2xl text-ink">Accès refusé</h1>
          <p className="mt-2 text-taupe">
            Ce compte n'est pas autorisé à ouvrir l'espace de gestion. Seul le compte de la gérante
            y a accès.
          </p>
          <button onClick={deconnexion} className={cn(btnSecondaire, "mt-6")}>
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linen/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="eyebrow">Administration</p>
            <p className="font-display text-xl">{business.name}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/" className={btnSecondaire}>
              Voir le site
            </Link>
            <button
              onClick={deconnexion}
              className="inline-flex items-center gap-2 rounded-xl border border-bordeaux/40 bg-bordeaux/5 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-bordeaux transition-colors hover:bg-bordeaux hover:text-porcelain"
            >
              <LogOut className="size-4" strokeWidth={1.6} />
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          {[
            { l: "À venir", v: aVenir.length },
            {
              l: "À confirmer",
              v: reservations.filter((r) => r.statut === "en_attente").length,
            },
            {
              l: "Chiffre à venir",
              v: formatEuros(aVenir.reduce((s, r) => s + totalRdv(r), 0)),
            },
            { l: "Demandes", v: leads.length },
          ].map((s) => (
            <div key={s.l} className={carte}>
              <p className="eyebrow">{s.l}</p>
              <p className="mt-2 font-display text-3xl text-ink">{s.v}</p>
            </div>
          ))}
        </div>

        <nav className="mb-5 flex flex-wrap gap-2">
          {ONGLETS.map((t) => (
            <button
              key={t.id}
              onClick={() => setOnglet(t.id)}
              className={cn(
                "rounded-xl px-4 py-2 text-[10px] uppercase tracking-widest",
                onglet === t.id ? "bg-ink text-porcelain" : "border border-border text-taupe",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {onglet === "planning" && (
          <Planning reservations={aVenir} onStatut={majStatut} onRefresh={rafraichir} />
        )}
        {onglet === "reservations" && (
          <Reservations
            reservations={reservations}
            prestations={prestations}
            onStatut={majStatut}
            onRefresh={rafraichir}
          />
        )}
        {onglet === "clientes" && <Clientes reservations={reservations} />}
        {onglet === "prestations" && (
          <Prestations prestations={prestations} onRefresh={rafraichir} />
        )}
        {onglet === "galerie" && <GalerieAdmin />}
        {onglet === "horaires" && <Horaires horaires={horaires} onRefresh={rafraichir} />}
        {onglet === "indispos" && <Absences indispos={indispos} onRefresh={rafraichir} />}
        {onglet === "leads" && <Demandes leads={leads} />}
        {onglet === "emails" && (
          <div className="space-y-6">
            <ReglagesPaiement />
            <ReglagesEmails />
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
/** Demande dont l'acompte est payé et qui attend la validation de Maria. */
const aValider = (r: Reservation) => r.statut === "en_attente" && r.acompte_statut === "paye";

function BadgeStatut({ statut, r }: { statut: Statut; r?: Reservation }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-widest",
        r && aValider(r) ? "bg-amber-200 text-amber-950" : STATUT_COULEUR[statut],
      )}
    >
      {r && aValider(r) ? "Acompte payé – à valider" : STATUT_LABEL[statut]}
    </span>
  );
}

/** Boutons « Valider » / « Refuser » d'une demande en attente. */
function ValidationDemande({
  r,
  onStatut,
  onRefresh,
}: {
  r: Reservation;
  onStatut: (id: string, s: Statut) => void;
  onRefresh: () => Promise<void>;
}) {
  const refuser = useServerFn(adminRefuserReservation);
  const [envoi, setEnvoi] = useState(false);
  // Réservation provisoire dont le paiement est en cours : rien à valider encore.
  if (r.statut !== "en_attente" || r.acompte_statut === "en_attente") return null;

  const paye = r.acompte_statut === "paye";
  const lancerRefus = async () => {
    const message = paye
      ? `Refuser ce rendez-vous ? L'acompte de ${formatEuros(Number(r.acompte_montant ?? 0))} sera remboursé intégralement à ${r.cliente_prenom}, qui recevra un e-mail d'explication.`
      : `Refuser ce rendez-vous ? ${r.cliente_prenom} recevra un e-mail d'explication.`;
    if (!window.confirm(message)) return;
    setEnvoi(true);
    try {
      const res = await refuser({ data: { id: r.id } });
      if (res.acompteEtaitPaye && !res.rembourse) {
        toast.error(
          "Rendez-vous refusé, mais le remboursement automatique a échoué : remboursez l'acompte depuis le tableau de bord Stripe.",
        );
      } else {
        toast.success(
          res.rembourse ? "Rendez-vous refusé, acompte remboursé." : "Rendez-vous refusé.",
        );
      }
      await onRefresh();
    } catch (e) {
      toast.error((e as Error).message || "Refus impossible");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="mt-2 flex w-full flex-wrap gap-2">
      <button
        type="button"
        disabled={envoi}
        onClick={() => onStatut(r.id, "confirmee")}
        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald px-4 py-2 text-xs font-semibold text-porcelain transition-colors hover:bg-emerald-deep disabled:opacity-50"
      >
        <Check className="size-3.5" strokeWidth={2} /> Valider
      </button>
      <button
        type="button"
        disabled={envoi}
        onClick={lancerRefus}
        className="inline-flex items-center gap-1.5 rounded-xl border border-bordeaux/40 px-4 py-2 text-xs font-semibold text-bordeaux transition-colors hover:bg-bordeaux hover:text-porcelain disabled:opacity-50"
      >
        {envoi ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <X className="size-3.5" strokeWidth={2} />
        )}
        {paye ? "Refuser et rembourser" : "Refuser"}
      </button>
    </div>
  );
}

function SelectStatut({ statut, onChange }: { statut: Statut; onChange: (s: Statut) => void }) {
  return (
    <select
      value={statut}
      onChange={(e) => onChange(e.target.value as Statut)}
      aria-label="Changer le statut"
      className="rounded-xl border border-border bg-background px-2 py-1 text-xs"
    >
      {STATUTS.map((s) => (
        <option key={s} value={s}>
          {STATUT_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

function Planning({
  reservations,
  onStatut,
  onRefresh,
}: {
  reservations: Reservation[];
  onStatut: (id: string, s: Statut) => void;
  onRefresh: () => Promise<void>;
}) {
  const parJour = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      const k = parisDateISO(r.date_debut);
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    return [...map.entries()].slice(0, 21);
  }, [reservations]);

  if (parJour.length === 0) {
    return <p className={cn(carte, "text-center text-taupe")}>Aucun rendez-vous à venir.</p>;
  }

  return (
    <div className="space-y-5">
      {parJour.map(([jour, liste]) => (
        <section key={jour} className={carte}>
          <h2 className="font-display text-lg text-ink">{parisLongDate(`${jour}T12:00:00Z`)}</h2>
          <ul className="mt-3 space-y-2">
            {liste.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm"
              >
                <span className="text-ink">{parisTime(r.date_debut)}</span>
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: r.prestations?.couleur ?? "#1f6b43" }}
                />
                <span className="text-ink">
                  {nomsPrestations(lignesDuRendezVous(r))} · {formatEuros(totalRdv(r))}
                </span>
                <span className="text-taupe">
                  {r.cliente_prenom} {r.cliente_nom} · {r.cliente_telephone}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <BadgeStatut statut={r.statut} r={r} />
                  <SelectStatut statut={r.statut} onChange={(s) => onStatut(r.id, s)} />
                </span>
                <div className="w-full">
                  <InfoAcompte r={r} />
                </div>
                <ValidationDemande r={r} onStatut={onStatut} onRefresh={onRefresh} />
                {r.commentaire && <p className="w-full text-xs text-taupe">« {r.commentaire} »</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Reservations({
  reservations,
  prestations,
  onStatut,
  onRefresh,
}: {
  reservations: Reservation[];
  prestations: Prestation[];
  onStatut: (id: string, s: Statut) => void;
  onRefresh: () => Promise<void>;
}) {
  const creer = useServerFn(adminCreerReservation);
  const [filtre, setFiltre] = useState<"tous" | Statut>("tous");
  const [recherche, setRecherche] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [f, setF] = useState({
    prestationId: "",
    date: todayParisISO(),
    heure: "10:00",
    prenom: "",
    nom: "",
    telephone: "",
    email: "",
    commentaire: "",
    statut: "confirmee" as Statut,
  });

  const liste = reservations.filter((r) => {
    if (filtre !== "tous" && r.statut !== filtre) return false;
    if (!recherche.trim()) return true;
    const q = recherche.toLowerCase();
    return `${r.cliente_prenom} ${r.cliente_nom} ${r.cliente_telephone} ${r.cliente_email}`
      .toLowerCase()
      .includes(q);
  });

  const soumettre = async () => {
    setEnvoi(true);
    try {
      await creer({ data: f });
      toast.success("Rendez-vous ajouté.");
      setOuvert(false);
      await onRefresh();
    } catch (e) {
      toast.error((e as Error).message || "Enregistrement impossible");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filtre}
          onChange={(e) => setFiltre(e.target.value as typeof filtre)}
          aria-label="Filtrer par statut"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="tous">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {STATUT_LABEL[s]}
            </option>
          ))}
        </select>
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher une cliente…"
          aria-label="Rechercher une cliente"
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm sm:max-w-xs"
        />
        <button
          onClick={() => setOuvert((v) => !v)}
          className={cn(btnPrimaire, "flex items-center gap-2")}
        >
          <Plus className="size-3.5" /> Ajouter
        </button>
      </div>

      {ouvert && (
        <form
          className={cn(carte, "grid gap-3 sm:grid-cols-2")}
          onSubmit={(e) => {
            e.preventDefault();
            soumettre();
          }}
        >
          <select
            required
            value={f.prestationId}
            onChange={(e) => setF({ ...f, prestationId: e.target.value })}
            aria-label="Prestation"
            className={champ}
          >
            <option value="">Prestation…</option>
            {prestations.map((p) => (
              <option key={p.id} value={p.id}>
                {nomComplet(p.nom, p.categorie)} — {formatDuree(p.duree_minutes)}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              required
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
              aria-label="Date"
              className={champ}
            />
            <input
              type="time"
              required
              value={f.heure}
              onChange={(e) => setF({ ...f, heure: e.target.value })}
              aria-label="Heure"
              className={champ}
            />
          </div>
          <input
            required
            placeholder="Prénom"
            value={f.prenom}
            onChange={(e) => setF({ ...f, prenom: e.target.value })}
            className={champ}
          />
          <input
            required
            placeholder="Nom"
            value={f.nom}
            onChange={(e) => setF({ ...f, nom: e.target.value })}
            className={champ}
          />
          <input
            required
            placeholder="Téléphone"
            value={f.telephone}
            onChange={(e) => setF({ ...f, telephone: e.target.value })}
            className={champ}
          />
          <input
            type="email"
            placeholder="Email (facultatif)"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
            className={champ}
          />
          <textarea
            placeholder="Commentaire"
            rows={2}
            value={f.commentaire}
            onChange={(e) => setF({ ...f, commentaire: e.target.value })}
            className={cn(champ, "sm:col-span-2")}
          />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={envoi} className={btnPrimaire}>
              {envoi ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setOuvert(false)} className={btnSecondaire}>
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {liste.length === 0 ? (
          <p className="p-10 text-center text-taupe">Aucune réservation.</p>
        ) : (
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="bg-linen/50 text-left text-[10px] uppercase tracking-widest text-taupe">
              <tr>
                <th className="px-4 py-3">Créneau</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Prestation</th>
                <th className="px-4 py-3">Acompte</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-4 py-4 text-ink">
                    <p>{parisDateISO(r.date_debut).split("-").reverse().join("/")}</p>
                    <p className="text-taupe">{parisTime(r.date_debut)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-ink">
                      {r.cliente_prenom} {r.cliente_nom}
                    </p>
                    <p className="text-taupe">{r.cliente_telephone}</p>
                    <p className="text-taupe">{r.cliente_email}</p>
                  </td>
                  <td className="px-4 py-4 text-ink">
                    <DetailPrestations r={r} />
                    {r.commentaire && (
                      <p className="mt-1 text-xs text-taupe">« {r.commentaire} »</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <InfoAcompte r={r} />
                  </td>
                  <td className="px-4 py-4">
                    <BadgeStatut statut={r.statut} r={r} />
                    <ValidationDemande r={r} onStatut={onStatut} onRefresh={onRefresh} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <SelectStatut statut={r.statut} onChange={(s) => onStatut(r.id, s)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Clientes({ reservations }: { reservations: Reservation[] }) {
  const clientes = useMemo(() => {
    const map = new Map<
      string,
      {
        nom: string;
        telephone: string;
        email: string;
        total: number;
        derniere: string;
        ca: number;
      }
    >();
    for (const r of reservations) {
      const cle = r.cliente_email.toLowerCase() || r.cliente_telephone;
      const prec = map.get(cle);
      const honore = r.statut === "honoree" || r.statut === "confirmee";
      map.set(cle, {
        nom: `${r.cliente_prenom} ${r.cliente_nom}`,
        telephone: r.cliente_telephone,
        email: r.cliente_email,
        total: (prec?.total ?? 0) + 1,
        derniere: !prec || r.date_debut > prec.derniere ? r.date_debut : prec.derniere,
        ca: (prec?.ca ?? 0) + (honore ? totalRdv(r) : 0),
      });
    }
    return [...map.values()].sort((a, b) => b.derniere.localeCompare(a.derniere));
  }, [reservations]);

  if (clientes.length === 0) {
    return <p className={cn(carte, "text-center text-taupe")}>Aucune cliente enregistrée.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-linen/50 text-left text-[10px] uppercase tracking-widest text-taupe">
          <tr>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Rendez-vous</th>
            <th className="px-4 py-3">Dernier</th>
            <th className="px-4 py-3">Cumul</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.email + c.telephone} className="border-t border-border">
              <td className="px-4 py-4 text-ink">{c.nom}</td>
              <td className="px-4 py-4 text-taupe">
                <p>{c.telephone}</p>
                <p>{c.email}</p>
              </td>
              <td className="px-4 py-4 text-ink">{c.total}</td>
              <td className="px-4 py-4 text-taupe">
                {parisDateISO(c.derniere).split("-").reverse().join("/")}
              </td>
              <td className="px-4 py-4 text-ink">{formatEuros(c.ca)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Prestations({
  prestations,
  onRefresh,
}: {
  prestations: Prestation[];
  onRefresh: () => Promise<void>;
}) {
  const enregistrer = useServerFn(adminEnregistrerPrestation);
  const [edition, setEdition] = useState<Partial<Prestation> | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async () => {
    if (!edition) return;
    setEnvoi(true);
    try {
      await enregistrer({
        data: {
          ...(edition.id ? { id: edition.id } : {}),
          nom: edition.nom ?? "",
          description: edition.description ?? "",
          categorie: (edition.categorie ?? "").trim() || "Autres",
          dureeMinutes: Number(edition.duree_minutes ?? 60),
          prix: Number(edition.prix ?? 0),
          couleur: edition.couleur ?? "#1f6b43",
          actif: edition.actif ?? true,
          ordre: Number(edition.ordre ?? 0),
          surDevis: edition.sur_devis ?? false,
          enOption: edition.en_option ?? false,
        },
      });
      toast.success("Prestation enregistrée.");
      setEdition(null);
      await onRefresh();
    } catch (e) {
      toast.error((e as Error).message || "Enregistrement impossible");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() =>
          setEdition({
            couleur: "#1f6b43",
            actif: true,
            duree_minutes: 60,
            ordre: prestations.length,
          })
        }
        className={cn(btnPrimaire, "flex items-center gap-2")}
      >
        <Plus className="size-3.5" /> Nouvelle prestation
      </button>

      {edition && (
        <form
          className={cn(carte, "grid gap-3 sm:grid-cols-2")}
          onSubmit={(e) => {
            e.preventDefault();
            soumettre();
          }}
        >
          <input
            required
            placeholder="Nom"
            value={edition.nom ?? ""}
            onChange={(e) => setEdition({ ...edition, nom: e.target.value })}
            className={champ}
          />
          <input
            placeholder="Description"
            value={edition.description ?? ""}
            onChange={(e) => setEdition({ ...edition, description: e.target.value })}
            className={champ}
          />
          {/* Catégorie de la grille de prix (choisir dans la liste ou en créer une nouvelle) */}
          <input
            required
            list="categories-prestations"
            placeholder="Catégorie (ex. Semi-permanent)"
            value={edition.categorie ?? ""}
            onChange={(e) => setEdition({ ...edition, categorie: e.target.value })}
            className={champ}
          />
          <datalist id="categories-prestations">
            {ORDRE_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <input
            type="number"
            min={5}
            max={600}
            step={5}
            required
            value={edition.duree_minutes ?? 60}
            onChange={(e) => setEdition({ ...edition, duree_minutes: Number(e.target.value) })}
            aria-label="Durée en minutes"
            className={champ}
          />
          <input
            type="number"
            min={0}
            step={1}
            required
            value={edition.prix ?? 0}
            onChange={(e) => setEdition({ ...edition, prix: Number(e.target.value) })}
            aria-label="Prix en euros"
            className={champ}
          />
          <input
            type="color"
            value={edition.couleur ?? "#1f6b43"}
            onChange={(e) => setEdition({ ...edition, couleur: e.target.value })}
            aria-label="Couleur"
            className="h-10 w-full rounded-xl border border-border"
          />
          <label className="flex items-center gap-2 text-sm text-taupe">
            <input
              type="checkbox"
              checked={edition.actif ?? true}
              onChange={(e) => setEdition({ ...edition, actif: e.target.checked })}
              className="size-4"
            />
            Visible sur le site
          </label>
          <label className="flex items-center gap-2 text-sm text-taupe">
            <input
              type="checkbox"
              checked={edition.sur_devis ?? false}
              onChange={(e) => setEdition({ ...edition, sur_devis: e.target.checked })}
              className="size-4"
            />
            Sur devis (affiche « Sur devis », non compté dans le total ni l'acompte)
          </label>
          <label className="flex items-center gap-2 text-sm text-taupe">
            <input
              type="checkbox"
              checked={edition.en_option ?? false}
              onChange={(e) => setEdition({ ...edition, en_option: e.target.checked })}
              className="size-4"
            />
            En option (s'ajoute à une autre prestation, ne se réserve pas seule)
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={envoi} className={btnPrimaire}>
              {envoi ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setEdition(null)} className={btnSecondaire}>
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {prestations.map((p) => (
          <article key={p.id} className={cn(carte, "flex items-start gap-3")}>
            <span
              aria-hidden
              className="mt-1 size-3 rounded-full"
              style={{ backgroundColor: p.couleur }}
            />
            <div className="flex-1">
              <p className="font-display text-lg text-ink">{p.nom}</p>
              <p className="text-sm text-taupe">{p.description}</p>
              <p className="mt-1 text-[11px] uppercase tracking-widest text-taupe">
                {p.categorie} · {formatDuree(p.duree_minutes)} · {prixAffiche(p)}
                {p.en_option ? " · en option" : ""} · {p.actif ? "visible" : "masquée"}
              </p>
            </div>
            <button onClick={() => setEdition(p)} className={btnSecondaire}>
              Modifier
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function Horaires({
  horaires,
  onRefresh,
}: {
  horaires: Horaire[];
  onRefresh: () => Promise<void>;
}) {
  const enregistrer = useServerFn(adminEnregistrerHoraire);

  const sauver = async (h: Horaire) => {
    try {
      await enregistrer({
        data: {
          jourSemaine: h.jour_semaine,
          heureDebut: h.heure_debut.slice(0, 5),
          heureFin: h.heure_fin.slice(0, 5),
          pauseDebut: h.pause_debut ? h.pause_debut.slice(0, 5) : "",
          pauseFin: h.pause_fin ? h.pause_fin.slice(0, 5) : "",
          ferme: h.ferme,
        },
      });
      toast.success("Horaires mis à jour.");
      await onRefresh();
    } catch (e) {
      toast.error((e as Error).message || "Enregistrement impossible");
    }
  };

  return (
    <div className="space-y-3">
      <ReglageBattement />
      {[1, 2, 3, 4, 5, 6, 0].map((jour) => {
        const h =
          horaires.find((x) => x.jour_semaine === jour) ??
          ({
            id: `tmp-${jour}`,
            jour_semaine: jour,
            heure_debut: "09:00",
            heure_fin: "18:00",
            pause_debut: null,
            pause_fin: null,
            ferme: true,
          } as Horaire);
        return <LigneHoraire key={jour} horaire={h} onSave={sauver} />;
      })}
    </div>
  );
}

/** Temps de battement entre deux clientes (nettoyage, préparation). */
function ReglageBattement() {
  const lire = useServerFn(adminReglages);
  const enregistrer = useServerFn(adminEnregistrerReglages);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    lire({})
      .then((r) => setMinutes(r.battementMinutes))
      .catch(() => setMinutes(10));
  }, [lire]);

  const sauver = async () => {
    if (minutes === null) return;
    setEnvoi(true);
    try {
      await enregistrer({ data: { battementMinutes: minutes } });
      toast.success("Temps entre deux clientes enregistré.");
    } catch (e) {
      toast.error((e as Error).message || "Enregistrement impossible");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className={cn(carte, "space-y-3")}>
      <h2 className="font-display text-lg text-ink">Temps entre deux clientes</h2>
      <p className="text-sm text-taupe">
        Nettoyage et préparation : aucun rendez-vous ne peut commencer avant la fin de ce temps.
        S'applique aux créneaux proposés dès l'enregistrement.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="number"
            min={0}
            max={60}
            step={5}
            value={minutes ?? ""}
            disabled={minutes === null}
            onChange={(e) => setMinutes(Math.max(0, Math.min(60, Number(e.target.value))))}
            className={cn(champ, "w-24")}
            aria-label="Minutes entre deux clientes"
          />
          minutes
        </label>
        <button
          type="button"
          onClick={sauver}
          disabled={envoi || minutes === null}
          className={btnPrimaire}
        >
          {envoi ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </section>
  );
}

function LigneHoraire({
  horaire,
  onSave,
}: {
  horaire: Horaire;
  onSave: (h: Horaire) => Promise<void>;
}) {
  const [h, setH] = useState(horaire);
  useEffect(() => setH(horaire), [horaire]);

  return (
    <div className={cn(carte, "flex flex-wrap items-center gap-3")}>
      <p className="w-24 font-display text-ink">{JOURS_LONG[h.jour_semaine]}</p>
      <label className="flex items-center gap-2 text-sm text-taupe">
        <input
          type="checkbox"
          checked={!h.ferme}
          onChange={(e) => setH({ ...h, ferme: !e.target.checked })}
          className="size-4"
        />
        Ouvert
      </label>
      {!h.ferme && (
        <>
          <input
            type="time"
            value={h.heure_debut.slice(0, 5)}
            onChange={(e) => setH({ ...h, heure_debut: e.target.value })}
            aria-label="Ouverture"
            className="rounded-xl border border-border bg-background px-2 py-1.5 text-sm"
          />
          <span className="text-taupe">→</span>
          <input
            type="time"
            value={h.heure_fin.slice(0, 5)}
            onChange={(e) => setH({ ...h, heure_fin: e.target.value })}
            aria-label="Fermeture"
            className="rounded-xl border border-border bg-background px-2 py-1.5 text-sm"
          />
          <span className="text-xs text-taupe">Pause</span>
          <input
            type="time"
            value={h.pause_debut?.slice(0, 5) ?? ""}
            onChange={(e) => setH({ ...h, pause_debut: e.target.value })}
            aria-label="Début de pause"
            className="rounded-xl border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="time"
            value={h.pause_fin?.slice(0, 5) ?? ""}
            onChange={(e) => setH({ ...h, pause_fin: e.target.value })}
            aria-label="Fin de pause"
            className="rounded-xl border border-border bg-background px-2 py-1.5 text-sm"
          />
        </>
      )}
      <button onClick={() => onSave(h)} className={cn(btnSecondaire, "ml-auto")}>
        Enregistrer
      </button>
    </div>
  );
}

function Absences({
  indispos,
  onRefresh,
}: {
  indispos: Indispo[];
  onRefresh: () => Promise<void>;
}) {
  const ajouter = useServerFn(adminAjouterIndisponibilite);
  const supprimer = useServerFn(adminSupprimerIndisponibilite);
  const [f, setF] = useState({
    dateDebut: todayParisISO(),
    heureDebut: "00:00",
    dateFin: todayParisISO(),
    heureFin: "23:59",
    motif: "",
  });
  const [envoi, setEnvoi] = useState(false);

  return (
    <div className="space-y-4">
      <form
        className={cn(carte, "grid gap-3 sm:grid-cols-5")}
        onSubmit={async (e) => {
          e.preventDefault();
          setEnvoi(true);
          try {
            await ajouter({ data: f });
            toast.success("Absence enregistrée.");
            await onRefresh();
          } catch (err) {
            toast.error((err as Error).message || "Enregistrement impossible");
          } finally {
            setEnvoi(false);
          }
        }}
      >
        <input
          type="date"
          required
          value={f.dateDebut}
          onChange={(e) => setF({ ...f, dateDebut: e.target.value })}
          aria-label="Date de début"
          className={champ}
        />
        <input
          type="time"
          required
          value={f.heureDebut}
          onChange={(e) => setF({ ...f, heureDebut: e.target.value })}
          aria-label="Heure de début"
          className={champ}
        />
        <input
          type="date"
          required
          value={f.dateFin}
          onChange={(e) => setF({ ...f, dateFin: e.target.value })}
          aria-label="Date de fin"
          className={champ}
        />
        <input
          type="time"
          required
          value={f.heureFin}
          onChange={(e) => setF({ ...f, heureFin: e.target.value })}
          aria-label="Heure de fin"
          className={champ}
        />
        <input
          placeholder="Motif"
          value={f.motif}
          onChange={(e) => setF({ ...f, motif: e.target.value })}
          className={champ}
        />
        <button
          type="submit"
          disabled={envoi}
          className={cn(btnPrimaire, "sm:col-span-5 sm:justify-self-start")}
        >
          {envoi ? "Enregistrement…" : "Bloquer ce créneau"}
        </button>
      </form>

      <div className="space-y-2">
        {indispos.length === 0 ? (
          <p className={cn(carte, "text-center text-taupe")}>Aucune absence programmée.</p>
        ) : (
          indispos.map((i) => (
            <div key={i.id} className={cn(carte, "flex items-center gap-3")}>
              <div className="flex-1 text-sm">
                <p className="text-ink">
                  {parisLongDate(i.date_debut)} {parisTime(i.date_debut)} →{" "}
                  {parisLongDate(i.date_fin)} {parisTime(i.date_fin)}
                </p>
                {i.motif && <p className="text-taupe">{i.motif}</p>}
              </div>
              <button
                aria-label="Supprimer l'absence"
                onClick={async () => {
                  try {
                    await supprimer({ data: { id: i.id } });
                    await onRefresh();
                  } catch (e) {
                    toast.error((e as Error).message || "Suppression impossible");
                  }
                }}
                className={btnSecondaire}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Demandes({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return <p className={cn(carte, "text-center text-taupe")}>Aucune demande pour le moment.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-linen/50 text-left text-[10px] uppercase tracking-widest text-taupe">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Message</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id} className="border-t border-border align-top">
              <td className="px-4 py-4 text-taupe">
                {new Date(l.created_at).toLocaleDateString("fr-FR")}
              </td>
              <td className="px-4 py-4 text-ink">{l.type}</td>
              <td className="px-4 py-4">
                <p className="text-ink">{l.name}</p>
                <p className="text-taupe">{l.email}</p>
                <p className="text-taupe">
                  {l.phone} {l.city}
                </p>
              </td>
              <td className="max-w-md px-4 py-4 text-taupe">{l.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const LIBELLE_CLE: Record<string, string> = {
  ok: "trouvée",
  absente: "absente : ajoutez STRIPE_SECRET_KEY dans Lovable Cloud → Secrets, puis republiez",
  cle_publique:
    "c'est la clé publique (pk_…) : il faut la clé SECRÈTE (sk_live_…), dans Stripe → Développeurs → Clés API",
  secret_webhook:
    "c'est le secret du webhook (whsec_…) : mettez-le dans STRIPE_WEBHOOK_SECRET, et la clé secrète sk_live_… dans STRIPE_SECRET_KEY",
  inconnue: "format inattendu : la clé secrète commence par sk_live_",
};

/** État du paiement en ligne : secrets Stripe et connexion réelle, sans aucune clé affichée. */
function ReglagesPaiement() {
  const verifier = useServerFn(adminDiagnosticPaiement);
  const [envoi, setEnvoi] = useState(false);
  const [d, setD] = useState<Awaited<ReturnType<typeof adminDiagnosticPaiement>> | null>(null);

  const lancer = async () => {
    setEnvoi(true);
    try {
      setD(await verifier({}));
    } catch (e) {
      toast.error((e as Error).message || "Vérification impossible");
    } finally {
      setEnvoi(false);
    }
  };

  const actif = d?.etatCle === "ok" && d.connexion?.ok && !d.testRefuse && d.memeMode;
  return (
    <section className={cn(carte, "space-y-4")}>
      <h2 className="font-display text-lg text-ink">Paiement de l'acompte (Stripe)</h2>
      <p className="text-sm text-taupe">
        Vérifie que le site voit vos secrets Stripe et qu'il arrive à se connecter à votre compte.
        Aucune clé n'est affichée.
      </p>
      <button type="button" onClick={lancer} disabled={envoi} className={btnPrimaire}>
        {envoi ? "Vérification…" : "Vérifier le paiement en ligne"}
      </button>
      {d && (
        <ul className="space-y-1.5 text-sm">
          <li className={actif ? "font-semibold text-emerald" : "font-semibold text-bordeaux"}>
            {actif
              ? `Paiement en ligne ACTIF${d.modeTest ? " (mode test, aperçu uniquement : aucun vrai paiement)" : " (paiements réels)"}`
              : "Paiement en ligne INACTIF : les clientes ne peuvent pas réserver en ligne"}
          </li>
          {d.testRefuse && (
            <li className="font-semibold text-bordeaux">
              La clé enregistrée est une clé de TEST : elle est refusée sur le site en ligne.
              Remplacez STRIPE_SECRET_KEY par la clé sk_live_… et STRIPE_PUBLISHABLE_KEY par la clé
              pk_live_… (Stripe → Développeurs → Clés API, mode réel).
            </li>
          )}
          <li className="text-ink">Clé secrète Stripe : {LIBELLE_CLE[d.etatCle]}</li>
          {d.connexion && (
            <li className={d.connexion.ok ? "text-emerald" : "text-bordeaux"}>
              Connexion à Stripe : {d.connexion.ok ? "réussie" : `refusée — ${d.connexion.erreur}`}
            </li>
          )}
          <li className={d.clePublique === "ok" ? "text-ink" : "text-bordeaux"}>
            Clé publiable (pour le paiement dans la page) :{" "}
            {d.clePublique === "ok"
              ? "trouvée"
              : d.clePublique === "absente"
                ? "absente : ajoutez STRIPE_PUBLISHABLE_KEY (pk_live_…) dans Lovable Cloud → Secrets"
                : "format inattendu (elle commence par pk_)"}
          </li>
          {!d.memeMode && (
            <li className="text-bordeaux">
              Attention : la clé publiable et la clé secrète ne sont pas du même mode (test / réel).
            </li>
          )}
          {d.relais && <li className="text-taupe">Relais Supabase : {d.relais}</li>}
          <li className={d.webhook === "ok" ? "text-ink" : "text-bordeaux"}>
            Secret du webhook :{" "}
            {d.webhook === "ok"
              ? "trouvé"
              : d.webhook === "absent"
                ? "absent (STRIPE_WEBHOOK_SECRET) — le paiement est quand même vérifié au retour de la cliente"
                : "format inattendu (il commence par whsec_)"}
          </li>
        </ul>
      )}
    </section>
  );
}

/** Vérification de l'envoi des e-mails (Resend), sans afficher aucun secret. */
function ReglagesEmails() {
  const tester = useServerFn(adminEmailTest);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<{
    ok: boolean;
    erreur?: string;
    destinataire: string;
    expediteur: string;
    secrets: {
      nom: string;
      present: boolean;
      source: "site" | "relais" | null;
      nomApproximatif: boolean;
    }[];
    adresseConsultee: string;
  } | null>(null);

  const lancer = async () => {
    setEnvoi(true);
    try {
      setResultat(await tester({}));
    } catch (e) {
      toast.error((e as Error).message || "Test impossible");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className={cn(carte, "space-y-4")}>
      <h2 className="font-display text-lg text-ink">Envoi des e-mails</h2>
      <p className="text-sm text-taupe">
        Envoie un e-mail de test à l'adresse de notification de la gérante pour vérifier que les
        confirmations, rappels et liens d'annulation partent bien.
      </p>
      <button type="button" onClick={lancer} disabled={envoi} className={btnPrimaire}>
        {envoi ? "Envoi…" : "Envoyer un e-mail de test"}
      </button>
      {resultat && (
        <div className="space-y-1 text-sm">
          {resultat.ok ? (
            <p className="text-emerald">
              E-mail envoyé à {resultat.destinataire}. Vérifiez la boîte de réception (et les
              courriers indésirables).
            </p>
          ) : (
            <p className="text-bordeaux">Échec : {resultat.erreur}</p>
          )}
          <p className="text-taupe">Expéditeur utilisé : {resultat.expediteur}</p>
          {resultat.adresseConsultee && (
            <p className="text-taupe">
              Test fait depuis : {resultat.adresseConsultee}
              {resultat.adresseConsultee.includes("lovable.app") &&
                " (aperçu Lovable : refaites le test sur le site publié)"}
            </p>
          )}
          <div className="pt-2">
            <p className="font-medium text-ink">
              Secrets vus par le site (valeurs jamais affichées)
            </p>
            <ul className="mt-1 grid gap-1 sm:grid-cols-2">
              {resultat.secrets.map((x) => (
                <li
                  key={x.nom}
                  className="flex items-center justify-between gap-3 rounded-lg bg-linen/60 px-3 py-1.5"
                >
                  <span className="font-medium text-ink">{x.nom}</span>
                  <span className={x.present ? "text-emerald" : "text-taupe"}>
                    {x.present
                      ? x.source === "relais"
                        ? "trouvé (via Supabase)"
                        : "trouvé"
                      : "absent"}
                    {x.nomApproximatif && " (nom à corriger)"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
