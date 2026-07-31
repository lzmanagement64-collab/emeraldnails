import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { business } from "@/config/business";
import { toast } from "sonner";

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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/auth" },
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data.session) {
        toast.success("Compte créé. Vérifiez votre boîte mail pour confirmer l'adresse.");
        setMode("signin");
        return;
      }
      navigate({ to: "/admin" });
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Identifiants invalides");
      return;
    }
    navigate({ to: "/admin" });
  };

  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-16">
      <div className="w-full max-w-sm rounded-sm border border-border bg-card p-8">
        <p className="eyebrow mb-2">Espace professionnel</p>
        <h1 className="mb-6 font-display text-2xl text-ink">{business.name}</h1>
        <form onSubmit={submit} className="space-y-4">

          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-taupe">E-mail</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-taupe">Mot de passe</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-sm bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-porcelain disabled:opacity-60"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <p className="mt-6 text-xs text-taupe">
          Accès réservé. Les tentatives de connexion sont journalisées et les données clientes
          restent chiffrées et inaccessibles sans autorisation.
        </p>
      </div>
    </div>
  );
}
