import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
} from "@/lib/reservation.functions";
import { STATUTS, STATUT_LABEL, type Statut } from "@/lib/reservation-schemas";
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
  prestations: { nom: string; duree_minutes: number; prix: number; couleur: string } | null;
};

type Prestation = {
  id: string;
  nom: string;
  description: string;
  duree_minutes: number;
  prix: number;
  couleur: string;
  actif: boolean;
  ordre: number;
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
  { id: "horaires", label: "Horaires" },
  { id: "indispos", label: "Absences" },
  { id: "leads", label: "Demandes" },
] as const;

type Onglet = (typeof ONGLETS)[number]["id"];

const champ = "w-full rounded-sm border border-border bg-background px-3 py-2 text-sm";
const btnPrimaire =
  "rounded-sm bg-ink px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-porcelain disabled:opacity-50";
const btnSecondaire =
  "rounded-sm border border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest";
const carte = "rounded-sm border border-border bg-card p-5";

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
        statut === "confirmee" ? "Rendez-vous confirmé, email envoyé." : "Statut mis à jour.",
      );
    } catch (e) {
      toast.error((e as Error).message || "Mise à jour impossible");
    }
  };

  const aujourdhui = todayParisISO();
  const aVenir = useMemo(
    () =>
      reservations
        .filter((r) => parisDateISO(r.date_debut) >= aujourdhui && r.statut !== "annulee")
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
            <button onClick={deconnexion} className={btnSecondaire}>
              Déconnexion
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
              v: formatEuros(aVenir.reduce((s, r) => s + Number(r.prestations?.prix ?? 0), 0)),
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
                "rounded-sm px-4 py-2 font-mono text-[10px] uppercase tracking-widest",
                onglet === t.id ? "bg-ink text-porcelain" : "border border-border text-taupe",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {onglet === "planning" && <Planning reservations={aVenir} onStatut={majStatut} />}
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
        {onglet === "horaires" && <Horaires horaires={horaires} onRefresh={rafraichir} />}
        {onglet === "indispos" && <Absences indispos={indispos} onRefresh={rafraichir} />}
        {onglet === "leads" && <Demandes leads={leads} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
function BadgeStatut({ statut }: { statut: Statut }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest",
        STATUT_COULEUR[statut],
      )}
    >
      {STATUT_LABEL[statut]}
    </span>
  );
}

function SelectStatut({ statut, onChange }: { statut: Statut; onChange: (s: Statut) => void }) {
  return (
    <select
      value={statut}
      onChange={(e) => onChange(e.target.value as Statut)}
      aria-label="Changer le statut"
      className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
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
}: {
  reservations: Reservation[];
  onStatut: (id: string, s: Statut) => void;
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
                <span className="font-mono text-ink">{parisTime(r.date_debut)}</span>
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: r.prestations?.couleur ?? "#1f6b43" }}
                />
                <span className="text-ink">{r.prestations?.nom}</span>
                <span className="text-taupe">
                  {r.cliente_prenom} {r.cliente_nom} · {r.cliente_telephone}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <BadgeStatut statut={r.statut} />
                  <SelectStatut statut={r.statut} onChange={(s) => onStatut(r.id, s)} />
                </span>
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
          className="rounded-sm border border-border bg-background px-3 py-2 text-sm"
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
          className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm sm:max-w-xs"
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
                {p.nom} — {formatDuree(p.duree_minutes)}
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

      <div className="overflow-x-auto rounded-sm border border-border bg-card">
        {liste.length === 0 ? (
          <p className="p-10 text-center text-taupe">Aucune réservation.</p>
        ) : (
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="bg-linen/50 text-left font-mono text-[10px] uppercase tracking-widest text-taupe">
              <tr>
                <th className="px-4 py-3">Créneau</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Prestation</th>
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
                    <p>{r.prestations?.nom}</p>
                    <p className="text-taupe">
                      {formatDuree(r.prestations?.duree_minutes ?? 0)} ·{" "}
                      {formatEuros(Number(r.prestations?.prix ?? 0))}
                    </p>
                    {r.commentaire && (
                      <p className="mt-1 text-xs text-taupe">« {r.commentaire} »</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <BadgeStatut statut={r.statut} />
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
        ca: (prec?.ca ?? 0) + (honore ? Number(r.prestations?.prix ?? 0) : 0),
      });
    }
    return [...map.values()].sort((a, b) => b.derniere.localeCompare(a.derniere));
  }, [reservations]);

  if (clientes.length === 0) {
    return <p className={cn(carte, "text-center text-taupe")}>Aucune cliente enregistrée.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-border bg-card">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-linen/50 text-left font-mono text-[10px] uppercase tracking-widest text-taupe">
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
          dureeMinutes: Number(edition.duree_minutes ?? 60),
          prix: Number(edition.prix ?? 0),
          couleur: edition.couleur ?? "#1f6b43",
          actif: edition.actif ?? true,
          ordre: Number(edition.ordre ?? 0),
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
            className="h-10 w-full rounded-sm border border-border"
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
              <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-taupe">
                {formatDuree(p.duree_minutes)} · {formatEuros(Number(p.prix))} ·{" "}
                {p.actif ? "visible" : "masquée"}
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
            className="rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
          />
          <span className="text-taupe">→</span>
          <input
            type="time"
            value={h.heure_fin.slice(0, 5)}
            onChange={(e) => setH({ ...h, heure_fin: e.target.value })}
            aria-label="Fermeture"
            className="rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
          />
          <span className="text-xs text-taupe">Pause</span>
          <input
            type="time"
            value={h.pause_debut?.slice(0, 5) ?? ""}
            onChange={(e) => setH({ ...h, pause_debut: e.target.value })}
            aria-label="Début de pause"
            className="rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="time"
            value={h.pause_fin?.slice(0, 5) ?? ""}
            onChange={(e) => setH({ ...h, pause_fin: e.target.value })}
            aria-label="Fin de pause"
            className="rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
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
    <div className="overflow-x-auto rounded-sm border border-border bg-card">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-linen/50 text-left font-mono text-[10px] uppercase tracking-widest text-taupe">
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
