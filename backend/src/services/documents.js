const eur = (c) =>
  (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const dateFr = (d) => new Date(d).toLocaleDateString("fr-FR");

const REASON_LABELS = {
  RUPTURE: "Rupture d'approvisionnement",
  TENSION: "Tension d'approvisionnement",
  BESOIN_URGENT: "Besoin impératif et immédiat (patient en cours de traitement)",
};

const STORAGE_LABELS = {
  AMBIANT: "Température ambiante",
  FRIGO: "Réfrigéré (2–8 °C)",
  CONGELE: "Congelé (≤ -18 °C)",
};

/**
 * Bon de cession à titre de dépannage entre PUI.
 * Gabarit à faire relire par un juriste en droit pharmaceutique.
 */
export function generateBonDeCession({ cession, offer, listing, seller, buyer }) {
  return `
══════════════════════════════════════════════════════════════════
     BON DE CESSION À TITRE DE DÉPANNAGE ENTRE PHARMACIES
                    À USAGE INTÉRIEUR
══════════════════════════════════════════════════════════════════
Référence Remed : ${cession.id}
Date d'émission : ${dateFr(new Date())}
──────────────────────────────────────────────────────────────────

ÉTABLISSEMENT CÉDANT
  ${seller.name}
  FINESS : ${seller.finess}
  ${seller.address}, ${seller.city}

ÉTABLISSEMENT BÉNÉFICIAIRE
  ${buyer.name}
  FINESS : ${buyer.finess}
  ${buyer.address}, ${buyer.city}

──────────────────────────────────────────────────────────────────
MOTIF DU DÉPANNAGE (déclaré par l'établissement bénéficiaire)
  ${REASON_LABELS[offer.needReason] || offer.needReason}
  Justification : ${offer.needDetails}
──────────────────────────────────────────────────────────────────

PRODUIT CÉDÉ
  Spécialité       : ${listing.medicationName} ${listing.dosage}
  Forme             : ${listing.form}${listing.cipCode ? `\n  Code CIP          : ${listing.cipCode}` : ""}
  N° de lot         : ${listing.batchNumber}
  Date de péremption: ${dateFr(listing.expiryDate)}
  Conservation      : ${STORAGE_LABELS[listing.storage] || listing.storage}
  Quantité cédée    : ${offer.quantity} unité(s)

CONDITIONS FINANCIÈRES
  Cession au prix coûtant (prix d'achat unitaire justifié) :
    ${eur(listing.unitCostCents)} / unité
  Montant total : ${eur(cession.amountCents)}
  Sans marge ni bénéfice.
  Règlement direct entre établissements ; aucun paiement ne transite
  par la plateforme Remed.

──────────────────────────────────────────────────────────────────
Fait en deux exemplaires.

Le pharmacien gérant                Le pharmacien gérant
de la PUI cédante                   de la PUI bénéficiaire


Nom :                               Nom :
Date :                               Date :
Signature :                          Signature :
══════════════════════════════════════════════════════════════════
`.trim();
}

/**
 * Courrier d'information à l'ARS (dépannage pour besoin impératif).
 */
export function generateCourrierARS({ cession, offer, listing, seller, buyer }) {
  return `
${seller.name}
${seller.address}
${seller.city}
FINESS : ${seller.finess}

                                      ${dateFr(new Date())}

          À l'attention de
          Monsieur/Madame le/la Directeur(trice) Général(e)
          de l'Agence Régionale de Santé

Objet : Information relative à un approvisionnement de dépannage
        entre pharmacies à usage intérieur
Réf. Remed : ${cession.id}

Madame, Monsieur le Directeur Général,

Conformément aux dispositions du code de la santé publique relatives
à l'approvisionnement entre pharmacies à usage intérieur en cas de
besoin impératif, j'ai l'honneur de vous informer de la cession
suivante intervenue dans le cadre d'un dépannage :

  Établissement cédant :
    ${seller.name} (FINESS ${seller.finess}), ${seller.city}

  Établissement bénéficiaire :
    ${buyer.name} (FINESS ${buyer.finess}), ${buyer.city}

  Spécialité : ${listing.medicationName} ${listing.dosage}
  Lot : ${listing.batchNumber}, péremption : ${dateFr(listing.expiryDate)}
  Quantité : ${offer.quantity} unité(s)
  Conservation : ${STORAGE_LABELS[listing.storage] || listing.storage}

  Motif déclaré par l'établissement bénéficiaire :
    ${REASON_LABELS[offer.needReason] || offer.needReason}
    ${offer.needDetails}

  Conditions : cession au prix coûtant (${eur(listing.unitCostCents)}/unité),
  sans bénéfice. Règlement direct entre établissements.

Je reste à votre disposition pour tout complément d'information.

Veuillez agréer, Madame, Monsieur le Directeur Général,
l'expression de ma considération distinguée.


Le pharmacien gérant de la PUI
${seller.name}
`.trim();
}
