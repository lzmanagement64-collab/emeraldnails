// Helpers serveur pour l'espace administration.
// Ce fichier n'est jamais embarqué dans le bundle navigateur (*.server.ts).
import type { BookingInput, LeadInput } from "./booking-schemas";

type StaffContext = {
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  userId: string;
};

/** Vérifie que l'utilisateur connecté possède un rôle admin ou staff. */
export async function assertStaff(context: StaffContext) {
  const [admin, staff] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "staff" }),
  ]);
  if (!admin.data && !staff.data) throw new Error("Accès refusé");
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
