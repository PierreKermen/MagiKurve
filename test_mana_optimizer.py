"""Tests for mana_optimizer.create_manabase with fixed_sources support."""

import pytest

from mana_optimizer import create_manabase


@pytest.fixture()
def basic_pool():
    """Pool with basics + Azorius duals + a triome."""
    return [
        {"name": "Plains", "type": "basicland", "colors": ["W"]},
        {"name": "Island", "type": "basicland", "colors": ["U"]},
        {"name": "Mountain", "type": "basicland", "colors": ["R"]},
        {
            "name": "Hallowed Fountain",
            "type": "shockland",
            "colors": ["W", "U"],
            "untapped": True,
        },
        {
            "name": "Meticulous Archive",
            "type": "surveilland",
            "colors": ["W", "U"],
            "untapped": False,
        }
    ]


def test_total_land_count_matches(basic_pool: list[dict]) -> None:
    """The solver should allocate exactly the requested number of lands."""
    result = create_manabase(
        basic_pool,
        {"W": 14, "U": 14, "B": 0, "R": 0, "G": 0},
        24,
        {},
    )
    assert "error" not in result
    assert sum(result["allocation"].values()) == 24


def test_nonbasics_capped_at_four(basic_pool: list[dict]) -> None:
    """Non-basic lands must not exceed 4 copies."""
    result = create_manabase(
        basic_pool,
        {"W": 20, "U": 20, "B": 0, "R": 0, "G": 0},
        24,
        {},
    )
    assert result["allocation"].get("Hallowed Fountain", 0) <= 4
    assert result["allocation"].get("Meticulous Archive", 0) <= 4


def test_strategy_prefers_untapped(basic_pool: list[dict]) -> None:
    """Aggro strategy should avoid tapped lands when alternatives exist."""
    result = create_manabase(
        basic_pool,
        {"W": 10, "U": 10, "R": 2, "B": 0, "G": 0},
        24,
        {"preferUntapped": True},
    )
    assert result["allocation"].get("Meticulous Archive", 0) == 0


def test_fixed_sources_reduce_effective_requirements(basic_pool: list[dict]) -> None:
    """Fixed sources should reduce the pressure on the solver.

    If requirements are W:14, U:14 and fixed lands already provide
    W:4, U:4, the solver only needs to cover W:10, U:10 in 20 slots.
    """
    result_without = create_manabase(
        basic_pool,
        {"W": 14, "U": 14, "B": 0, "R": 0, "G": 0},
        24,
        {},
        fixed_sources=None,
    )
    result_with = create_manabase(
        basic_pool,
        {"W": 14, "U": 14, "B": 0, "R": 0, "G": 0},
        20,
        {},
        fixed_sources={"W": 4, "U": 4, "B": 0, "R": 0, "G": 0},
    )

    assert "error" not in result_with
    assert sum(result_with["allocation"].values()) == 20

    # With 4 fewer slots but 4 fixed sources each, solver should still cover.
    total_w = result_with["sources"]["W"] + 4
    total_u = result_with["sources"]["U"] + 4
    assert total_w >= 14
    assert total_u >= 14


def test_fully_fixed_means_zero_remaining() -> None:
    """When all requirements are met by fixed lands, solver fills 0 slots."""
    pool = [{"name": "Plains", "type": "basicland", "colors": ["W"]}]
    result = create_manabase(
        pool,
        {"W": 14, "U": 0, "B": 0, "R": 0, "G": 0},
        0,
        {},
        fixed_sources={"W": 14, "U": 0, "B": 0, "R": 0, "G": 0},
    )
    assert "error" not in result
    assert sum(result["allocation"].values()) == 0


def test_lexicographic_maximizes_duals(basic_pool: list[dict]) -> None:
    """High dual requirements should maximize Hallowed Fountain + Meticulous Archive."""
    result = create_manabase(
        basic_pool,
        {"W": 18, "U": 18, "B": 0, "R": 0, "G": 0},
        24,
        {"preferUntapped": True},
    )
    assert "error" not in result
    assert result["allocation"].get("Hallowed Fountain") == 4
    assert result["allocation"].get("Meticulous Archive") == 4
