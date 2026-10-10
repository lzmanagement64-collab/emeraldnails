// Savoir-faire et déroulement d'un rendez-vous — utilisés sur l'accueil et la page Savoir-faire.
// Textes volontairement sobres : aucune affirmation invérifiable.
import { Sparkles, Sprout, HeartHandshake } from "lucide-react";

export const SAVOIR_FAIRE = [
  {
    icon: Sparkles,
    title: "Précision",
    text: "Une manucure soignée et une pose réalisée avec minutie.",
  },
  {
    icon: Sprout,
    title: "Hygiène",
    text: "Instruments stérilisés en autoclave, matériel à usage unique, produits professionnels certifiés.",
  },
  {
    icon: HeartHandshake,
    title: "Écoute",
    text: "Un échange avant chaque prestation pour proposer ce qui vous correspond.",
  },
];

export const DEROULEMENT = [
  { n: "01", t: "Échange", d: "On discute forme, longueur, couleur et inspiration." },
  { n: "02", t: "Préparation", d: "Manucure et préparation de l'ongle." },
  { n: "03", t: "Pose", d: "Réalisation soignée, à votre rythme." },
  { n: "04", t: "Finition", d: "Soin des cuticules et conseils d'entretien." },
];
