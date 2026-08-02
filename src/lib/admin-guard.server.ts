// Helpers serveur pour l'espace administration.
// Ce fichier n'est jamais embarqué dans le bundle navigateur (*.server.ts).
import { business } from "@/config/business";
import type { BookingInput, LeadInput } from "./booking-schemas";

type StaffContext = {
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  userId: string;
  claims?: { email?: string | null } | null;
};

/** Liste blanche des comptes autorisés à administrer le site (normalisée). */
const COMPTES_AUTORISES = business.adminEmails.map((e) => e.trim().toLowerCase());

export function estCompteAutorise(email?: string | null) {
  if (!email) return false;
  return COMPTES_AUTORISES.includes(email.trim().toLowerCase());
}

/**
 * Vérifie que le compte connecté est bien celui de la gérante :
 * 1. son e-mail figure dans la liste blanche ;
 * 2. il possède le rôle admin ou staff en base.
 * Les deux conditions sont obligatoires.
 */
export async function assertStaff(context: StaffContext) {
  if (!estCompteAutorise(context.claims?.email)) {
    throw new Error("Accès refusé : ce compte n'est pas autorisé à ouvrir l'espace de gestion.");
  }
  const [admin, staff] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "staff" }),
  ]);
  if (!admin.data && !staff.data) {
    throw new Error("Accès refusé : ce compte n'a pas les droits de gestion.");
  }
}

export function bookingRow(data: BookingInput) {
  return {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    phone: data.phone,
    instagram: data.instagram || null,
    customer_type: data.customerType,
    city: data.city || null,
    service_id: data.serviceId,
    service_name: data.serviceName,
    options: data.options,
    appointment_date: data.appointmentDate,
    start_time: data.startTime,
    end_time: data.endTime,
    duration_minutes: data.durationMinutes,
    total_amount: data.totalAmount,
    deposit_amount: data.depositAmount,
    remaining_balance: data.remainingBalance,
    preferences: data.preferences,
    notes: data.preferences.notes || null,
  };
}

export function leadRow(data: LeadInput) {
  return {
    type: data.type,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    city: data.city || null,
    message: data.message || null,
  };
}
