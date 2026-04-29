"""Mana base optimizer using OR-Tools CP-SAT with lexicographic objectives."""

import json
import sys

from ortools.sat.python import cp_model


COLORS = ["W", "U", "B", "R", "G"]


def create_manabase(
    available_lands: list[dict],
    requirements: dict[str, int],
    total_lands: int,
    strategy: dict,
    fixed_sources: dict[str, int] | None = None,
) -> dict:
    """Builds an optimal mana base via three-phase lexicographic CP-SAT.

    Args:
        available_lands: Pool of lands the solver can pick from.
        requirements: Karsten source requirements per color (full, before deductions).
        total_lands: Number of land slots to fill (already excluding fixed lands).
        strategy: Dict with optional keys 'preferUntapped', etc.
        fixed_sources: Sources already provided by fixed (user-locked) lands.

    Returns:
        Dict with 'allocation' and 'sources', or 'error' on failure.
    """
    if fixed_sources is None:
        fixed_sources = {c: 0 for c in COLORS}

    # Effective requirements = Karsten target minus what fixed lands provide
    effective_req = {
        c: max(0, requirements.get(c, 0) - fixed_sources.get(c, 0))
        for c in COLORS
    }

    model = cp_model.CpModel()

    # 1. Variables: count of each land (basics uncapped, others ≤ 4)
    land_vars = {}
    for i, land in enumerate(available_lands):
        is_basic = land.get("type") in ("basic", "basicland")
        limit = total_lands if is_basic else 4
        land_vars[i] = model.new_int_var(0, limit, f"land_{i}")

    # 2. Total lands constraint
    model.add(sum(land_vars.values()) == total_lands)

    # 3. Sources per color
    sources = {
        c: model.new_int_var(0, total_lands, f"source_{c}") for c in COLORS
    }
    for color in COLORS:
        contributions = [
            land_vars[i]
            for i, land in enumerate(available_lands)
            if color in land.get("colors", [])
        ]
        model.add(sources[color] == sum(contributions))

    # 4. Gaps per color (how many sources still missing vs effective requirement)
    gaps = {
        c: model.new_int_var(0, total_lands, f"gap_{c}") for c in COLORS
    }
    for color in COLORS:
        model.add(gaps[color] >= effective_req[color] - sources[color])

    solver = cp_model.CpSolver()

    # --- Phase 1: Minimize maximum gap across all colors ---
    max_gap = model.new_int_var(0, total_lands, "max_gap")
    model.add_max_equality(max_gap, [gaps[c] for c in COLORS])
    model.minimize(max_gap)

    status = solver.solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {"error": "Phase 1 optimization failed"}
    model.add(max_gap <= int(solver.value(max_gap)))

    # --- Phase 2: Minimize total missing sources ---
    model.minimize(sum(gaps[c] for c in COLORS))
    status = solver.solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {"error": "Phase 2 optimization failed"}
    model.add(
        sum(gaps[c] for c in COLORS)
        <= sum(int(solver.value(gaps[c])) for c in COLORS)
    )

    # --- Phase 3: Minimize disruption cost (strategy preferences) ---
    costs = []
    for i, land in enumerate(available_lands):
        cost = 0
        if strategy.get("preferUntapped") and not land.get("untapped", False):
            cost += 10
        if land.get("type") in ("basic", "basicland"):
            cost -= 1
        costs.append(land_vars[i] * cost)

    disruption = model.new_int_var(
        -total_lands * 100, total_lands * 100, "disruption"
    )
    model.add(disruption == sum(costs))
    model.minimize(disruption)

    status = solver.solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {"error": "Phase 3 optimization failed"}

    # Extract solution
    allocation = {}
    final_sources = {c: 0 for c in COLORS}
    for i, land in enumerate(available_lands):
        count = int(solver.value(land_vars[i]))
        if count > 0:
            allocation[land["name"]] = count
            for color in land.get("colors", []):
                final_sources[color] += count

    return {"allocation": allocation, "sources": final_sources}


if __name__ == "__main__":
    try:
        input_data = json.load(sys.stdin)
        result = create_manabase(
            input_data["available_lands"],
            input_data["requirements"],
            input_data["total_lands"],
            input_data["strategy"],
            input_data.get("fixed_sources"),
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
