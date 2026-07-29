// ============================================================
// Couche service pour la réservation.
// Prévu pour être connecté à n8n via des webhooks. Tant que
// les variables d'environnement ne sont pas définies, le code
// tourne en mode démonstration avec des disponibilités fictives.
// ============================================================

import { business } from "@/config/business";
import type { Service, ServiceOption } from "@/data/services";

const BOOKING_WEBHOOK = import.meta.env.VITE_N8N_BOOKING_WEBHOOK_URL as string | undefined;
const AVAILABILITY_WEBHOOK = import.meta.env.VITE_N8N_AVAILABILITY_WEBHOOK_URL as string | undefined;

export type BookingPayload = {
  bookingId: string;
  createdAt: string;
  status: "pending";
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    instagram?: string;
    customerType: "new" | "returning";
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    basePrice: number;
  };
  options: Array<{
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
  }>;
  appointment: {
    date: string;
    startTime: string;
    endTime: string;
    timezone: "Europe/Paris";
  };
  preferences: {
    shape: string;
    length: string;
    colors: string;
    designDescription: string;
    notes: string;
  };
  inspirationImages: string[];
  estimatedTotal: number;
  depositRate: number;
  depositAmount: number;
  remainingBalance: number;
  consent: true;
  source: "website";
};

export type Availability = {
  date: string; // yyyy-mm-dd
  slots: string[]; // HH:mm
};

// ---------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------
export const totalDuration = (service: Service, options: ServiceOption[]) =>
  service.durationMinutes + options.reduce((s, o) => s + o.durationMinutes, 0);

export const totalPrice = (service: Service, options: ServiceOption[]) =>
  service.basePrice + options.reduce((s, o) => s + o.price, 0);

// Acompte de 20 % demandé à la réservation (arrondi à l'euro supérieur)
export const depositRate = business.bookingRules.depositRate;
export const depositAmount = (total: number) => Math.ceil(total * depositRate);
export const formatEuro = (v: number) => `${v} €`;

export const addMinutes = (time: string, minutes: number) => {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export const formatDateISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// ---------------------------------------------------------------
// Disponibilités
// ---------------------------------------------------------------
function mockSlotsForDate(date: Date, durationMinutes: number): string[] {
  const dow = date.getDay();
  const hours = business.weekdayHours[dow];
  if (!hours) return [];

  const now = new Date();
  const minLead = business.bookingRules.minLeadHours * 60 * 60 * 1000;
  const isToday = formatDateISO(date) === formatDateISO(now);

  const [sh, sm] = hours.start.split(":").map(Number);
  const [eh, em] = hours.end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em - durationMinutes;

  const slots: string[] = [];
  const step = business.bookingRules.slotStepMinutes;
  for (let t = startMin; t <= endMin; t += step) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    if (isToday) {
      const slotDate = new Date(date);
      slotDate.setHours(h, m, 0, 0);
      if (slotDate.getTime() - now.getTime() < minLead) continue;
    }
    slots.push(label);
  }

  // On simule quelques créneaux déjà réservés de façon déterministe
  const seed = (date.getDate() + date.getMonth()) % 4;
  return slots.filter((_, i) => (i + seed) % 5 !== 0);
}

export async function fetchAvailability(params: {
  serviceId: string;
  month: string; // yyyy-mm
  durationMinutes: number;
}): Promise<Availability[]> {
  if (AVAILABILITY_WEBHOOK) {
    try {
      const res = await fetch(AVAILABILITY_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: params.serviceId,
          month: params.month,
          timezone: "Europe/Paris",
        }),
      });
      if (res.ok) return (await res.json()) as Availability[];
    } catch (e) {
      console.warn("[availability] fallback en mode démo", e);
    }
  }

  // Mode démo : on génère un mois complet
  const [y, m] = params.month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const results: Availability[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m - 1, d);
    const slots = mockSlotsForDate(date, params.durationMinutes);
    if (slots.length > 0) {
      results.push({ date: formatDateISO(date), slots });
    }
  }
  return results;
}

// ---------------------------------------------------------------
// Soumission d'une réservation
// 1. Enregistrement sécurisé en base (validation serveur)
// 2. Notification n8n si le webhook est configuré
// ---------------------------------------------------------------
export async function submitBooking(payload: BookingPayload): Promise<{
  ok: boolean;
  demoMode: boolean;
  bookingId?: string;
  error?: string;
}> {
  let bookingId: string | undefined;
  try {
    const { createBooking } = await import("@/lib/booking.functions");
    const created = await createBooking({
      data: {
        firstName: payload.customer.firstName,
        lastName: payload.customer.lastName,
        email: payload.customer.email,
        phone: payload.customer.phone,
        instagram: payload.customer.instagram ?? "",
        customerType: payload.customer.customerType,
        city: "",
        serviceId: payload.service.id,
        serviceName: payload.service.name,
        options: payload.options,
        appointmentDate: payload.appointment.date,
        startTime: payload.appointment.startTime,
        endTime: payload.appointment.endTime,
        durationMinutes: payload.service.durationMinutes,
        totalAmount: payload.estimatedTotal,
        depositAmount: payload.depositAmount,
        remainingBalance: payload.remainingBalance,
        preferences: payload.preferences,
      },
    });
    bookingId = created?.id;
  } catch (e) {
    return { ok: false, demoMode: false, error: (e as Error).message };
  }

  if (BOOKING_WEBHOOK) {
    try {
      await fetch(BOOKING_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, bookingId }),
      });
    } catch (e) {
      console.warn("[booking] webhook n8n injoignable", e);
    }
  }

  return { ok: true, demoMode: false, bookingId };
}

