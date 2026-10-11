// ============================================================
// Données structurées Google (schema.org) du salon : une seule fiche,
// réutilisée par toutes les pages (même identifiant @id).
// Aucune note ni avis inventé : seules des informations réelles.
// ============================================================
import { business, SITE_URL } from "@/config/business";
import type { Horaire } from "./site-data";

export const ID_SALON = `${SITE_URL}/#salon`;

const JOURS_SCHEMA = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const hhmm = (t: string) => t.slice(0, 5);

/** Horaires d'ouverture de la base, au format Google (pause du midi comprise). */
function horairesSchema(horaires: Horaire[]) {
  return horaires
    .filter((h) => !h.ferme)
    .flatMap((h) => {
      const jour = `https://schema.org/${JOURS_SCHEMA[h.jour_semaine]}`;
      const plages =
        h.pause_debut && h.pause_fin
          ? [
              [h.heure_debut, h.pause_debut],
              [h.pause_fin, h.heure_fin],
            ]
          : [[h.heure_debut, h.heure_fin]];
      return plages.map(([opens, closes]) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: jour,
        opens: hhmm(opens),
        closes: hhmm(closes),
      }));
    });
}

export function schemaSalon(horaires: Horaire[] = []) {
  return {
    "@context": "https://schema.org",
    "@type": "NailSalon",
    "@id": ID_SALON,
    name: business.name,
    description: business.shortDescription,
    url: SITE_URL,
    telephone: business.phone,
    email: business.email,
    image: `${SITE_URL}/og-image.png`,
    logo: `${SITE_URL}/apple-touch-icon.png`,
    priceRange: "€€",
    hasMap: business.googleBusinessUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.adresse.rue,
      postalCode: business.adresse.codePostal,
      addressLocality: business.adresse.ville,
      addressRegion: "Nouvelle-Aquitaine",
      addressCountry: business.adresse.pays,
    },
    areaServed: business.serviceArea.map((c) => ({ "@type": "City", name: c })),
    identifier: { "@type": "PropertyValue", propertyID: "SIRET", value: business.legal.siret },
    sameAs: [business.instagramUrl],
    ...(horaires.length ? { openingHoursSpecification: horairesSchema(horaires) } : {}),
  };
}
