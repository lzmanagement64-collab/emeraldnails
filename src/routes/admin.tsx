import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { loadLocalBookings, type BookingPayload } from "@/lib/booking-api";
import { business } from "@/config/business";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Administration — Atelier Porcelaine" },
      { name: "robots", content: "noindex" },
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

type Booking = Omit<BookingPayload, "status"> & { status: Status };

function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<"upcoming" | "all">("upcoming");

  useEffect(() => {
    const local = loadLocalBookings() as unknown as Booking[];
    setBookings(local.map((b) => ({ ...b, status: b.status ?? "pending" })));
  }, []);

  const now = new Date();
  const upcoming = bookings.filter((b) => new Date(`${b.appointment.date}T${b.appointment.startTime}`) >= now);
  const list = tab === "upcoming" ? upcoming : bookings;

  const changeStatus = (id: string, s: Status) => {
    const next = bookings.map((b) => (b.bookingId === id ? { ...b, status: s } : b));
    setBookings(next);
    localStorage.setItem("atelier-porcelaine.bookings", JSON.stringify(next));
  };

  return (
    <div className="min-h-screen bg-linen/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="eyebrow">Administration</p>
            <p className="font-display text-xl">{business.name}</p>
          </div>
          <Link
            to="/"
            className="rounded-sm border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest"
          >
            Voir le site
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          {[
            { l: "À venir", v: upcoming.length },
            { l: "En attente", v: bookings.filter((b) => b.status === "pending").length },
            { l: "Confirmés", v: bookings.filter((b) => b.status === "confirmed").length },
            { l: "Total", v: bookings.length },
          ].map((s) => (
            <div key={s.l} className="rounded-sm border border-border bg-card p-5">
              <p className="eyebrow">{s.l}</p>
              <p className="mt-2 font-display text-3xl text-ink">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex gap-2">
          {[
            { id: "upcoming", label: "Rendez-vous à venir" },
            { id: "all", label: "Tous" },
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
          {list.length === 0 ? (
            <div className="p-10 text-center text-taupe">
              <p>Aucune réservation locale pour le moment.</p>
              <p className="mt-2 text-xs">
                Les réservations effectuées sur le site apparaîtront ici (mode démo local).
                Une fois n8n branché, une base externe pourra alimenter ce tableau.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-linen/50 text-left font-mono text-[10px] uppercase tracking-widest text-taupe">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Prestation</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b.bookingId} className="border-t border-border">
                    <td className="px-4 py-4 text-ink">
                      <p>
                        {new Date(b.appointment.date).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                      <p className="text-taupe">{b.appointment.startTime}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-ink">{b.customer.firstName} {b.customer.lastName}</p>
                      <p className="text-taupe">{b.customer.phone}</p>
                    </td>
                    <td className="px-4 py-4 text-ink">
                      <p>{b.service.name}</p>
                      {b.options.length > 0 && (
                        <p className="text-xs text-taupe">
                          + {b.options.map((o) => o.name).join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-block rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest",
                          STATUS_COLOR[b.status ?? "pending"],
                        )}
                      >
                        {STATUS_LABEL[b.status ?? "pending"]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <select
                        value={b.status ?? "pending"}
                        onChange={(e) => changeStatus(b.bookingId, e.target.value as Status)}
                        className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
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

        <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-taupe">
          Espace de démonstration — à protéger et connecter à une base externe (Supabase, Notion, Airtable, Google Calendar) via n8n.
        </p>
      </div>
    </div>
  );
}
