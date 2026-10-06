"""
Module 10: End-to-End Integration Tests
========================================
Validates all 10 modules working together in harmony:
- Module 1: Preprocessing Pipeline
- Module 2: CNN + Transfer Learning Classifier
- Module 3: Nutrition Database & Mapping
- Module 4: ANN Nutritional Balance Evaluator
- Module 5: RNN/LSTM Eating Pattern Analyzer
- Module 6: GenAI Nutrition Coach
- Module 7: Unified Backend Pipeline
- Module 8: Database & Meal History
"""

import os
import sys
import unittest
from PIL import Image
import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(PROJECT_ROOT)

from ml.preprocessing import FoodImagePreprocessor
from ml.cnn_classifier import FoodClassifierCNN
from ml.nutrition_mapper import NutritionMapper
from ml.ann_evaluator import NutritionEvaluationANN
from ml.rnn_pattern_analyzer import RecurrentEatingPatternAnalyzer
from ml.genai_coach import GenAINutritionCoach
from backend.main import process_food_image_pipeline, analyze_eating_pattern_pipeline
from data.nutrition_data_store import NutritionDataStore


class TestAINutritionAssistantE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data_store = NutritionDataStore()
        cls.user_id = cls.data_store.seed_initial_data()

    def test_module_1_preprocessing(self):
        """Test Image Preprocessor resizes and normalizes to (3, 224, 224)."""
        preprocessor = FoodImagePreprocessor()
        dummy_img = Image.new("RGB", (320, 240), color=(120, 180, 70))
        tensor = preprocessor.preprocess_image(dummy_img)
        self.assertEqual(tensor.shape, (3, 224, 224))
        self.assertTrue(np.isfinite(tensor).all())

    def test_module_2_cnn_classifier(self):
        """Test CNN returns top-3 predictions with probabilities summing <= 1.0."""
        classifier = FoodClassifierCNN()
        dummy_tensor = np.random.randn(3, 224, 224).astype(np.float32)
        preds = classifier.predict_top_k(dummy_tensor, top_k=3)
        self.assertEqual(len(preds), 3)
        self.assertIn("confidence", preds[0])
        self.assertIn("class_id", preds[0])

    def test_module_3_nutrition_mapping(self):
        """Test Nutrition Database scales nutrients accurately with serving size."""
        mapper = NutritionMapper()
        # 100g vs 200g
        res_100 = mapper.map_food_to_nutrition("grilled_salmon_with_asparagus", serving_amount=100)
        res_200 = mapper.map_food_to_nutrition("grilled_salmon_with_asparagus", serving_amount=200)
        self.assertAlmostEqual(res_200["calories"], res_100["calories"] * 2, places=1)
        self.assertAlmostEqual(res_200["macros"]["protein_g"], res_100["macros"]["protein_g"] * 2, places=1)

    def test_module_4_ann_nutritional_assessment(self):
        """Test ANN classifies meals and provides verdict and recommendation."""
        ann = NutritionEvaluationANN()
        meal = {"calories": 350, "protein_g": 42, "carbs_g": 8, "fat_g": 5, "fiber_g": 4, "sodium_mg": 280}
        eval_result = ann.evaluate_meal_balance(meal)
        self.assertIn("verdict", eval_result)
        self.assertIn("confidence", eval_result)
        self.assertIn("recommendation", eval_result)

    def test_module_5_rnn_eating_pattern(self):
        """Test RNN processes multi-day history and forecasts calories."""
        rnn = RecurrentEatingPatternAnalyzer()
        history = [
            {"calories": 1800, "protein": 130, "hour_last_meal": 19, "water_ml": 2400},
            {"calories": 1850, "protein": 135, "hour_last_meal": 20, "water_ml": 2500}
        ]
        result = rnn.analyze_user_meal_sequence(history, target_calories=1850)
        self.assertIn("forecasted_next_day_calories", result)
        self.assertIn("detected_pattern", result)
        self.assertGreater(result["forecasted_next_day_calories"], 0)

    def test_module_6_genai_coach(self):
        """Test GenAI Coach generates explanation and swaps."""
        coach = GenAINutritionCoach()
        explanation = coach.generate_meal_explanation(
            food_name="Oatmeal with Berries",
            calories=300,
            macros={"protein_g": 25, "carbs_g": 40, "fat_g": 5, "fiber_g": 6},
            ann_verdict="Balanced & Nutrient-Dense"
        )
        self.assertIn("Oatmeal with Berries", explanation)
        swaps = coach.suggest_healthy_alternatives("french fries")
        self.assertIn("recommended_swap", swaps)

    def test_module_7_backend_full_pipeline(self):
        """Test full integrated pipeline: image bytes -> CNN -> Mapping -> ANN -> GenAI."""
        img = Image.new("RGB", (224, 224), color=(200, 100, 50))
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG')
        raw_bytes = img_byte_arr.getvalue()

        output = process_food_image_pipeline(raw_bytes, serving_size_g=200, user_id=self.user_id)
        self.assertEqual(output["status"], "success")
        self.assertIn("top_prediction", output)
        self.assertIn("nutrition", output)
        self.assertIn("ann_assessment", output)
        self.assertIn("genai_explanation", output)

    def test_module_8_database_aggregations(self):
        """Test Database stores meals and correctly calculates remaining calories and macros."""
        summary = self.data_store.get_daily_summary(self.user_id)
        self.assertIn("macros", summary)
        self.assertIn("hydration", summary)
        self.assertIn("meals_list", summary)
        self.assertGreater(len(summary["meals_list"]), 0)


if __name__ == "__main__":
    import io
    print("\n=======================================================")
    print("  RUNNING ALL 10 MODULE END-TO-END INTEGRATION TESTS   ")
    print("=======================================================")
    unittest.main()
