/* karsten.js — Implémentation de la méthode Frank Karsten
   Source : "How Many Colored Mana Sources Do You Need to Consistently Cast
   Your Spells?" (ChannelFireball, mise à jour 2022)

   La table ci-dessous donne le nombre de sources colorées nécessaires dans
   un deck de 60 cartes avec 24 lands pour atteindre ~90% de consistance.
   Axes : [pips_de_couleur][cmc_de_la_carte]

   Notes :
   - "pips" = nombre de symboles de la même couleur dans le coût (ex: WW = 2)
   - "cmc"  = coût total converti (tour auquel la carte est jouée)
   - Pour les cartes multicolores (ex: 1WU), on traite chaque couleur séparément
     puis on ajoute +1 à chacune (règle de Karsten pour les paires de couleurs)
*/

/* Table principale : KARSTEN_60[pips][cmc]
   pips : 1-4, cmc : 1-6+
   Valeurs basées sur la table publiée dans l'article de 2022 pour 24 lands / 60 cartes */
const KARSTEN_60 = {
  1: { 1: 14, 2: 13, 3: 12, 4: 11, 5: 10, 6: 9 },
  2: { 1: 20, 2: 16, 3: 14, 4: 13, 5: 12, 6: 11 },
  3: { 1: 23, 2: 21, 3: 18, 4: 16, 5: 15, 6: 14 },
  4: { 1: 24, 2: 23, 3: 22, 4: 20, 5: 18, 6: 17 },
};

/* Ajustement selon le nombre réel de lands dans le deck
   Karsten publie la table pour 24 lands. Pour d'autres counts, on
   applique un delta linéaire approximatif : ±0.5 source par land de différence */
function adjustForLandCount(baseRequired, landCount) {
  const delta = (landCount - 24) * 0.5;
  return Math.max(1, Math.round(baseRequired - delta));
}

/* Extraire les pips colorés d'un coût en mana Scryfall
   Ex: "{2}{W}{W}" → { W:2, U:0, B:0, R:0, G:0 }
   Gère aussi les coûts hybrides "{W/U}" en comptant 0.5 pour chaque côté */
function extractPips(manaCost) {
  const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  if (!manaCost) return pips;

  const tokens = manaCost.match(/\{[^}]+\}/g) || [];
  for (const token of tokens) {
    const inner = token.slice(1, -1); // retire les {}

    if (["W", "U", "B", "R", "G"].includes(inner)) {
      pips[inner]++;
    } else if (inner.includes("/")) {
      // Hybride : {W/U}, {2/W}, {W/P} etc.
      const parts = inner.split("/");
      for (const p of parts) {
        if (["W", "U", "B", "R", "G"].includes(p)) pips[p] += 0.5;
      }
    }
    // {X}, {1}, {2}... ignorés (mana générique)
  }
  return pips;
}

/* Détecter si un coût est multicolore (2+ couleurs avec pips ≥ 1) */
function isMulticolor(pips) {
  return Object.values(pips).filter((v) => v >= 1).length >= 2;
}

/* Calculer les sources requises pour une carte donnée
   Retourne { W: n, U: n, B: n, R: n, G: n }
   Si multicolore, applique +1 à chaque couleur présente (règle Karsten) */
function requiredSourcesForCard(manaCost, cmc, landCount) {
  const pips = extractPips(manaCost);
  const multi = isMulticolor(pips);
  const result = { W: 0, U: 0, B: 0, R: 0, G: 0 };

  const cmcKey = Math.min(Math.max(Math.round(cmc), 1), 6);

  for (const color of ["W", "U", "B", "R", "G"]) {
    const p = Math.round(pips[color]); // arrondi pour les hybrides
    if (p <= 0) continue;

    const pipKey = Math.min(p, 4);
    let base = (KARSTEN_60[pipKey] || {})[cmcKey] || 14;
    base = adjustForLandCount(base, landCount);

    // Règle multicolore Karsten : +1 source par couleur supplémentaire
    if (multi) base = Math.min(base + 1, landCount);

    result[color] = base;
  }
  return result;
}

/* Agréger les requirements sur toute la liste de cartes.
   Pour chaque couleur, on prend le maximum parmi toutes les cartes. */
function computeColorRequirements(cardDataList, landCount) {
  const req = { W: 0, U: 0, B: 0, R: 0, G: 0 };

  for (const { qty, manaCost, cmc } of cardDataList) {
    if (!manaCost) continue;
    const cardReq = requiredSourcesForCard(manaCost, cmc, landCount);
    for (const color of ["W", "U", "B", "R", "G"]) {
      if (cardReq[color] > req[color]) req[color] = cardReq[color];
    }
  }
  return req;
}
