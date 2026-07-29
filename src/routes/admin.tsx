import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listBookings, listLeads, updateBookingStatus } from "@/lib/booking.functions";
import { business } from "@/config/business";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Administration — Emerald Beauty" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type Status = "pending" | "confirmed" | "done" | "cancelled" | "absent";

const STATUS_LABEL: Record<Status, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  done: "Terminé",
  cancelled: "Annulé",
  absent: "Absente",
};

const STATUS_COLOR: Record<Status, string> = {
  pending: "bg-amber-100 text-amber-900",
  confirmed: "bg-emerald-100 text-emerald-900",
  done: "bg-stone-100 text-stone-700",
  cancelled: "bg-rose-100 text-rose-900",
  absent: "bg-neutral-200 text-neutral-700",
};

type BookingRow = {
  id: string;
  status: Status;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  service_name: string;
  options: Array<{ name: string }>;
  appointment_date: string;
  start_time: string;
  total_amount: number;
  deposit_amount: number;
};

type LeadRow = {
  id: string;
  created_at: string;
  type: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  message: string | null;
};

function AdminPage() {
  const navigate = useNavigate();
  const fetchBookings = useServerFn(listBookings);
  const fetchLeads = useServerFn(listLeads);
  const setStatus = useServerFn(updateBookingStatus);

  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [tab, setTab] = useState<"upcoming" | "all" | "leads">("upcoming");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      try {
        const [b, l] = await Promise.all([fetchBookings({ data: undefined }), fetchLeads({ data: undefined })]);
        if (!active) return;
        setBookings(b as unknown as BookingRow[]);
        setLeads(l as unknown as LeadRow[]);
      } catch {
        if (active) setDenied(true);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchBookings, fetchLeads, navigate]);

  const changeStatus = async (id: string, s: Status) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: s } : b)));
    try {
      await setStatus({ data: { id, status: s } });
    } catch {
      toast.error("Mise à jour impossible");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.appointment_date >= today);
  const list = tab === "upcoming" ? upcoming : bookings;

  if (!ready) {
    return <div className="grid min-h-screen place-items-center text-taupe">Chargement…</div>;
  }

  if (denied) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-2xl text-ink">Accès refusé</h1>
          <p className="mt-2 text-taupe">Votre compte n'a pas les droits d'administration.</p>
          <button onClick={signOut} className="mt-6 rounded-sm border border-border px-5 py-2.5 text-sm">
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linen/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="eyebrow">Administration</p>
            <p className="font-display text-xl">{business.name}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/" className="rounded-sm border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest">
              Voir le site
            </Link>
            <button onClick={signOut} className="rounded-sm border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          {[
            { l: "À venir", v: upcoming.length },
            { l: "En attente", v: bookings.filter((b) => b.status === "pending").length },
            { l: "Acomptes attendus", v: `${upcoming.reduce((s, b) => s + Number(b.deposit_amount || 0), 0)} €` },
            { l: "Demandes", v: leads.length },
          ].map((s) => (
            <div key={s.l} className="rounded-sm border border-border bg-card p-5">
              <p className="eyebrow">{s.l}</p>
              <p className="mt-2 font-display text-3xl text-ink">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { id: "upcoming", label: "Rendez-vous à venir" },
            { id: "all", label: "Tous" },
            { id: "leads", label: "Demandes & franchise" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={cn(
                "rounded-sm px-4 py-2 font-mono text-[10px] uppercase tracking-widest",
                tab === t.id ? "bg-ink text-porcelain" : "border border-border text-taupe",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-sm border border-border bg-card">
          {tab === "leads" ? (
            leads.length === 0 ? (
              <p className="p-10 text-center text-taupe">Aucune demande pour le moment.</p>
            ) : (
              <table className="w-full text-sm">
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
                        <p className="text-taupe">{l.phone} {l.city}</p>
                      </td>
                      <td className="max-w-md px-4 py-4 text-taupe">{l.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : list.length === 0 ? (
            <p className="p-10 text-center text-taupe">Aucune réservation pour le moment.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-linen/50 text-left font-mono text-[10px] uppercase tracking-widest text-taupe">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Prestation</th>
                  <th className="px-4 py-3">Acompte</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="px-4 py-4 text-ink">
                      <p>{new Date(b.appointment_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</p>
                      <p className="text-taupe">{b.start_time}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-ink">{b.first_name} {b.last_name}</p>
                      <p className="text-taupe">{b.phone}</p>
                    </td>
                    <td className="px-4 py-4 text-ink">
                      <p>{b.service_name}</p>
                      {b.options?.length > 0 && (
                        <p className="text-xs text-taupe">+ {b.options.map((o) => o.name).join(", ")}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-ink">
                      {Number(b.deposit_amount)} € <span className="text-taupe">/ {Number(b.total_amount)} €</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("inline-block rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest", STATUS_COLOR[b.status ?? "pending"])}>
                        {STATUS_LABEL[b.status ?? "pending"]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <select
                        value={b.status ?? "pending"}
                        onChange={(e) => changeStatus(b.id, e.target.value as Status)}
                        className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
                        aria-label="Changer le statut"
                      >
                        {Object.entries(STATUS_LABEL).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
