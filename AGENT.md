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