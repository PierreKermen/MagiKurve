# ManaKurve

Outil web pour calculer la mana base optimale d'un deck Magic: The Gathering Standard 60 cartes, basé sur la méthode mathématique de **Frank Karsten** (probabilité hypergéométrique).

## Fonctionnalités

- Coller une decklist au format Arena ou MTGO
- Récupération automatique des coûts en mana via l'API Scryfall
- Calcul des sources colorées requises par la méthode Karsten
- Sélection des types de lands disponibles (Shock, Check, Fast, Slow, Triomes, Basics)
- 3 mana bases proposées et classées par score d'optimisation

## Déploiement sur GitHub Pages

### 1. Créer un repo GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/mtg-manabase.git
git push -u origin main
```

### 2. Activer GitHub Pages

1. Aller dans **Settings → Pages** de ton repo
2. Source : **Deploy from a branch**
3. Branch : `main` / `/ (root)`
4. Cliquer **Save**

Ton site sera accessible à :
`https://TON_USERNAME.github.io/mtg-manabase/`

### 3. Mises à jour

```bash
git add .
git commit -m "Mise à jour"
git push
```

GitHub Pages se met à jour automatiquement en quelques secondes.

## Structure des fichiers

```
index.html   — Page principale
style.css    — Styles (thème dark MTG)
data.js      — Base de données des lands Standard
karsten.js   — Algorithme de Frank Karsten
optimizer.js — Générateur de mana bases
ui.js        — Interface et interactions
```

## Méthode Karsten

La table de Karsten donne le nombre de sources colorées nécessaires dans un deck 60 cartes / 24 lands pour atteindre ~90% de consistance :

| Pips | Tour 1 | Tour 2 | Tour 3 | Tour 4 |
|------|--------|--------|--------|--------|
| C    | 14     | 13     | 12     | 11     |
| CC   | 20     | 16     | 14     | 13     |
| CCC  | 23     | 21     | 18     | 16     |
| CCCC | 24     | 23     | 22     | 20     |

Source : [Frank Karsten, ChannelFireball 2022](https://www.channelfireball.com/articles/how-many-colored-mana-sources-do-you-need-to-consistently-cast-your-spells-a-guilds-of-ravnica-update/)