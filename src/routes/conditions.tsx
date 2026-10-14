import { createFileRoute, Link } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";
import { business, SITE_URL } from "@/config/business";
import { POURCENT_ACOMPTE } from "@/lib/acompte";
import { ANNULATION_TEXTE, DELAI_ANNULATION_H, REGLE_ACOMPTE_TEXTE } from "@/lib/annulation";
import { REGLES } from "@/lib/reservation-schemas";

const titre = "font-display text-2xl text-ink pt-4";

export const Route = createFileRoute("/conditions")({
  component: () => (
    <Section eyebrow="Légal" title="Conditions générales de vente" as="h1">
      <div className="mx-auto max-w-3xl space-y-4 leading-relaxed text-taupe">
        <p>
          Les présentes conditions s'appliquent à toute réservation d'une prestation auprès de{" "}
          {business.legal.nomCommercial}, {business.address} (SIRET {business.legal.siretAffiche}
          ). Réserver un rendez-vous vaut acceptation de ces conditions.
        </p>

        <h2 className={titre}>1. Prestations et prix</h2>
        <p>
          Les prestations et leurs prix sont présentés sur la page{" "}
          <Link to="/prestations" className="text-ink underline underline-offset-4">
            Prestations
          </Link>
          . Les prix sont indiqués en euros, toutes taxes comprises ({business.legal.tva}). Les prix
          du nail art peuvent varier selon la complexité demandée ; une prestation « sur devis » est
          chiffrée avec la cliente et s'ajoute au total.
        </p>

        <h2 className={titre}>2. Réservation</h2>
        <p>
          La réservation se fait en ligne sur ce site, au plus tôt {REGLES.delaiMinHeures} h et au
          plus tard {REGLES.maxJoursAvance} jours à l'avance. La cliente choisit ses prestations et
          son créneau, renseigne ses coordonnées puis paie en ligne l'acompte ou la totalité. La
          demande est ensuite validée par {business.founder} : la cliente reçoit alors un e-mail de
          confirmation.
        </p>

        <h2 className={titre}>
          3. Paiement en ligne : acompte de {POURCENT_ACOMPTE} % ou totalité
        </h2>
        <p>
          Au moment de la réservation, la cliente choisit de payer en ligne soit un acompte de{" "}
          {POURCENT_ACOMPTE} % du montant total du rendez-vous, soit la totalité. Les prestations
          sur devis ne sont pas comprises dans ce montant : elles se règlent sur place, après devis.
          Le paiement se fait par carte bancaire, Apple Pay ou Google Pay ; il est traité par la
          société Stripe et aucune donnée bancaire n'est conservée par{" "}
          {business.legal.nomCommercial}.
        </p>
        <p>
          Pendant le paiement, le créneau est réservé 35 minutes ; sans paiement dans ce délai, il
          est libéré. Le montant payé est déduit du total le jour du rendez-vous ; le reste éventuel
          se règle sur place. Si {business.founder} ne peut pas accepter la demande, tout ce qui a
          été payé est remboursé intégralement.
        </p>

        <h2 className={titre}>4. Annulation et modification</h2>
        <p>{ANNULATION_TEXTE}</p>
        <p>{REGLE_ACOMPTE_TEXTE}</p>
        <p>
          Pour modifier un rendez-vous plus de {DELAI_ANNULATION_H} h à l'avance, il suffit de
          l'annuler avec le lien reçu par e-mail puis d'en réserver un nouveau, ou d'appeler le{" "}
          {business.phoneDisplay}.
        </p>

        <h2 className={titre}>5. Retard et absence</h2>
        <p>
          Au-delà de 15 minutes de retard, la prestation pourra être annulée. Selon les
          disponibilités et la durée restante, un supplément pourra également être demandé. En cas
          d'absence, {business.founder} garde l'équivalent de l'acompte ({POURCENT_ACOMPTE} % du
          total) ; si la cliente avait tout payé, le reste lui est remboursé automatiquement.
        </p>

        <h2 className={titre}>6. Santé et contre-indications</h2>
        <p>
          La cliente signale lors de la réservation toute allergie, fragilité des ongles ou
          contre-indication connue. {business.founder} peut refuser ou adapter une prestation si
          l'état de l'ongle ou de la peau ne le permet pas.
        </p>

        <h2 className={titre}>7. Droit de rétractation</h2>
        <p>
          Conformément à l'article L221-28 12° du Code de la consommation, le droit de rétractation
          ne s'applique pas aux prestations de services fournies à une date déterminée. Les règles
          d'annulation ci-dessus (remboursement intégral plus de {DELAI_ANNULATION_H} h avant le
          rendez-vous) s'appliquent.
        </p>

        <h2 className={titre}>8. Réclamations et médiation</h2>
        <p>
          Toute réclamation peut être adressée à {business.email} ou au {business.phoneDisplay}. À
          défaut de solution amiable, la cliente peut recourir gratuitement au médiateur de la
          consommation : {business.legal.mediateur}.
        </p>

        <h2 className={titre}>9. Droit applicable</h2>
        <p>Les présentes conditions sont soumises au droit français.</p>
      </div>
    </Section>
  ),
  head: () => ({
    meta: [
      { title: "Conditions générales de vente — Emerald Beauty" },
      {
        name: "description",
        content: `Conditions de réservation Emerald Beauty à Lons : acompte de ${POURCENT_ACOMPTE} % ou paiement total, annulation gratuite jusqu'à 72 h avant, retard, médiation.`,
      },
      { property: "og:url", content: `${SITE_URL}/conditions` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/conditions` }],
  }),
});
