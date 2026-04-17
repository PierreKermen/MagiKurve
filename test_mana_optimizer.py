import unittest
from mana_optimizer import create_manabase

class TestManaOptimizerORTools(unittest.TestCase):
    def setUp(self):
        self.available_lands = [
            {"id": "plains", "name": "Plains", "type": "basicland", "colors": ["W"]},
            {"id": "island", "name": "Island", "type": "basicland", "colors": ["U"]},
            {"id": "mountain", "name": "Mountain", "type": "basicland", "colors": ["R"]},
            {"id": "hallowed_fountain", "name": "Hallowed Fountain", "type": "shockland", "colors": ["W", "U"], "untapped": True},
            {"id": "glacial_fortress", "name": "Glacial Fortress", "type": "checkland", "colors": ["W", "U"], "untapped": True},
            {"id": "raugrin_triome", "name": "Raugrin Triome", "type": "triome", "colors": ["W", "U", "R"], "untapped": False}
        ]

    def test_lexicographic_sources(self):
        # Requirements that are hard to meet: 18 W, 18 U in 24 lands
        requirements = {"W": 18, "U": 18, "B": 0, "R": 0, "G": 0}
        total_lands = 24
        strategy = {"preferUntapped": True}
        
        result = create_manabase(self.available_lands, requirements, total_lands, strategy)
        
        self.assertNotIn("error", result)
        # Should have 4 Hallowed Fountain and 4 Glacial Fortress to maximize duals
        self.assertEqual(result["allocation"].get("hallowed_fountain"), 4)
        self.assertEqual(result["allocation"].get("glacial_fortress"), 4)
        
        # Total lands should be exactly 24
        self.assertEqual(sum(result["allocation"].values()), 24)

    def test_strategy_untapped(self):
        # Prefer untapped should avoid Triome if possible
        requirements = {"W": 10, "U": 10, "R": 2, "B": 0, "G": 0}
        total_lands = 24
        strategy = {"preferUntapped": True}
        
        result = create_manabase(self.available_lands, requirements, total_lands, strategy)
        # Raugrin Triome is tapped, should be avoided if basics/duals can cover it
        self.assertEqual(result["allocation"].get("raugrin_triome", 0), 0)

    def test_strategy_triome(self):
        # Prefer triome should include Raugrin Triome
        requirements = {"W": 10, "U": 10, "R": 5, "B": 0, "G": 0}
        total_lands = 24
        strategy = {"preferTriome": True}
        
        result = create_manabase(self.available_lands, requirements, total_lands, strategy)
        self.assertGreater(result["allocation"].get("raugrin_triome", 0), 0)

    def test_max_4_limit(self):
        # Non-basics should be limited to 4
        requirements = {"W": 20, "U": 20, "B": 0, "R": 0, "G": 0}
        total_lands = 24
        strategy = {}
        
        result = create_manabase(self.available_lands, requirements, total_lands, strategy)
        self.assertLessEqual(result["allocation"].get("hallowed_fountain", 0), 4)
        self.assertLessEqual(result["allocation"].get("glacial_fortress", 0), 4)

if __name__ == "__main__":
    unittest.main()
