// ============================================================
// Relais des secrets de Lovable Cloud (Cloud → Secrets) vers les
// fonctions serveur du site, quand l'hébergement du site ne les reçoit pas.
//
// - Répond UNIQUEMENT à un appel portant la clé serveur du projet
//   (service role / clé secrète Supabase), vérifiée auprès de Supabase.
//   Un visiteur, même avec la clé publique, est refusé (401).
// - Ne renvoie que la liste fermée ci-dessous, jamais d'autre variable.
// - Aucune valeur n'est écrite dans les journaux.
// ============================================================

const SECRETS_PARTAGES = [
  "RESEND_API_KEY",
  "RESEND_FROM",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET",
  "SITE_URL",
];

/** La clé fournie est-elle une clé serveur du projet ? (appel réservé à l'administration) */
async function cleServeurValide(cle: string): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url || cle.length < 20) return false;
  const headers: Record<string, string> = { apikey: cle };
  if (!cle.startsWith("sb_")) headers.Authorization = `Bearer ${cle}`;
  const res = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1`, { headers });
  await res.body?.cancel();
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Méthode non autorisée", { status: 405 });
  const cle = req.headers.get("x-cle-serveur") ?? "";
  if (!(await cleServeurValide(cle))) return new Response("Non autorisé", { status: 401 });

  const secrets: Record<string, string> = {};
  for (const nom of SECRETS_PARTAGES) {
    const valeur = Deno.env.get(nom);
    if (valeur) secrets[nom] = valeur;
  }
  return Response.json(
    { secrets },
    { headers: { "cache-control": "no-store", "content-type": "application/json" } },
  );
});
