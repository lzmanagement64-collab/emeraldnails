import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createLead } from "@/lib/booking.functions";

type Props = {
  type: "contact" | "franchise" | "recrutement";
  submitLabel?: string;
  messagePlaceholder?: string;
};

/** Formulaire de captation de leads — validation client + serveur. */
export function LeadForm({ type, submitLabel = "Envoyer", messagePlaceholder }: Props) {
  const send = useServerFn(createLead);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "", message: "" });

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return toast.error("Merci d'indiquer votre nom");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return toast.error("E-mail invalide");
    setLoading(true);
    try {
      await send({ data: { type, ...form } });
      setDone(true);
      toast.success("Message envoyé — réponse sous 24 h ouvrées.");
    } catch {
      toast.error("Envoi impossible, réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-sm border border-border bg-card p-8 text-center">
        <p className="font-display text-xl text-ink">Merci !</p>
        <p className="mt-2 text-sm text-taupe">
          Votre demande est bien enregistrée. Nous revenons vers vous sous 24 h ouvrées.
        </p>
      </div>
    );
  }

  const field = "w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm";

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-sm border border-border bg-card p-6 sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${type}-name`} className="mb-1 block text-sm text-taupe">
            Nom et prénom *
          </label>
          <input
            id={`${type}-name`}
            required
            maxLength={80}
            value={form.name}
            onChange={set("name")}
            className={field}
          />
        </div>
        <div>
          <label htmlFor={`${type}-email`} className="mb-1 block text-sm text-taupe">
            E-mail *
          </label>
          <input
            id={`${type}-email`}
            type="email"
            required
            maxLength={255}
            value={form.email}
            onChange={set("email")}
            className={field}
          />
        </div>
        <div>
          <label htmlFor={`${type}-phone`} className="mb-1 block text-sm text-taupe">
            Téléphone
          </label>
          <input
            id={`${type}-phone`}
            type="tel"
            maxLength={30}
            value={form.phone}
            onChange={set("phone")}
            className={field}
          />
        </div>
        <div>
          <label htmlFor={`${type}-city`} className="mb-1 block text-sm text-taupe">
            Ville
          </label>
          <input
            id={`${type}-city`}
            maxLength={80}
            value={form.city}
            onChange={set("city")}
            className={field}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${type}-message`} className="mb-1 block text-sm text-taupe">
          Message
        </label>
        <textarea
          id={`${type}-message`}
          rows={5}
          maxLength={2000}
          placeholder={messagePlaceholder}
          value={form.message}
          onChange={set("message")}
          className={field}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-sm bg-ink px-6 py-3 font-mono text-[11px] uppercase tracking-widest text-porcelain disabled:opacity-60"
      >
        {loading ? "Envoi…" : submitLabel}
      </button>
      <p className="text-xs text-taupe">
        Vos données sont transmises de façon chiffrée, stockées en Europe et utilisées uniquement
        pour répondre à votre demande. Aucune revente, aucun partage publicitaire.
      </p>
    </form>
  );
}
