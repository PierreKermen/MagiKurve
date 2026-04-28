/* ui.js — Three-step UI: Parse → Review → Optimize */

/* ── State ── */
const selectedTypes = new Set([
  "basic",
  "shockland",
  "slowland",
  "fastland",
  "surveilland",
  "vergeland",
  "creatureland",
]);

let parsedSpells = [];
let parsedFixedLands = [];

/* ── Init: land type toggle buttons ── */
function initToggles() {
  const container = document.getElementById("landToggles");
  const order = ["basic", "shockland", "slowland", "fastland", "surveilland", "vergeland", "creatureland"];

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

/* ── Step 1: Parse ── */
async function handleParse() {
  await allLandsReady;
  const text = document.getElementById("decklist").value.trim();
  const parseStatus = document.getElementById("parseStatus");
  const reviewSection = document.getElementById("section-review");
  const configSection = document.getElementById("section-config");
  const optimizeCta = document.getElementById("optimizeCta");
  const results = document.getElementById("results");

  results.innerHTML = "";

  if (!text) {
    parseStatus.textContent = "Paste a decklist first.";
    return;
  }

  const { recognizedLands, unknownCards } = parseDecklist(text);

  if (unknownCards.length === 0 && recognizedLands.length === 0) {
    parseStatus.textContent = "No cards detected. Check the format (e.g. \"4 Lightning Helix\").";
    return;
  }

  parseStatus.textContent = `Fetching data for ${unknownCards.length} cards from Scryfall...`;

  parsedSpells = [];
  parsedFixedLands = [];
  let fetched = 0;

  for (const card of unknownCards) {
    const data = await fetchCardData(card.name);
    fetched++;
    parseStatus.textContent = `Scryfall: ${fetched} / ${unknownCards.length}`;

    if (data) {
      if (data.type_line && data.type_line.includes("Land")) {
        const colors = data.produced_mana || [];
        parsedFixedLands.push({
          qty: card.qty,
          name: card.name,
          land: {
            name: card.name,
            type: "fixedland",
            colors: colors,
            untapped: true
          }
        });
      } else {
        let manaCost = data.mana_cost;
        if (!manaCost && data.card_faces) manaCost = data.card_faces[0].mana_cost;
        if (manaCost) {
          parsedSpells.push({
            qty: card.qty,
            name: card.name,
            manaCost: manaCost,
            cmc: data.cmc || 0,
          });
        }
      }
    }
    await sleep(SCRYFALL_DELAY_MS);
  }

  let statusMsg = `${parsedSpells.length} spells, ${parsedFixedLands.length} fixed lands detected.`;
  if (recognizedLands.length > 0) {
    const totalRec = recognizedLands.reduce((s, l) => s + l.qty, 0);
    statusMsg += ` (Ignored ${totalRec} recognized lands).`;
  }
  parseStatus.textContent = statusMsg;

  renderReviewTable(parsedFixedLands);
  reviewSection.classList.remove("hidden");
  configSection.classList.remove("hidden");
  optimizeCta.classList.remove("hidden");
}

/* ── Step 2: Review table ── */
function renderReviewTable(fixedLands) {
  const container = document.getElementById("reviewTable");
  const summary = document.getElementById("reviewSummary");

  if (fixedLands.length === 0) {
    summary.textContent = "No known lands found in the decklist. All land slots will be optimized.";
    container.innerHTML = "";
    return;
  }

  const totalFixed = fixedLands.reduce((s, l) => s + l.qty, 0);
  summary.textContent = `${fixedLands.length} land types (${totalFixed} copies) detected. These will be kept fixed — the optimizer fills the remaining slots.`;

  let html = '<div class="review-grid">';
  html += '<div class="review-header">Land</div>';
  html += '<div class="review-header">Colors</div>';
  html += '<div class="review-header">Type</div>';
  html += '<div class="review-header review-header-right">Qty</div>';

  const WUBRG_ORDER = ["W", "U", "B", "R", "G"];

  for (const entry of fixedLands) {
    const pips = [...entry.land.colors]
      .sort((a, b) => {
        return WUBRG_ORDER.indexOf(a.toUpperCase()) - WUBRG_ORDER.indexOf(b.toUpperCase());
      })
      .map((c) => `<span class="pip pip-${c.toLowerCase()}"></span>`)
      .join("");

    const typeLabel = TYPE_LABELS[entry.land.type] || entry.land.type;

    html += `<div class="review-cell review-name">${entry.name}</div>`;
    html += `<div class="review-cell review-pips">${pips}</div>`;
    html += `<div class="review-cell review-type">${typeLabel}</div>`;
    html += `<div class="review-cell review-qty">${entry.qty}</div>`;
  }
  html += "</div>";
  container.innerHTML = html;
}

/* ── Step 3: Optimize ── */
async function calculate() {
  await allLandsReady;
  const btn = document.getElementById("calcBtn");
  const status = document.getElementById("status");
  const results = document.getElementById("results");
  const landCount = parseInt(document.getElementById("landCount").value, 10) || 24;

  results.innerHTML = "";

  if (parsedSpells.length === 0) {
    results.innerHTML = '<div class="error">No spells detected. Parse a decklist first.</div>';
    return;
  }

  btn.disabled = true;
  setStatus(status, "Computing Karsten requirements…");

  const cardData = parsedSpells;

  if (cardData.length === 0) {
    results.innerHTML = '<div class="error">Could not fetch card data from Scryfall. Check your connection.</div>';
    btn.disabled = false;
    setStatus(status, "");
    return;
  }

  setStatus(status, "Computing Karsten requirements…");

  try {
    const requirements = computeColorRequirements(cardData, landCount);
    const { sources: fixedSources, totalCount: fixedCount } = computeFixedSources(parsedFixedLands);
    const remainingSlots = Math.max(0, landCount - fixedCount);
    const availableLands = getAvailableLands(selectedTypes);

    const manaBases = await generateManaBases(
      availableLands,
      requirements,
      remainingSlots,
      fixedSources,
    );

    const isFallback = manaBases.some(mb => mb.isFallback);
    let fallbackWarning = "";
    if (isFallback) {
        fallbackWarning = '<div class="warning" style="font-size: 13px; color: #e0a960; padding: 10px 14px; background: rgba(224, 169, 96, 0.1); border: 0.5px solid rgba(224, 169, 96, 0.3); border-radius: var(--radius-md); margin-bottom: 1rem;">⚠️ Python optimization server not available. Falling back to the constructive heuristic approach.</div>';
    }

    results.innerHTML =
      fallbackWarning +
      renderRequirements(requirements, landCount, cardData.length, fixedSources) +
      renderManaBases(manaBases, requirements, parsedFixedLands);
  } catch (e) {
    results.innerHTML = '<div class="error">An error occurred during optimization.</div>';
  } finally {
    setStatus(status, "");
    btn.disabled = false;
  }
}

/* ── Helpers ── */
function setStatus(el, text) {
  el.textContent = text;
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ── Render: Karsten requirements block ── */
function renderRequirements(req, landCount, cardCount, fixedSources) {
  const activeColors = ["W", "U", "B", "R", "G"].filter((c) => req[c] > 0);
  if (activeColors.length === 0) return "";

  const cards = activeColors
    .map((c) => {
      const fixed = fixedSources[c] || 0;
      const fixedNote = fixed > 0 ? `<div class="req-fixed">${fixed} fixed</div>` : "";
      return `
    <div class="color-req-card has-${c.toLowerCase()}">
      <div class="needed">${req[c]}</div>
      <div class="req-label">${COLOR_NAMES[c]}</div>
      ${fixedNote}
    </div>`;
    })
    .join("");

  return `
    <div class="card" style="margin-bottom:1rem;">
      <p class="section-label">Required sources — Karsten method</p>
      <div class="color-reqs">${cards}</div>
      <p class="analysis-note">${cardCount} cards analyzed · ${landCount} lands · Standard 60 cards</p>
    </div>`;
}

/* ── Render: all mana bases ── */
function renderManaBases(manaBases, requirements, fixedLands) {
  if (manaBases.length === 0) {
    return '<div class="error">Could not generate a mana base. Check the selected land types.</div>';
  }

  let html = '<p class="section-label" style="margin-bottom:10px;">Proposed mana bases</p>';
  manaBases.forEach((mb, i) => {
    html += renderOneBase(mb, i, requirements, fixedLands);
  });
  return html;
}

/* ── Render: one mana base ── */
function renderOneBase(mb, rank, requirements, fixedLands) {
  const activeColors = ["W", "U", "B", "R", "G"].filter(
    (c) => requirements[c] > 0,
  );

  // Merge fixed + optimized sources for display
  const { sources: fixedSources } = computeFixedSources(fixedLands);
  const totalSources = {};
  for (const c of activeColors) {
    totalSources[c] = (mb.sources[c] || 0) + (fixedSources[c] || 0);
  }

  const satisfied = activeColors.filter(
    (c) => totalSources[c] >= requirements[c],
  ).length;
  const isBest = rank === 0;
  const badge = isBest
    ? '<span class="badge badge-best">Optimal</span>'
    : `<span class="badge badge-alt">${mb.name}</span>`;

  // Fixed lands section
  let fixedRows = "";
  if (fixedLands.length > 0) {
    fixedRows = fixedLands
      .map(({ name, qty, land }) => {
        const pips = land.colors
          .map((c) => `<span class="pip pip-${c.toLowerCase()}"></span>`)
          .join("");
        return `
        <div class="land-row land-row-fixed">
          <span class="land-name">${name} <span class="fixed-tag">fixed</span></span>
          <div class="land-meta">
            <div class="land-pips">${pips}</div>
            <span class="land-count">×${qty}</span>
          </div>
        </div>`;
      })
      .join("");
  }

  // Optimized lands
  const landRows = Object.entries(mb.allocation)
    .filter(([, v]) => v > 0)
    .map(([name, count]) => {
      const land = ALL_LANDS.find((l) => l.name === name);
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

  const totalLands =
    fixedLands.reduce((s, l) => s + l.qty, 0) +
    Object.values(mb.allocation).reduce((s, v) => s + v, 0);

  const sourceChecks = activeColors
    .map((c) => {
      const ok = totalSources[c] >= requirements[c];
      return `
      <span class="source-check">
        <span class="pip pip-${c.toLowerCase()}"></span>
        <span class="check-val">${totalSources[c]}/${requirements[c]}</span>
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
          <div class="score-detail">${satisfied}/${activeColors.length} colors satisfied · ${totalLands} lands</div>
        </div>
        ${badge}
      </div>
      <div class="land-list">${fixedRows}${landRows}</div>
      <div class="source-check-row">${sourceChecks}</div>
    </div>`;
}

/* ── Launch ── */
initToggles();
