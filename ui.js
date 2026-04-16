/* ui.js — Interface utilisateur, événements, rendu des résultats */

/* ── État global ── */
const selectedTypes = new Set([
  "shockland",
  "checkland",
  "fastland",
  "basicland",
]);

/* ── Init : boutons de type de land ── */
function initToggles() {
  const container = document.getElementById("landToggles");
  const order = [
    "shockland",
    "checkland",
    "fastland",
    "slowland",
    "triome",
    "basicland",
  ];

  for (const type of order) {
    const btn = document.createElement("button");
    btn.className = "land-btn" + (selectedTypes.has(type) ? " selected" : "");
    btn.dataset.type = type;
    btn.textContent = TYPE_LABELS[type];
    btn.addEventListener("click", () => {
      if (selectedTypes.has(type)) selectedTypes.delete(type);
      else selectedTypes.add(type);
      btn.classList.toggle("selected");
    });
    container.appendChild(btn);
  }
}

/* ── Fonction principale ── */
async function calculate() {
  await allLandsReady;
  const btn = document.getElementById("calcBtn");
  const status = document.getElementById("status");
  const results = document.getElementById("results");
  const text = document.getElementById("decklist").value.trim();
  const landCount =
    parseInt(document.getElementById("landCount").value, 10) || 24;

  results.innerHTML = "";

  if (!text) {
    results.innerHTML =
      '<div class="error">Collez une decklist d\'abord.</div>';
    return;
  }

  const cards = parseDecklist(text);
  if (cards.length === 0) {
    results.innerHTML =
      '<div class="error">Aucune carte non-land détectée. Vérifiez le format (ex: "4 Llanowar Elves").</div>';
    return;
  }

  btn.disabled = true;
  setStatus(status, `Analyse de ${cards.length} cartes…`);

  /* ── Récupération Scryfall ── */
  const cardData = [];
  let fetched = 0;

  for (const card of cards) {
    const data = await fetchCardData(card.name);
    fetched++;
    setStatus(status, `Scryfall : ${fetched} / ${cards.length}`);

    if (data && data.mana_cost) {
      cardData.push({
        qty: card.qty,
        name: card.name,
        manaCost: data.mana_cost,
        cmc: data.cmc || 0,
      });
    }

    await sleep(SCRYFALL_DELAY_MS);
  }

  if (cardData.length === 0) {
    results.innerHTML =
      '<div class="error">Impossible de récupérer les données Scryfall. Vérifiez votre connexion.</div>';
    btn.disabled = false;
    setStatus(status, "");
    return;
  }

  setStatus(status, "Calcul Karsten…");

  /* ── Calcul ── */
  const requirements = computeColorRequirements(cardData, landCount);
  const availableLands = getAvailableLands(requirements, selectedTypes);
  const manaBases = await generateManaBases(availableLands, requirements, landCount);

  setStatus(status, "");
  btn.disabled = false;

  /* ── Rendu ── */
  results.innerHTML =
    renderRequirements(requirements, landCount, cardData.length) +
    renderManaBases(manaBases, requirements);
}

/* ── Helpers ── */
function setStatus(el, text) {
  el.textContent = text;
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ── Rendu : bloc requirements Karsten ── */
function renderRequirements(req, landCount, cardCount) {
  const activeColors = ["W", "U", "B", "R", "G"].filter((c) => req[c] > 0);
  if (activeColors.length === 0) return "";

  const cards = activeColors
    .map(
      (c) => `
    <div class="color-req-card has-${c.toLowerCase()}">
      <div class="needed">${req[c]}</div>
      <div class="req-label">${COLOR_NAMES[c]}</div>
    </div>`,
    )
    .join("");

  return `
    <div class="card" style="margin-bottom:1rem;">
      <p class="section-label">Sources requises — méthode Karsten</p>
      <div class="color-reqs">${cards}</div>
      <p class="analysis-note">${cardCount} cartes analysées · ${landCount} lands · Standard 60 cartes</p>
    </div>`;
}

/* ── Rendu : toutes les mana bases ── */
function renderManaBases(manaBases, requirements) {
  if (manaBases.length === 0) {
    return '<div class="error">Impossible de générer une mana base. Vérifiez les types de lands sélectionnés.</div>';
  }

  let html =
    '<p class="section-label" style="margin-bottom:10px;">Mana bases proposées</p>';
  manaBases.forEach((mb, i) => {
    html += renderOneBase(mb, i, requirements);
  });
  return html;
}

/* ── Rendu : une mana base ── */
function renderOneBase(mb, rank, requirements) {
  const activeColors = ["W", "U", "B", "R", "G"].filter(
    (c) => requirements[c] > 0,
  );
  const satisfied = activeColors.filter(
    (c) => mb.sources[c] >= requirements[c],
  ).length;
  const isBest = rank === 0;
  const badge = isBest
    ? '<span class="badge badge-best">Optimal</span>'
    : `<span class="badge badge-alt">${mb.name}</span>`;

  const landRows = Object.entries(mb.allocation)
    .filter(([, v]) => v > 0)
    .map(([id, count]) => {
      const land = ALL_LANDS.find((l) => l.id === id);
      if (!land) return "";
      const pips = land.colors
        .map((c) => `<span class="pip pip-${c.toLowerCase()}"></span>`)
        .join("");
      return `
        <div class="land-row">
          <span class="land-name">${land.name}</span>
          <div class="land-meta">
            <div class="land-pips">${pips}</div>
            <span class="land-count">×${count}</span>
          </div>
        </div>`;
    })
    .join("");

  const sourceChecks = activeColors
    .map((c) => {
      const ok = mb.sources[c] >= requirements[c];
      return `
      <span class="source-check">
        <span class="pip pip-${c.toLowerCase()}"></span>
        <span class="check-val">${mb.sources[c]}/${requirements[c]}</span>
        <span class="check-mark ${ok ? "check-ok" : "check-fail"}">${ok ? "✓" : "✗"}</span>
      </span>`;
    })
    .join("");

  return `
    <div class="result-card${isBest ? " best" : ""}">
      <div class="result-header">
        <div>
          <div class="result-rank">Option ${rank + 1}</div>
          <div class="result-score">${mb.score}<span>/100</span></div>
          <div class="score-detail">${satisfied}/${activeColors.length} couleurs satisfaites · ${Object.values(mb.allocation).reduce((s, v) => s + v, 0)} lands</div>
        </div>
        ${badge}
      </div>
      <div class="land-list">${landRows}</div>
      <div class="source-check-row">${sourceChecks}</div>
    </div>`;
}

/* ── Lancement ── */
initToggles();
