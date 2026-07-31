import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Loader2, Upload, X } from "lucide-react";

import { Section } from "@/components/site/Section";
import { services, type Service, type ServiceOption } from "@/data/services";
import { formatDuration } from "@/components/site/ServiceCard";
import {
  addMinutes,
  fetchAvailability,
  formatDateISO,
  submitBooking,
  totalDuration,
  totalPrice,
  depositAmount,
  depositRate,
  type Availability,
  type BookingPayload,
} from "@/lib/booking-api";
import { cn } from "@/lib/utils";
import { business } from "@/config/business";
import { Checkbox } from "@/components/ui/checkbox";

const searchSchema = z.object({
  service: z.string().optional(),
});

export const Route = createFileRoute("/reservation")({
  validateSearch: searchSchema,
  component: ReservationPage,
  head: () => ({
    meta: [
      { title: "Prendre rendez-vous — Emerald Beauty" },
      { name: "description", content: "Réservez votre créneau en quelques étapes." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Prendre rendez-vous" },
      { property: "og:url", content: "/reservation" },
    ],
    links: [{ rel: "canonical", href: "/reservation" }],
  }),
});

type Preferences = {
  shape: string;
  length: string;
  colors: string;
  designDescription: string;
  notes: string;
};

type Customer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  instagram: string;
  customerType: "new" | "returning";
};

const STEPS = [
  "Prestation",
  "Date & heure",
  "Vos coordonnées",
  "Inspiration",
  "Récapitulatif",
] as const;

function ReservationPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [stepIdx, setStepIdx] = useState(0);
  const [selectedServices, setSelectedServices] = useState<Service[]>(() => {
    const found = services.find((s) => s.id === search.service);
    return found ? [found] : [];
  });
  const service = selectedServices[0] ?? null;
  const [selectedOptions, setSelectedOptions] = useState<ServiceOption[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [customer, setCustomer] = useState<Customer>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    instagram: "",
    customerType: "new",
  });

  const [preferences, setPreferences] = useState<Preferences>({
    shape: "",
    length: "",
    colors: "",
    designDescription: "",
    notes: "",
  });

  const [inspirationImages, setInspirationImages] = useState<{ name: string; dataUrl: string }[]>(
    [],
  );

  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (search.service && !service) {
      const found = services.find((s) => s.id === search.service);
      if (found) setSelectedServices([found]);
    }
  }, [search.service, service]);

  const toggleService = (s: Service) => {
    setSelectedServices((curr) => {
      const nextList = curr.find((c) => c.id === s.id)
        ? curr.filter((c) => c.id !== s.id)
        : [...curr, s];
      const allowed = new Set(nextList.flatMap((x) => (x.options ?? []).map((o) => o.id)));
      setSelectedOptions((opts) => opts.filter((o) => allowed.has(o.id)));
      return nextList;
    });
    setSelectedTime(null);
  };

  const duration =
    selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0) +
    selectedOptions.reduce((sum, o) => sum + o.durationMinutes, 0);
  const price =
    selectedServices.reduce((sum, s) => sum + s.basePrice, 0) +
    selectedOptions.reduce((sum, o) => sum + o.price, 0);
  const deposit = depositAmount(price);

  const canContinue = useMemo(() => {
    switch (stepIdx) {
      case 0: return !!service;
      case 1: return !!selectedDate && !!selectedTime;
      case 2:
        return (
          customer.firstName.trim().length >= 2 &&
          customer.lastName.trim().length >= 2 &&
          /.+@.+\..+/.test(customer.email) &&
          customer.phone.replace(/\s/g, "").length >= 8
        );
      case 3: return true;
      case 4: return consent;
      default: return false;
    }
  }, [stepIdx, service, selectedDate, selectedTime, customer, consent]);

  const next = () => {
    if (!canContinue) return;
    setStepIdx((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const prev = () => setStepIdx((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    if (!service || !selectedDate || !selectedTime) return;
    setSubmitting(true);

    const payload: BookingPayload = {
      bookingId: `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      status: "pending",
      customer: {
        firstName: customer.firstName.trim(),
        lastName: customer.lastName.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
        instagram: customer.instagram.trim() || undefined,
        customerType: customer.customerType,
      },
      service: {
        id: service.id,
        name: selectedServices.map((s) => s.name).join(" + "),
        durationMinutes: duration,
        basePrice: service.basePrice,
      },
      options: [
        ...selectedServices.slice(1).map((s) => ({
          id: s.id,
          name: s.name,
          price: s.basePrice,
          durationMinutes: s.durationMinutes,
        })),
        ...selectedOptions.map((o) => ({
          id: o.id,
          name: o.name,
          price: o.price,
          durationMinutes: o.durationMinutes,
        })),
      ],
      appointment: {
        date: formatDateISO(selectedDate),
        startTime: selectedTime,
        endTime: addMinutes(selectedTime, duration),
        timezone: "Europe/Paris",
      },
      preferences,
      inspirationImages: inspirationImages.map((i) => i.dataUrl),
      estimatedTotal: price,
      depositRate,
      depositAmount: deposit,
      remainingBalance: price - deposit,
      consent: true,
      source: "website",
    };

    const result = await submitBooking(payload);
    setSubmitting(false);

    if (result.ok) {
      if (result.bookingId) {
        navigate({ to: "/paiement", search: { booking: result.bookingId } });
        return;
      }
      const params = new URLSearchParams({
        service: service.name,
        date: payload.appointment.date,
        time: payload.appointment.startTime,
        name: customer.firstName,
      });
      navigate({ to: "/confirmation", search: Object.fromEntries(params) as never });
    } else {
      toast.error("Une erreur est survenue, réessayez dans un instant.");
    }
  };

  return (
    <Section eyebrow={`Étape ${stepIdx + 1} sur ${STEPS.length}`} title={STEPS[stepIdx]}>
      {/* Stepper */}
      <div className="mb-10 flex gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= stepIdx ? "bg-ink" : "bg-border",
            )}
          />
        ))}
      </div>

      <div className="mx-auto grid max-w-3xl gap-8">
        {stepIdx === 0 && (
          <ServiceStep
            selected={selectedServices}
            options={selectedOptions}
            onToggleService={toggleService}
            onToggleOption={(o) => {
              setSelectedOptions((curr) =>
                curr.find((c) => c.id === o.id)
                  ? curr.filter((c) => c.id !== o.id)
                  : [...curr, o],
              );
            }}
          />
        )}

        {stepIdx === 1 && service && (
          <DateStep
            service={service}
            durationMinutes={duration}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelect={(d, t) => {
              setSelectedDate(d);
              setSelectedTime(t);
            }}
          />
        )}

        {stepIdx === 2 && (
          <CustomerStep customer={customer} onChange={setCustomer} />
        )}

        {stepIdx === 3 && (
          <InspirationStep
            preferences={preferences}
            onChange={setPreferences}
            images={inspirationImages}
            onImages={setInspirationImages}
          />
        )}

        {stepIdx === 4 && service && selectedDate && selectedTime && (
          <RecapStep
            service={service}
            servicesList={selectedServices}
            options={selectedOptions}
            date={selectedDate}
            time={selectedTime}
            duration={duration}
            price={price}
            deposit={deposit}
            customer={customer}
            preferences={preferences}
            consent={consent}
            onConsent={setConsent}
          />
        )}

        {/* Navigation */}
        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={prev}
            disabled={stepIdx === 0}
            className="inline-flex items-center gap-2 px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-taupe disabled:opacity-40"
          >
            <ChevronLeft className="size-4" /> Retour
          </button>

          {stepIdx < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canContinue}
              className="inline-flex items-center justify-center gap-2 rounded-sm bg-ink px-8 py-4 font-mono text-[11px] uppercase tracking-widest text-porcelain disabled:opacity-40"
            >
              Continuer <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canContinue || submitting}
              className="inline-flex items-center justify-center gap-2 rounded-sm bg-ink px-8 py-4 font-mono text-[11px] uppercase tracking-widest text-porcelain disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Envoi…
                </>
              ) : (
                <>
                  Confirmer la demande <Check className="size-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Section>
  );
}

// ============================================================
// Étape 1 — Prestation
// ============================================================
function ServiceStep({
  selected,
  options,
  onToggleService,
  onToggleOption,
}: {
  selected: Service[];
  options: ServiceOption[];
  onToggleService: (s: Service) => void;
  onToggleOption: (o: ServiceOption) => void;
}) {
  const availableOptions = selected.flatMap((s) => s.options ?? []);
  const totalDurationMin =
    selected.reduce((sum, s) => sum + s.durationMinutes, 0) +
    options.reduce((sum, o) => sum + o.durationMinutes, 0);
  const totalPriceEur =
    selected.reduce((sum, s) => sum + s.basePrice, 0) +
    options.reduce((sum, o) => sum + o.price, 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-taupe">
        Sélectionnez une ou plusieurs prestations : les durées et les tarifs se cumulent
        automatiquement pour un seul rendez-vous.
      </p>

      <div className="grid gap-3">
        {services.map((s) => {
          const active = selected.some((c) => c.id === s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleService(s)}
              className={cn(
                "flex items-start justify-between gap-4 rounded-sm border p-5 text-left transition-colors",
                active
                  ? "border-ink bg-ink text-porcelain"
                  : "border-border bg-card text-ink hover:border-ink/40",
              )}
            >
              <div className="flex min-w-0 gap-4">
                <span
                  className={cn(
                    "mt-1 grid size-5 shrink-0 place-items-center rounded-sm border transition-colors",
                    active ? "border-porcelain bg-porcelain text-ink" : "border-border",
                  )}
                >
                  {active && <Check className="size-3.5" />}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg">{s.name}</p>
                  <p className={cn("mt-1 text-sm", active ? "text-porcelain/70" : "text-taupe")}>
                    {s.description}
                  </p>
                  <p
                    className={cn(
                      "mt-2 font-mono text-[10px] uppercase tracking-widest",
                      active ? "text-porcelain/60" : "text-taupe",
                    )}
                  >
                    {formatDuration(s.durationMinutes)}
                  </p>
                </div>
              </div>
              <span className={cn("shrink-0 font-mono text-sm", active ? "text-porcelain" : "text-bordeaux")}>
                {s.basePrice} €
              </span>
            </button>
          );
        })}
      </div>

      {availableOptions.length > 0 && (
        <div className="rounded-sm border border-border bg-linen/40 p-5">
          <p className="eyebrow mb-4">Options</p>
          <div className="flex flex-wrap gap-2">
            {availableOptions.map((o) => {
              const active = !!options.find((c) => c.id === o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onToggleOption(o)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-colors",
                    active
                      ? "border-ink bg-ink text-porcelain"
                      : "border-border bg-background text-ink hover:border-ink/40",
                  )}
                >
                  {o.name} · +{o.price}€
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="rounded-sm border border-border bg-card p-5">
          <p className="eyebrow mb-3">Votre sélection</p>
          <ul className="space-y-2 text-sm">
            {selected.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4">
                <span className="text-ink">{s.name}</span>
                <span className="font-mono text-taupe">{s.basePrice} €</span>
              </li>
            ))}
            {options.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4">
                <span className="text-taupe">{o.name}</span>
                <span className="font-mono text-taupe">+{o.price} €</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-widest text-taupe">
              {formatDuration(totalDurationMin)}
            </span>
            <span className="font-mono text-bordeaux">Total {totalPriceEur} €</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Étape 2 — Date et heure
// ============================================================
function DateStep({
  service,
  durationMinutes,
  selectedDate,
  selectedTime,
  onSelect,
}: {
  service: Service;
  durationMinutes: number;
  selectedDate: Date | null;
  selectedTime: string | null;
  onSelect: (d: Date | null, t: string | null) => void;
}) {
  const [month, setMonth] = useState(() => new Date());
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAvailability({
      serviceId: service.id,
      month: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
      durationMinutes,
    }).then((data) => {
      if (!cancelled) {
        setAvailability(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [service.id, durationMinutes, month]);

  const availableMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const a of availability) m.set(a.date, a.slots);
    return m;
  }, [availability]);

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDow = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7; // lundi=0
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + business.bookingRules.maxAdvanceDays);

  const slotsForSelected =
    selectedDate ? availableMap.get(formatDateISO(selectedDate)) ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="Mois précédent"
            className="grid size-9 place-items-center rounded-full text-taupe hover:bg-linen"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="font-display text-lg capitalize">
            {month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </p>
          <button
            type="button"
            aria-label="Mois suivant"
            className="grid size-9 place-items-center rounded-full text-taupe hover:bg-linen"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 font-mono text-[10px] uppercase tracking-widest text-taupe">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <div key={i} className="grid h-8 place-items-center">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(month.getFullYear(), month.getMonth(), day);
            const iso = formatDateISO(date);
            const isAvailable = availableMap.has(iso);
            const isPast = date < today;
            const isTooFar = date > maxDate;
            const isSelected = selectedDate && formatDateISO(selectedDate) === iso;

            return (
              <button
                key={iso}
                type="button"
                disabled={!isAvailable || isPast || isTooFar}
                onClick={() => onSelect(date, null)}
                className={cn(
                  "aspect-square rounded-sm text-sm font-medium transition-colors",
                  isSelected && "bg-ink text-porcelain",
                  !isSelected && isAvailable && "hover:bg-linen",
                  (!isAvailable || isPast || isTooFar) && "text-taupe/30",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>

        {loading && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-taupe">
            Chargement des disponibilités…
          </p>
        )}
      </div>

      {selectedDate && (
        <div className="rounded-sm border border-border bg-linen/40 p-5">
          <p className="eyebrow mb-4">
            Créneaux du{" "}
            {selectedDate.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          {slotsForSelected.length === 0 ? (
            <p className="text-sm text-taupe">Aucun créneau disponible ce jour-là.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slotsForSelected.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onSelect(selectedDate, t)}
                  className={cn(
                    "rounded-sm border px-4 py-2 font-mono text-xs transition-colors",
                    selectedTime === t
                      ? "border-ink bg-ink text-porcelain"
                      : "border-border bg-background text-ink hover:border-ink/40",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-taupe">
            Durée estimée : {formatDuration(durationMinutes)}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Étape 3 — Coordonnées
// ============================================================
function CustomerStep({
  customer,
  onChange,
}: {
  customer: Customer;
  onChange: (c: Customer) => void;
}) {
  const update = (k: keyof Customer, v: string) => onChange({ ...customer, [k]: v });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Prénom *">
        <input
          type="text"
          maxLength={60}
          value={customer.firstName}
          onChange={(e) => update("firstName", e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Nom *">
        <input
          type="text"
          maxLength={60}
          value={customer.lastName}
          onChange={(e) => update("lastName", e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Email *">
        <input
          type="email"
          inputMode="email"
          maxLength={120}
          value={customer.email}
          onChange={(e) => update("email", e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Téléphone *">
        <input
          type="tel"
          inputMode="tel"
          maxLength={20}
          value={customer.phone}
          onChange={(e) => update("phone", e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Instagram (facultatif)" className="sm:col-span-2">
        <input
          type="text"
          maxLength={60}
          placeholder="@pseudonyme"
          value={customer.instagram}
          onChange={(e) => update("instagram", e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Vous êtes…" className="sm:col-span-2">
        <div className="flex gap-2">
          {[
            { v: "new", l: "Nouvelle cliente" },
            { v: "returning", l: "Déjà venue" },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => onChange({ ...customer, customerType: o.v as Customer["customerType"] })}
              className={cn(
                "flex-1 rounded-sm border px-4 py-3 text-sm transition-colors",
                customer.customerType === o.v
                  ? "border-ink bg-ink text-porcelain"
                  : "border-border bg-card text-ink",
              )}
            >
              {o.l}
            </button>
          ))}
        </div>
      </Field>
      <style>{`
        .input {
          width: 100%;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          padding: 0.75rem 1rem;
          border-radius: 2px;
          font-family: var(--font-body);
          font-size: 0.95rem;
          color: var(--color-foreground);
        }
        .input:focus {
          outline: 2px solid var(--color-ring);
          outline-offset: 1px;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="font-mono text-[10px] uppercase tracking-widest text-taupe">{label}</span>
      {children}
    </label>
  );
}

// ============================================================
// Étape 4 — Inspiration
// ============================================================
function InspirationStep({
  preferences,
  onChange,
  images,
  onImages,
}: {
  preferences: Preferences;
  onChange: (p: Preferences) => void;
  images: { name: string; dataUrl: string }[];
  onImages: (v: { name: string; dataUrl: string }[]) => void;
}) {
  const update = (k: keyof Preferences, v: string) => onChange({ ...preferences, [k]: v });

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const list: { name: string; dataUrl: string }[] = [];
    for (const f of Array.from(files).slice(0, 4 - images.length)) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} dépasse 5 Mo.`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(f);
      });
      list.push({ name: f.name, dataUrl });
    }
    onImages([...images, ...list]);
  };

  const SHAPES = ["Amande", "Ballerine", "Carré", "Carré arrondi", "Ovale", "Stiletto"];
  const LENGTHS = ["Naturelle", "Courte", "Moyenne", "Longue", "Extra longue"];
  const PALETTE = ["Nude", "French", "Milky", "Vert émeraude", "Bordeaux", "Bleu", "Rose poudré", "Noir"];

  const toggleColor = (c: string) => {
    const curr = preferences.colors.split(",").map((s) => s.trim()).filter(Boolean);
    const next = curr.includes(c) ? curr.filter((x) => x !== c) : [...curr, c];
    update("colors", next.join(", "));
  };

  return (
    <div className="space-y-6">
      {/* Forme & longueur */}
      <div className="rounded-sm border border-border bg-card p-5 sm:p-6">
        <p className="eyebrow mb-4">Forme &amp; longueur</p>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm text-taupe">Forme souhaitée</p>
            <div className="flex flex-wrap gap-2">
              <Chip active={!preferences.shape} onClick={() => update("shape", "")}>Au choix</Chip>
              {SHAPES.map((s) => (
                <Chip key={s} active={preferences.shape === s} onClick={() => update("shape", s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-taupe">Longueur</p>
            <div className="flex flex-wrap gap-2">
              <Chip active={!preferences.length} onClick={() => update("length", "")}>Au choix</Chip>
              {LENGTHS.map((l) => (
                <Chip key={l} active={preferences.length === l} onClick={() => update("length", l)}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Couleurs & design */}
      <div className="rounded-sm border border-border bg-card p-5 sm:p-6">
        <p className="eyebrow mb-4">Couleurs &amp; design</p>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm text-taupe">Sélection rapide</p>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <Chip
                  key={c}
                  active={preferences.colors.split(",").map((s) => s.trim()).includes(c)}
                  onClick={() => toggleColor(c)}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </div>

          <Field label="Précisions couleurs">
            <input
              className="input"
              maxLength={120}
              value={preferences.colors}
              onChange={(e) => update("colors", e.target.value)}
              placeholder="Nude, bordeaux, terracotta…"
            />
          </Field>

          <Field label="Type de nail art / description">
            <textarea
              rows={3}
              maxLength={500}
              className="input min-h-24 resize-none"
              value={preferences.designDescription}
              onChange={(e) => update("designDescription", e.target.value)}
              placeholder="Minimaliste, quelques doigts en couleur, french inversée…"
            />
            <p className="mt-1 text-right text-[11px] text-taupe">
              {preferences.designDescription.length}/500
            </p>
          </Field>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-sm border border-border bg-card p-5 sm:p-6">
        <p className="eyebrow mb-4">À savoir avant la pose</p>
        <Field label="Notes / préférence">
          <textarea
            rows={2}
            maxLength={500}
            className="input min-h-20 resize-none"
            value={preferences.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Ongle fragile, allergie, sensibilité particulière…"
          />
        </Field>
      </div>

      {/* Inspirations */}
      <div className="rounded-sm border border-border bg-card p-5 sm:p-6">
        <p className="eyebrow mb-1">Images d'inspiration</p>
        <p className="mb-4 text-sm text-taupe">4 photos maximum, 5 Mo par image.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-sm border border-border">
              <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onImages(images.filter((_, k) => k !== i))}
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-ink/80 text-porcelain"
                aria-label="Retirer"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {images.length < 4 && (
            <label className="grid aspect-square cursor-pointer place-items-center gap-2 rounded-sm border border-dashed border-border text-taupe hover:bg-linen/50">
              <Upload className="size-5" />
              <span className="font-mono text-[10px] uppercase tracking-widest">Ajouter</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-2 text-sm transition-colors",
        active
          ? "border-ink bg-ink text-porcelain"
          : "border-border bg-background text-taupe hover:border-ink/40 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

// ============================================================
// Étape 5 — Récapitulatif
// ============================================================
function RecapStep({
  service,
  options,
  date,
  time,
  duration,
  price,
  deposit,
  customer,
  preferences,
  consent,
  onConsent,
}: {
  service: Service;
  options: ServiceOption[];
  date: Date;
  time: string;
  duration: number;
  price: number;
  deposit: number;
  customer: Customer;
  preferences: Preferences;
  consent: boolean;
  onConsent: (v: boolean) => void;
}) {
  const endTime = addMinutes(time, duration);
  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-border bg-card p-6">
        <p className="eyebrow mb-4">Votre rendez-vous</p>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <Row label="Prestation" value={service.name} />
          <Row label="Options" value={options.length ? options.map((o) => o.name).join(", ") : "—"} />
          <Row
            label="Date"
            value={date.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
          <Row label="Horaire" value={`${time} – ${endTime}`} />
          <Row label="Durée estimée" value={formatDuration(duration)} />
          <Row label="Prix estimé" value={`${price} €`} highlight />
          <Row label={`Acompte (${Math.round(depositRate * 100)} %)`} value={`${deposit} €`} highlight />
          <Row label="Solde sur place" value={`${price - deposit} €`} />
        </dl>
      </div>

      <div className="rounded-sm border border-border bg-linen/40 p-5 text-sm text-taupe">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink">Acompte</p>
        <p>
          Un acompte de {Math.round(depositRate * 100)} % ({deposit} €) est demandé pour confirmer
          le rendez-vous. Il est déduit du montant total le jour de la prestation.
        </p>
      </div>

      <div className="rounded-sm border border-border bg-card p-6">
        <p className="eyebrow mb-4">Coordonnées</p>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <Row label="Prénom" value={customer.firstName} />
          <Row label="Nom" value={customer.lastName} />
          <Row label="Email" value={customer.email} />
          <Row label="Téléphone" value={customer.phone} />
          {customer.instagram && <Row label="Instagram" value={customer.instagram} />}
          <Row label="Statut" value={customer.customerType === "new" ? "Nouvelle cliente" : "Déjà venue"} />
        </dl>
      </div>

      {(preferences.shape || preferences.length || preferences.colors || preferences.designDescription || preferences.notes) && (
        <div className="rounded-sm border border-border bg-card p-6">
          <p className="eyebrow mb-4">Vos préférences</p>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            {preferences.shape && <Row label="Forme" value={preferences.shape} />}
            {preferences.length && <Row label="Longueur" value={preferences.length} />}
            {preferences.colors && <Row label="Couleurs" value={preferences.colors} />}
            {preferences.designDescription && (
              <Row label="Design" value={preferences.designDescription} full />
            )}
            {preferences.notes && <Row label="Notes" value={preferences.notes} full />}
          </dl>
        </div>
      )}

      <div className="rounded-sm border border-bordeaux/30 bg-bordeaux/5 p-5 text-sm text-taupe">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-bordeaux">
          Conditions d'annulation
        </p>
        <p>
          Toute annulation doit être effectuée au moins {business.bookingRules.minLeadHours}h à l'avance.
          Le prix affiché est une estimation susceptible d'évoluer selon la complexité du nail art.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-taupe">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => onConsent(v === true)}
          className="mt-0.5 border-ink"
        />
        <span>
          J'accepte les <a href="/conditions" className="underline underline-offset-4">conditions de réservation et d'annulation</a>.
        </span>
      </label>
    </div>
  );
}

function Row({ label, value, highlight, full }: { label: string; value: string; highlight?: boolean; full?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1", full && "sm:col-span-2")}>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-taupe">{label}</dt>
      <dd className={cn("text-ink", highlight && "font-display text-xl text-bordeaux")}>{value}</dd>
    </div>
  );
}
