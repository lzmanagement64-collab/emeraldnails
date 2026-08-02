// ============================================================
// Attribution du rôle administrateur — réservée à la gérante.
// Le rôle n'est accordé que si l'e-mail du compte connecté figure
// dans la liste blanche (vérification exclusivement serveur).
// ============================================================
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const reclamerAccesAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { estCompteAutorise } = await import("./admin-guard.server");
    const email = (context.claims as { email?: string | null } | null)?.email ?? null;
    if (!estCompteAutorise(email)) {
      return { autorise: false as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existant } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!existant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: context.userId, role: "admin" });
      if (error) {
        console.error("[reclamerAccesAdmin]", error.message);
        throw new Error("Impossible d'activer l'accès de gestion pour le moment.");
      }
    }
    return { autorise: true as const };
  });
