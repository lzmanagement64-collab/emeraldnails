import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { business } from "@/config/business";
import { reclamerAccesAdmin } from "@/lib/admin-access.functions";
import { toast } from "sonner";

// Pas de création de compte depuis le site : le seul compte est celui de la gérante.
// Les inscriptions sont aussi bloquées côté base de données (voir supabase/migrations).
type AuthMode = "signin" | "reset";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Connexion espace pro — Emerald Beauty" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Accès réservé à l'équipe Emerald Beauty." },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const activerAcces = useServerFn(reclamerAccesAdmin);

  // Déjà connectée : direction l'espace de gestion (qui vérifie toujours le compte).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  const apresConnexion = async () => {
    try {
      await activerAcces({});
    } catch {
      /* l'accès reste refusé côté serveur si le compte n'est pas autorisé */
    }
    navigate({ to: "/admin" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Lien envoyé. Vérifiez votre boîte mail (et vos spams).");
      setMode("signin");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Identifiants invalides");
      return;
    }
    await apresConnexion();
  };

  const label = mode === "signin" ? "Se connecter" : "Envoyer le lien";

  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8">
        <p className="eyebrow mb-2">Espace professionnel</p>
        <h1 className="mb-6 font-display text-2xl text-ink">{business.name}</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-taupe">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          {mode !== "reset" && (
            <div>
              <label htmlFor="password" className="mb-1 block text-sm text-taupe">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primaire w-full">
            {loading ? "Un instant…" : label}
          </button>
        </form>

        <div className="mt-4 flex flex-col items-center gap-2">
          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => setMode("reset")}
              className="text-xs text-taupe underline"
            >
              Mot de passe oublié ?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-xs text-taupe underline"
            >
              Retour à la connexion
            </button>
          )}
        </div>

        <p className="mt-6 text-xs text-taupe">Accès réservé à la gérante.</p>
      </div>
    </div>
  );
}
