import json
import sys
import os
import csv
from ortools.sat.python import cp_model

def create_manabase(available_lands, requirements, total_lands, strategy):
    """
    Optimized mana base generator using OR-Tools CP-SAT with lexicographic objectives
    """
    model = cp_model.CpModel()
    colors = ["W", "U", "B", "R", "G"]
    
    # 1. Variables: Number of each land type
    land_vars = {}
    for i, land in enumerate(available_lands):
        is_basic = land.get('type') == 'basicland'
        limit = total_lands if is_basic else 4
        land_vars[i] = model.new_int_var(0, limit, f"land_{i}")
        
    # 2. Constraint: Total number of lands
    model.add(sum(land_vars.values()) == total_lands)
    
    # 3. Sources per color
    sources = {color: model.new_int_var(0, total_lands, f"source_{color}") for color in colors}
    for color in colors:
        color_contribution = []
        for i, land in enumerate(available_lands):
            if color in land.get('colors', []):
                color_contribution.append(land_vars[i])
        model.add(sources[color] == sum(color_contribution))
        
    # 4. Gaps (lexicographic priority 1 & 2)
    gaps = {color: model.new_int_var(0, total_lands, f"gap_{color}") for color in colors}
    for color in colors:
        model.add(gaps[color] >= requirements.get(color, 0) - sources[color])

    # --- Phase 1: Minimize Maximum Deviation ---
    max_gap = model.new_int_var(0, total_lands, "max_gap")
    model.add_max_equality(max_gap, [gaps[c] for c in colors])
    model.minimize(max_gap)
    solver = cp_model.CpSolver()
    status = solver.solve(model)
    if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        model.add(max_gap <= int(solver.value(max_gap)))
    else:
        return {"error": "Phase 1 optimization failed"}

    # --- Phase 2: Minimize Overall Missing Sources ---
    total_missing = model.new_int_var(0, total_lands * 5, "total_missing")
    model.add(total_missing == sum(gaps.values()))
    model.minimize(sum(gaps.values()))
    status = solver.solve(model)
    if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        model.add(sum(gaps.values()) <= sum(int(solver.value(gaps[color])) for color in colors))
    else:
        return {"error": "Phase 2 optimization failed"}

    # --- Phase 3: Minimize Disruptions --- Simplified linear aggregated version
    disruption_cost = model.new_int_var(-total_lands * 100, total_lands * 100, "disruption_cost")
    costs = []
    for i, land in enumerate(available_lands):
        land_cost = 0
        if strategy.get('preferUntapped') and not land.get('untapped', False):
            land_cost += 10
        if strategy.get('preferTriome') and land.get('type') != 'triland' and land.get('type') != 'basicland':
            land_cost += 5
        if land.get('type') == 'basicland':
            land_cost -= 1
        
        costs.append(land_vars[i] * land_cost)
    
    model.add(disruption_cost == sum(costs))
    model.minimize(disruption_cost)
    
    status = solver.solve(model)
    
    if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        allocation = {}
        final_sources = {c: 0 for c in colors}
        for i, land in enumerate(available_lands):
            count = int(solver.value(land_vars[i]))
            if count > 0:
                allocation[land['id']] = count
                for color in land.get('colors', []):
                    final_sources[color] += count
        
        return {
            "allocation": allocation,
            "sources": final_sources,
        }
    else:
        return {"error": "Final phase optimization failed"}

if __name__ == "__main__":
    try:
        input_data = json.load(sys.stdin)
        result = create_manabase(
            input_data['available_lands'],
            input_data['requirements'],
            input_data['total_lands'],
            input_data['strategy']
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
