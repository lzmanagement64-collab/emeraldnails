import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { business } from "@/config/business";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Emerald Beauty" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Définissez un nouveau mot de passe pour votre espace Emerald Beauty.",
      },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [validLink, setValidLink] = useState<boolean | null>(null);

  useEffect(() => {
    // Récupère les tokens depuis le hash de récupération Supabase.
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (type !== "recovery" || !accessToken || !refreshToken) {
      setValidLink(false);
      toast.error("Lien invalide ou expiré.");
      return;
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ data, error }) => {
        if (error || !data.session) {
          setValidLink(false);
          toast.error("Lien invalide ou expiré.");
          return;
        }
        setValidLink(true);
      });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Mot de passe mis à jour. Vous pouvez vous connecter.");
    navigate({ to: "/auth" });
  };

  if (validLink === null) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4 py-16">
        <p className="text-sm text-taupe">Vérification du lien…</p>
      </div>
    );
  }

  if (validLink === false) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
          <p className="eyebrow mb-2">Espace professionnel</p>
          <h1 className="mb-4 font-display text-2xl text-ink">{business.name}</h1>
          <p className="text-sm text-taupe">
            Ce lien de réinitialisation est invalide ou a expiré.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/auth" })}
            className="mt-6 text-xs text-taupe underline"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8">
        <p className="eyebrow mb-2">Espace professionnel</p>
        <h1 className="mb-6 font-display text-2xl text-ink">Nouveau mot de passe</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-taupe">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm text-taupe">
              Confirmer le mot de passe
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primaire w-full">
            {loading ? "Un instant…" : "Enregistrer le mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
