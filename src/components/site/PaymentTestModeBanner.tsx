const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-bordeaux/30 bg-bordeaux/10 px-4 py-2 text-center text-sm text-bordeaux">
        Le paiement en ligne n'est pas encore activé sur cette version du site.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-border bg-linen px-4 py-2 text-center text-sm text-taupe">
        Mode test : aucun paiement réel n'est encaissé depuis l'aperçu.
      </div>
    );
  }
  return null;
}
