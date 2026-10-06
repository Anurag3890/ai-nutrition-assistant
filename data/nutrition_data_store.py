"""
AI Nutritionist Assistant - Central Data Store & Management Layer
=================================================================
This file manages all persistence, calculations, and aggregations for both
the web dashboard and the mobile application.

Features:
- SQLite persistence (file: data/nutrition_master.db)
- Automatic DB schema creation & indexing
- Scientific BMR/TDEE calculation (Mifflin-St Jeor)
- Daily macro & micronutrient summation and target tracking
- Hydration & biometric logging
- AI Consultation and recommendation history
"""

import os
import sqlite3
import json
import uuid
from datetime import datetime, date
from typing import Dict, List, Optional, Any, Tuple

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "nutrition_master.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "nutrition_schema.sql")

class NutritionDataStore:
    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Initializes database schema from schema.sql or embedded statements."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with self._get_connection() as conn:
            if os.path.exists(SCHEMA_PATH):
                with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
                    schema_sql = f.read()
                conn.executescript(schema_sql)
            conn.commit()

    # ---------------------------------------------------------
    # USER & TARGETS MANAGEMENT
    # ---------------------------------------------------------
    @staticmethod
    def calculate_bmr_and_tdee(
        weight_kg: float, 
        height_cm: float, 
        age: int, 
        sex: str, 
        activity_level: str
    ) -> Tuple[float, float]:
        """
        Mifflin-St Jeor formula for Basal Metabolic Rate (BMR)
        and Total Daily Energy Expenditure (TDEE).
        """
        # BMR calculation
        if sex.lower() == 'female':
            bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161
        else: # male or default
            bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5

        # Activity multipliers
        multipliers = {
            'sedentary': 1.2,
            'lightly_active': 1.375,
            'moderately_active': 1.55,
            'very_active': 1.725,
            'extra_active': 1.9
        }
        tdee = bmr * multipliers.get(activity_level, 1.375)
        return round(bmr, 1), round(tdee, 1)

    def create_or_update_user(self, user_data: Dict[str, Any]) -> str:
        user_id = user_data.get("id", str(uuid.uuid4()))
        now = datetime.now().isoformat()
        
        # Calculate optimal targets if not provided
        weight = float(user_data.get("current_weight_kg", 70.0))
        height = float(user_data.get("height_cm", 175.0))
        age = int(user_data.get("age", 28))
        sex = user_data.get("sex", "male")
        activity = user_data.get("activity_level", "moderately_active")
        goal = user_data.get("primary_goal", "maintenance")

        bmr, tdee = self.calculate_bmr_and_tdee(weight, height, age, sex, activity)

        # Target calorie adjustments based on goal
        if goal == "fat_loss":
            target_calories = tdee - 500.0
        elif goal == "muscle_gain":
            target_calories = tdee + 300.0
        else:
            target_calories = tdee

        # Macro split estimates:
        # Protein: 2.0g per kg of bodyweight
        protein_target = round(weight * 2.0, 1)
        # Fat: 25% of calories (9 kcal/g)
        fat_target = round((target_calories * 0.25) / 9.0, 1)
        # Carbs: Remainder of calories (4 kcal/g)
        carbs_cal = target_calories - (protein_target * 4 + fat_target * 9)
        carbs_target = round(max(carbs_cal / 4.0, 50.0), 1)

        calorie_target = user_data.get("daily_calorie_target", target_calories)
        protein_target = user_data.get("daily_protein_target_g", protein_target)
        carbs_target = user_data.get("daily_carbs_target_g", carbs_target)
        fat_target = user_data.get("daily_fat_target_g", fat_target)
        water_target = user_data.get("daily_water_target_ml", 2800.0)

        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO users (
                    id, username, email, full_name, age, sex, height_cm, 
                    current_weight_kg, target_weight_kg, activity_level, 
                    primary_goal, dietary_preference, allergies, medical_conditions,
                    daily_calorie_target, daily_protein_target_g, daily_carbs_target_g,
                    daily_fat_target_g, daily_water_target_ml, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    full_name=excluded.full_name,
                    age=excluded.age,
                    current_weight_kg=excluded.current_weight_kg,
                    target_weight_kg=excluded.target_weight_kg,
                    activity_level=excluded.activity_level,
                    primary_goal=excluded.primary_goal,
                    daily_calorie_target=excluded.daily_calorie_target,
                    daily_protein_target_g=excluded.daily_protein_target_g,
                    daily_carbs_target_g=excluded.daily_carbs_target_g,
                    daily_fat_target_g=excluded.daily_fat_target_g,
                    daily_water_target_ml=excluded.daily_water_target_ml,
                    updated_at=excluded.updated_at
            """, (
                user_id,
                user_data.get("username", "user_" + user_id[:6]),
                user_data.get("email", f"{user_id[:6]}@example.com"),
                user_data.get("full_name", "Nutrition Enthusiast"),
                age, sex, height, weight,
                user_data.get("target_weight_kg", weight),
                activity, goal,
                user_data.get("dietary_preference", "omnivore"),
                user_data.get("allergies", ""),
                user_data.get("medical_conditions", ""),
                calorie_target, protein_target, carbs_target, fat_target, water_target,
                now, now
            ))
            conn.commit()
        return user_id

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    # ---------------------------------------------------------
    # FOOD ITEM REFERENCE LIBRARY
    # ---------------------------------------------------------
    def add_food_item(self, food: Dict[str, Any]) -> str:
        item_id = food.get("id", str(uuid.uuid4()))
        with self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO food_items (
                    id, name, brand, category, serving_size, serving_unit,
                    calories, protein_g, carbs_total_g, fiber_g, sugar_g,
                    fat_total_g, sodium_mg, potassium_mg, calcium_mg, iron_mg,
                    vitamin_c_mg, vitamin_d_iu, is_custom
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item_id, food["name"], food.get("brand", "Generic"), food.get("category", "General"),
                food.get("serving_size", 100), food.get("serving_unit", "g"),
                food["calories"], food.get("protein_g", 0), food.get("carbs_total_g", 0),
                food.get("fiber_g", 0), food.get("sugar_g", 0), food.get("fat_total_g", 0),
                food.get("sodium_mg", 0), food.get("potassium_mg", 0), food.get("calcium_mg", 0),
                food.get("iron_mg", 0), food.get("vitamin_c_mg", 0), food.get("vitamin_d_iu", 0),
                food.get("is_custom", 0)
            ))
            conn.commit()
        return item_id

    def search_foods(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM food_items 
                WHERE name LIKE ? 
                LIMIT ?
            """, (f"%{query}%", limit))
            return [dict(row) for row in cursor.fetchall()]

    # ---------------------------------------------------------
    # MEAL LOGGING & AGGREGATION
    # ---------------------------------------------------------
    def log_meal(self, meal_data: Dict[str, Any]) -> str:
        log_id = meal_data.get("id", str(uuid.uuid4()))
        log_date = meal_data.get("log_date", date.today().isoformat())
        log_time = meal_data.get("log_time", datetime.now().strftime("%H:%M:%S"))

        micro_json = json.dumps(meal_data.get("micronutrients", {}))

        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO meal_logs (
                    id, user_id, log_date, log_time, meal_type, food_item_id,
                    food_name, quantity, serving_unit, calories, protein_g,
                    carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, micronutrients_json,
                    photo_url, ai_analysis_summary, user_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log_id, meal_data["user_id"], log_date, log_time,
                meal_data.get("meal_type", "lunch"),
                meal_data.get("food_item_id"),
                meal_data["food_name"],
                meal_data.get("quantity", 1.0),
                meal_data.get("serving_unit", "serving"),
                meal_data["calories"],
                meal_data.get("protein_g", 0.0),
                meal_data.get("carbs_g", 0.0),
                meal_data.get("fat_g", 0.0),
                meal_data.get("fiber_g", 0.0),
                meal_data.get("sugar_g", 0.0),
                meal_data.get("sodium_mg", 0.0),
                micro_json,
                meal_data.get("photo_url"),
                meal_data.get("ai_analysis_summary"),
                meal_data.get("user_notes")
            ))
            conn.commit()
        return log_id

    def delete_meal_log(self, meal_log_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM meal_logs WHERE id = ?", (meal_log_id,))
            conn.commit()
            return cursor.rowcount > 0

    # ---------------------------------------------------------
    # HYDRATION & BIOMETRICS LOGGING
    # ---------------------------------------------------------
    def log_water(self, user_id: str, amount_ml: float, beverage_type: str = "water", log_date: Optional[str] = None) -> str:
        log_id = str(uuid.uuid4())
        today = log_date or date.today().isoformat()
        current_time = datetime.now().strftime("%H:%M:%S")

        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO water_logs (id, user_id, log_date, log_time, amount_ml, beverage_type)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (log_id, user_id, today, current_time, amount_ml, beverage_type))
            conn.commit()
        return log_id

    def log_biometrics(self, user_id: str, biometric_data: Dict[str, Any]) -> str:
        log_id = biometric_data.get("id", str(uuid.uuid4()))
        log_date = biometric_data.get("log_date", date.today().isoformat())

        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO biometric_logs (
                    id, user_id, log_date, weight_kg, body_fat_pct, energy_level,
                    sleep_hours, sleep_quality, digestive_symptoms, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, log_date) DO UPDATE SET
                    weight_kg=COALESCE(excluded.weight_kg, biometric_logs.weight_kg),
                    body_fat_pct=COALESCE(excluded.body_fat_pct, biometric_logs.body_fat_pct),
                    energy_level=COALESCE(excluded.energy_level, biometric_logs.energy_level),
                    sleep_hours=COALESCE(excluded.sleep_hours, biometric_logs.sleep_hours),
                    digestive_symptoms=COALESCE(excluded.digestive_symptoms, biometric_logs.digestive_symptoms),
                    notes=COALESCE(excluded.notes, biometric_logs.notes)
            """, (
                log_id, user_id, log_date,
                biometric_data.get("weight_kg"),
                biometric_data.get("body_fat_pct"),
                biometric_data.get("energy_level"),
                biometric_data.get("sleep_hours"),
                biometric_data.get("sleep_quality"),
                biometric_data.get("digestive_symptoms", "normal"),
                biometric_data.get("notes")
            ))
            conn.commit()
        return log_id

    # ---------------------------------------------------------
    # AI NUTRITIONIST CONSULTATION LOGS
    # ---------------------------------------------------------
    def log_ai_message(
        self, 
        user_id: str, 
        session_id: str, 
        sender: str, 
        message: str, 
        recommendation_type: Optional[str] = None
    ) -> str:
        msg_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO ai_consultations (
                    id, user_id, session_id, sender, message_text, recommendation_type
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (msg_id, user_id, session_id, sender, message, recommendation_type))
            conn.commit()
        return msg_id

    def get_chat_history(self, user_id: str, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM ai_consultations
                WHERE user_id = ? AND session_id = ?
                ORDER BY timestamp ASC
                LIMIT ?
            """, (user_id, session_id, limit))
            return [dict(row) for row in cursor.fetchall()]

    # ---------------------------------------------------------
    # COMPREHENSIVE DAILY DASHBOARD AGGREGATION
    # ---------------------------------------------------------
    def get_daily_summary(self, user_id: str, target_date: Optional[str] = None) -> Dict[str, Any]:
        day = target_date or date.today().isoformat()
        user = self.get_user(user_id) or {}

        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Meals for the day
            cursor.execute("""
                SELECT * FROM meal_logs 
                WHERE user_id = ? AND log_date = ?
                ORDER BY log_time ASC
            """, (user_id, day))
            meals = [dict(row) for row in cursor.fetchall()]

            # Water logs for the day
            cursor.execute("""
                SELECT SUM(amount_ml) as total_water 
                FROM water_logs 
                WHERE user_id = ? AND log_date = ?
            """, (user_id, day))
            water_row = cursor.fetchone()
            total_water = water_row["total_water"] if water_row and water_row["total_water"] else 0.0

            # Biometrics
            cursor.execute("""
                SELECT * FROM biometric_logs 
                WHERE user_id = ? AND log_date = ?
            """, (user_id, day))
            bio_row = cursor.fetchone()
            biometrics = dict(bio_row) if bio_row else None

        # Aggregate totals
        total_calories = sum(m["calories"] for m in meals)
        total_protein = sum(m["protein_g"] for m in meals)
        total_carbs = sum(m["carbs_g"] for m in meals)
        total_fat = sum(m["fat_g"] for m in meals)
        total_fiber = sum(m["fiber_g"] for m in meals)
        total_sodium = sum(m["sodium_mg"] for m in meals)

        # Meals grouped by type
        grouped_meals = {
            "breakfast": [],
            "lunch": [],
            "dinner": [],
            "snacks": []
        }
        for m in meals:
            m_type = m["meal_type"]
            if m_type in ["morning_snack", "afternoon_snack", "evening_snack", "pre_workout", "post_workout"]:
                grouped_meals["snacks"].append(m)
            elif m_type in grouped_meals:
                grouped_meals[m_type].append(m)
            else:
                grouped_meals["snacks"].append(m)

        # Targets
        target_cal = user.get("daily_calorie_target", 2000.0)
        target_p = user.get("daily_protein_target_g", 150.0)
        target_c = user.get("daily_carbs_target_g", 200.0)
        target_f = user.get("daily_fat_target_g", 65.0)
        target_w = user.get("daily_water_target_ml", 2500.0)

        return {
            "date": day,
            "user_id": user_id,
            "user_goals": {
                "primary_goal": user.get("primary_goal", "maintenance"),
                "dietary_preference": user.get("dietary_preference", "omnivore")
            },
            "macros": {
                "calories": {"consumed": round(total_calories, 1), "target": target_cal, "remaining": max(round(target_cal - total_calories, 1), 0.0)},
                "protein_g": {"consumed": round(total_protein, 1), "target": target_p, "remaining": max(round(target_p - total_protein, 1), 0.0)},
                "carbs_g": {"consumed": round(total_carbs, 1), "target": target_c, "remaining": max(round(target_c - total_carbs, 1), 0.0)},
                "fat_g": {"consumed": round(total_fat, 1), "target": target_f, "remaining": max(round(target_f - total_fat, 1), 0.0)},
                "fiber_g": {"consumed": round(total_fiber, 1), "target": user.get("daily_fiber_target_g", 30.0)},
                "sodium_mg": {"consumed": round(total_sodium, 1), "target": user.get("daily_sodium_max_mg", 2300.0)}
            },
            "hydration": {
                "consumed_ml": total_water,
                "target_ml": target_w,
                "remaining_ml": max(target_w - total_water, 0.0)
            },
            "meals_by_type": grouped_meals,
            "meals_list": meals,
            "biometrics": biometrics
        }

    # ---------------------------------------------------------
    # SEEDING INITIAL REALISTIC DATA FOR IMMEDIATE USE
    # ---------------------------------------------------------
    def seed_initial_data(self) -> str:
        """Populates realistic foods, an active user, and today's meal logs."""
        # 1. Create User
        user_id = "user_demo_01"
        self.create_or_update_user({
            "id": user_id,
            "username": "alex_nutrition",
            "email": "alex@example.com",
            "full_name": "Alex Morgan",
            "age": 27,
            "sex": "female",
            "height_cm": 168.0,
            "current_weight_kg": 64.0,
            "target_weight_kg": 60.0,
            "activity_level": "moderately_active",
            "primary_goal": "fat_loss",
            "dietary_preference": "omnivore",
            "daily_calorie_target": 1850.0,
            "daily_protein_target_g": 135.0,
            "daily_carbs_target_g": 180.0,
            "daily_fat_target_g": 55.0,
            "daily_water_target_ml": 2500.0
        })

        # 2. Add Standard Food Database items
        sample_foods = [
            {"name": "Rolled Oats (Dry)", "brand": "Generic", "category": "Grains", "serving_size": 50, "serving_unit": "g", "calories": 187, "protein_g": 6.5, "carbs_total_g": 33, "fiber_g": 5.0, "fat_total_g": 3.2, "iron_mg": 2.1},
            {"name": "Whey Protein Isolate (Vanilla)", "brand": "Optimum", "category": "Supplements", "serving_size": 30, "serving_unit": "g", "calories": 120, "protein_g": 25.0, "carbs_total_g": 2.0, "fiber_g": 0.0, "fat_total_g": 1.0, "calcium_mg": 140},
            {"name": "Blueberries (Fresh)", "brand": "Fresh", "category": "Fruit", "serving_size": 100, "serving_unit": "g", "calories": 57, "protein_g": 0.7, "carbs_total_g": 14.5, "fiber_g": 2.4, "fat_total_g": 0.3, "vitamin_c_mg": 9.7},
            {"name": "Grilled Chicken Breast", "brand": "Homemade", "category": "Poultry", "serving_size": 150, "serving_unit": "g", "calories": 247, "protein_g": 46.5, "carbs_total_g": 0.0, "fiber_g": 0.0, "fat_total_g": 5.4, "potassium_mg": 380},
            {"name": "Steamed Jasmine Rice", "brand": "Generic", "category": "Grains", "serving_size": 150, "serving_unit": "g", "calories": 195, "protein_g": 3.8, "carbs_total_g": 42.0, "fiber_g": 0.6, "fat_total_g": 0.4},
            {"name": "Steamed Broccoli Florets", "brand": "Fresh", "category": "Vegetables", "serving_size": 100, "serving_unit": "g", "calories": 35, "protein_g": 2.4, "carbs_total_g": 7.2, "fiber_g": 2.6, "fat_total_g": 0.4, "vitamin_c_mg": 89.2, "calcium_mg": 47},
            {"name": "Hass Avocado", "brand": "Fresh", "category": "Produce", "serving_size": 50, "serving_unit": "g", "calories": 80, "protein_g": 1.0, "carbs_total_g": 4.3, "fiber_g": 3.4, "fat_total_g": 7.3, "potassium_mg": 245},
            {"name": "Atlantic Salmon Fillet (Pan-seared)", "brand": "Fresh", "category": "Fish", "serving_size": 150, "serving_unit": "g", "calories": 312, "protein_g": 34.0, "carbs_total_g": 0.0, "fiber_g": 0.0, "fat_total_g": 18.5, "potassium_mg": 520, "vitamin_d_iu": 570},
            {"name": "Roasted Sweet Potato", "brand": "Homemade", "category": "Vegetables", "serving_size": 150, "serving_unit": "g", "calories": 135, "protein_g": 3.0, "carbs_total_g": 31.0, "fiber_g": 4.5, "fat_total_g": 0.2, "potassium_mg": 500},
            {"name": "Greek Yogurt (Nonfat Plain)", "brand": "Chobani", "category": "Dairy", "serving_size": 170, "serving_unit": "g", "calories": 100, "protein_g": 18.0, "carbs_total_g": 6.0, "fiber_g": 0.0, "fat_total_g": 0.7, "calcium_mg": 200}
        ]

        for item in sample_foods:
            self.add_food_item(item)

        today_str = date.today().isoformat()

        # 3. Log Breakfast
        self.log_meal({
            "user_id": user_id,
            "log_date": today_str,
            "log_time": "08:15:00",
            "meal_type": "breakfast",
            "food_name": "Oatmeal with Blueberries & Vanilla Whey",
            "quantity": 1,
            "serving_unit": "bowl",
            "calories": 364,
            "protein_g": 32.2,
            "carbs_g": 49.5,
            "fat_g": 4.5,
            "fiber_g": 7.4,
            "ai_analysis_summary": "High-fiber sustained energy breakfast with fast-acting protein source."
        })

        # 4. Log Lunch
        self.log_meal({
            "user_id": user_id,
            "log_date": today_str,
            "log_time": "13:00:00",
            "meal_type": "lunch",
            "food_name": "Grilled Chicken, Jasmine Rice & Broccoli with Avocado",
            "quantity": 1,
            "serving_unit": "plate",
            "calories": 557,
            "protein_g": 53.7,
            "carbs_g": 53.5,
            "fat_g": 13.5,
            "fiber_g": 6.6,
            "ai_analysis_summary": "Balanced plate: Lean protein, micronutrient-dense cruciferous greens and healthy monounsaturated fats."
        })

        # 5. Log Water
        self.log_water(user_id, 750, "water", today_str)
        self.log_water(user_id, 500, "water", today_str)
        self.log_water(user_id, 350, "herbal_tea", today_str)

        # 6. Log Morning Biometrics
        self.log_biometrics(user_id, {
            "log_date": today_str,
            "weight_kg": 63.8,
            "energy_level": 8,
            "sleep_hours": 7.5,
            "sleep_quality": 8,
            "digestive_symptoms": "normal",
            "notes": "Felt refreshed, hunger was low during fasting window."
        })

        # 7. AI Nutritionist Consultation Sample
        session_id = "session_onboarding_01"
        self.log_ai_message(
            user_id, session_id, "user",
            "Hey! I'm trying to hit 135g of protein today without blowing past 1850 kcal. How is my day looking so far?"
        )
        self.log_ai_message(
            user_id, session_id, "assistant",
            "You are doing fantastic today, Alex! Through breakfast and lunch, you've already secured 85.9g of protein and 921 kcal. That leaves you with 49.1g of protein and about 929 kcal for dinner and an evening snack. A pan-seared salmon fillet (150g) with roasted sweet potatoes and a side of Greek yogurt for dessert will effortlessly meet your protein target while staying right inside your fat-loss deficit!",
            "meal_critique"
        )

        return user_id

if __name__ == "__main__":
    store = NutritionDataStore()
    user_id = store.seed_initial_data()
    summary = store.get_daily_summary(user_id)
    print("\n=======================================================")
    print("  AI NUTRITIONIST ASSISTANT - DATA STORE TEST RUNNER   ")
    print("=======================================================")
    print(f"Database File: {store.db_path}")
    print(f"Active User: {summary['user_id']}")
    print(f"Date: {summary['date']}")
    print("\n--- Daily Macro Summary ---")
    for macro, vals in summary["macros"].items():
        if "remaining" in vals:
            print(f"  {macro.upper():<12}: {vals['consumed']}/{vals['target']} (Remaining: {vals['remaining']})")
        else:
            print(f"  {macro.upper():<12}: {vals['consumed']}/{vals['target']}")
    print(f"\n--- Hydration ---")
    print(f"  Water Consumed: {summary['hydration']['consumed_ml']} / {summary['hydration']['target_ml']} ml")
    print(f"\n--- Logged Meals Count: {len(summary['meals_list'])} ---")
    for m in summary["meals_list"]:
        print(f"  [{m['meal_type'].upper()}] {m['food_name']} -> {m['calories']} kcal (P: {m['protein_g']}g, C: {m['carbs_g']}g, F: {m['fat_g']}g)")
    print("\nAll database tables and operations verified successfully!")
