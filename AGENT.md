# MagiKurve Agent Guidelines

## 🎯 Project Goals

**MagiKurve** is a web-based optimization tool designed to calculate the perfect mana base for a Magic: The Gathering Standard 60-card deck. It uses the mathematical method popularized by **Frank Karsten** combined with a powerful **Constraint Programming (CP-SAT)** model to recommend the best mix of lands.

### Current Roadmap & Planned Features
Based on our current GitHub issues, the focus areas include:
- **Format Expansion**: Adding Commander format support (#6).
- **Data Automation**: Automating format-legal lands and land type calculations (#4, #5).
- **Advanced Modeling**: Handling mana dorks/rocks (#15), land edge cases (#14), and heterogeneous costs (#13).
- **Optimization Improvements**: Enhancing the base CP model (#12) and the frontend heuristic optimizer (#7).

## 🏗️ Architecture overview

MagiKurve operates as a hybrid application:
1. **Vanilla JS Frontend**: A lightweight, fast client that handles decklist parsing, UI, and external data fetching.
2. **Python CP-SAT Backend**: A local optimization engine that models the mana base as a Constraint Programming problem.

### Key Files & Components

#### 🐍 Backend (Python)
- **`mana_optimizer.py`**: The core OR-Tools CP-SAT model. It runs three lexicographic optimization phases: minimizing maximum color deviation, minimizing overall missing sources, and minimizing disruption (e.g., tapped lands vs untapped, basic vs triome).
- **`bridge.py`**: A lightweight local `http.server` that exposes the `create_manabase` function to the frontend via a `POST /optimize` endpoint.

#### 🌐 Frontend (HTML/JS/CSS)
- **`index.html` & `style.css`**: The main interface, styled with a dark MTG-themed aesthetic.
- **`optimizer.js`**: The brain of the client. Parses text decklists, interfaces with the Scryfall API (respecting rate limits), and calls the Python bridge. Includes a fallback heuristic JS builder if the local server is down.
- **`karsten.js`**: Implements Frank Karsten's hypergeometric probability tables and lookup logic.
- **`data.js`**: Static database of available standard lands.
- **`ui.js`**: Handles DOM manipulation and user events.

## 📝 Coding Guidelines & Style

### General Quality
- **Conciseness**: Keep functions under 40 lines. Follow the Single Responsibility Principle.
- **No Dead Code**: Remove all `console.log()`, `print()`, and debugging artifacts before submitting PRs.
- **Refactoring**: If you see duplicated logic, extract it into a shared utility.

### Constraint Programming (CP) Rules
- Always use explicit string names for variables and constraints to ease debugging.
- Separate variable definitions, constraints, and objective functions logically.
- When debugging, use `solver.parameters.log_search_progress = True` to catch infeasibility early.

### Python Style
- **Type Annotations**: Enforce PEP 484 type hints on all function signatures.
- **Docstrings**: Use Google-style docstrings for public functions.
- **Tooling**: Use `uv` for dependencies. Use `ruff` for linting and formatting. Use `pytest` for tests.

### JavaScript Style
- **Vanilla JS**: No heavy frameworks (React/Vue) unless strictly necessary.
- **Async/Await**: Preferred over raw Promises. 
- **External APIs**: Always respect external rate limits (e.g., the 80ms delay for Scryfall in `optimizer.js`).
- **Data Structures**: Prefer modern ES6+ structures like `Set` and `Map` for data deduplication and frequency mapping.

## Test decklists

### Simple Mono colored deck

4 Earthbender Ascension
4 Mightform Harmonizer
4 Esper Origins
1 Archdruid's Charm
2 Meltstrider's Resolve
1 Royal Treatment
4 Sazh's Chocobo
2 Mossborn Hydra
4 Icetill Explorer
4 Llanowar Elves
4 Badgermole Cub
24 Forest

This one does not require other lands, but could also be use to test the integrations of mana dorks.

### Complex colored deck

2x Authority of the Consuls
4x Day of Judgment
1x Demolition Field
1x Emeritus of Ideation
4x Erode
4x Flow State
4x Great Hall of the Biblioplex
4x Hallowed Fountain
1x Island
4x Lightning Helix
4x Meticulous Archive
1x Mountain
4x No More Lies
1x Petrified Hamlet
1x Plains
4x Price of Freedom
1x Restless Anchorage
2x Seam Rip
2x Stock Up
4x Stormcarved Coast
2x Sundown Pass
2x Three Steps Ahead
3x Wan Shi Tong, Librarian

Sideboard:
4x Exorcise
3x Ghost Vacuum

This deck is more complex due to the number of colors and the need to produce multiple colors of mana. It also includes lands that enter the battlefield tapped, which need to be accounted for in the optimization. It also includes lands that can produce multiple colors of mana depending on the gamestate. It also include cards with non trivial mana costs that could be manually overide. Finally, it also encompass a test sideboard to not mix up the maindeck and sideboard.
