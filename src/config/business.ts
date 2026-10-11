// ============================================================
// Configuration centrale — Emerald Beauty (Lons, 64140)
// Direction artistique inspirée du logo : vert émeraude profond,
// crème/ivoire et touche dorée.
// ============================================================

// Adresse officielle du site (référencement, liens des e-mails, retour du paiement).
// www.emeraldbeauty.fr et emeraldnails.lovable.app doivent rediriger ici (réglage Lovable).
export const SITE_URL = "https://emeraldbeauty.fr";

export const business = {
  siteUrl: SITE_URL,
  name: "Emerald Beauty",
  tagline: "L'art de sublimer chaque instant.",
  shortDescription:
    "Prothésiste ongulaire à Lons — semi-permanent, renforcement, extension gel, Gel-X et nail art.",
  founder: "Maria",
  city: "Lons",
  address: "7 Impasse d'Ossau, 64140 Lons",
  // Adresse découpée (données Google, mentions légales)
  adresse: { rue: "7 Impasse d'Ossau", codePostal: "64140", ville: "Lons", pays: "FR" },
  // Informations légales (mentions légales, CGV, pied de page)
  legal: {
    nomCommercial: "Emerald Beauty",
    siret: "94148313300018",
    siretAffiche: "941 483 133 00018",
    // À compléter par l'entrepreneuse avant la livraison
    entrepreneuse: "[À COMPLÉTER : prénom et nom]",
    statut: "[À COMPLÉTER : statut juridique, ex. entrepreneuse individuelle (micro-entreprise)]",
    tva: "[À COMPLÉTER : ex. « TVA non applicable, article 293 B du CGI »]",
    directricePublication: "[À COMPLÉTER : prénom et nom]",
    mediateur:
      "[À COMPLÉTER : nom, adresse postale et site internet du médiateur de la consommation]",
  },
  // Hébergeur du site (coordonnées publiées par Lovable dans son accord de traitement des données)
  hebergeur: {
    nom: "Lovable Labs Incorporated",
    adresse: "1 Lincoln St, Boston, MA 02111, États-Unis",
    site: "https://lovable.dev",
  },
  phone: "+33617255424",
  phoneDisplay: "06 17 25 54 24",
  // Adresse de contact publique (site, reply-to des e-mails clientes).
  email: "emeraldnails@outlook.fr",
  // Adresse privée de la gérante : notifications back-office uniquement.
  // Ne jamais l'afficher sur une page publique ni dans un e-mail cliente.
  ownerEmail: "mariachtioui@outlook.fr",
  // Liste blanche des comptes autorisés à accéder à l'administration.
  // La vérification réelle est faite côté serveur (voir admin-guard.server.ts).
  adminEmails: ["mariachtioui@outlook.fr"],
  instagram: "@emerald.beauty64",
  instagramUrl: "https://instagram.com/emerald.beauty64",
  googleBusinessUrl:
    "https://www.google.com/maps/search/?api=1&query=7+Impasse+d%27Ossau+64140+Lons",
  // Horaires d'ouverture : gérés en base (onglet « Horaires » de /admin),
  // voir src/lib/site-data.ts.
  bookingRules: {
    minLeadHours: 12,
    maxAdvanceDays: 60,
    slotStepMinutes: 15,
    // Temps entre deux clientes : réglable dans l'admin (10 min par défaut).
    bufferMinutes: 10,
    depositRate: 0.3,
    /** Annulation gratuite (et possible en ligne) jusqu'à ce délai avant le rendez-vous. */
    annulationGratuiteHeures: 72,
  },
  serviceArea: ["Pau", "Lons", "Billère", "Jurançon", "Lescar", "Bizanos", "Idron", "Gan"],
} as const;

export type Business = typeof business;
