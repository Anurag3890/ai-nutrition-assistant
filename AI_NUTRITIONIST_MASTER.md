# AI Nutritionist Assistant: Master Data & Code Registry

This dedicated master file organizes and catalogs all the **data schemas, storage definitions, and codebase modules** for both the **mobile app** and **website**.

---

## 1. Centralized Data Architecture

All nutrition, macro, micro, hydration, biometric, and AI consultation data is unified under a single relational model compatible with **SQLite** (local embedded) and **PostgreSQL** (production cloud).

### Master Data Locations
- **SQL Schema Definition:** [`data/nutrition_schema.sql`](file:///Users/anuraganand/Desktop/bkl/data/nutrition_schema.sql)
- **Data Access & Calculations Layer:** [`data/nutrition_data_store.py`](file:///Users/anuraganand/Desktop/bkl/data/nutrition_data_store.py)
- **Live SQLite Database:** [`data/nutrition_master.db`](file:///Users/anuraganand/Desktop/bkl/data/nutrition_master.db)
- **Data Dictionary (JSON):** [`data/nutrition_dictionary.json`](file:///Users/anuraganand/Desktop/bkl/data/nutrition_dictionary.json)

---

## 2. Tracked Data Specification ("Everything About Your Nutrition")

| Category | Entities & Tables | Tracked Metrics & Attributes |
| :--- | :--- | :--- |
| **User Profile & Targets** | `users` | Age, biological sex, height, weight, activity level multiplier (1.2x - 1.9x), BMR, TDEE, primary goals (fat loss, muscle gain, maintenance), allergies, dietary preferences (keto, vegan, etc.), calculated targets (calories, protein, carbs, fats, fiber, water, sodium cap). |
| **Meal Intake Logging** | `meal_logs` | Meal slot (Breakfast, Lunch, Dinner, Snacks), timestamps, food name, portion weight/unit, total kcal, protein (g), carbohydrates (total, net, fiber, sugars), fats (saturated, unsaturated), sodium. |
| **Micronutrients** | `meal_logs.micronutrients_json` & `food_items` | Potassium, Calcium, Iron, Magnesium, Zinc, Vitamin A, Vitamin C, Vitamin D, Vitamin B12, Folate, Glycemic Index. |
| **Hydration** | `water_logs` | Precise timestamps, milliliter volume (e.g. 250ml, 500ml), beverage category (pure water, electrolytes, herbal tea, coffee). |
| **Biometrics & Wellness** | `biometric_logs` | Daily body weight (kg), body fat %, sleep duration (hours), sleep quality (1-10), daily energy level (1-10), gut/digestive health (bloating, acid reflux, normal). |
| **Exercise & Calorie Burn** | `activity_logs` | Activity type, duration, heart rate, calories burned (deducted or factored into net TDEE). |
| **AI Nutritionist Conversations** | `ai_consultations` | Session IDs, user queries, AI responses, recommendation tags (`meal_critique`, `recipe_suggestion`, `deficiency_warning`, `macro_adjustment`). |
| **AI Meal Plans & Recipes** | `meal_plans` | AI-generated daily/weekly meal schedules, grocery lists, macro splits, and step-by-step cooking instructions. |

---

## 3. Dedicated Website Code (`web/`)

The website provides an analytics dashboard, live meal diary, hydration widget, and interactive AI consultation panel.

### File Manifest:
1. [`web/index.html`](file:///Users/anuraganand/Desktop/bkl/web/index.html):
   - **Dashboard Hero:** 4 visual macro cards (Calories remaining, Protein target, Carbs, Fats) with animated progress bars.
   - **Meal Diary:** Categorized meal lists (Breakfast, Lunch, Dinner, Snacks) with calories, protein, carbs, and fat breakdown per item.
   - **Hydration Tracker:** Quick-add water buttons (+250ml, +500ml, +750ml, reset).
   - **AI Nutritionist Coach Panel:** Real-time conversational interface with prompt chips for instant meal analysis, dinner suggestions, and micronutrient checks.
   - **Micronutrient Card:** Displays daily totals for Potassium, Calcium, Iron, and Vitamin C.
   - **Food Logger Modal:** Dynamic modal for adding meals with calorie and macro fields.

2. [`web/styles.css`](file:///Users/anuraganand/Desktop/bkl/web/styles.css):
   - Modern layout using CSS Grid and Flexbox.
   - Color-coded macronutrient indicators (Emerald green for calories, Blue for protein, Amber for carbs, Red for fats, Cyan for water).
   - Fully responsive for desktop, tablet, and mobile browsers.

3. [`web/app.js`](file:///Users/anuraganand/Desktop/bkl/web/app.js):
   - Reactive state manager for user targets, logged meals, hydration levels, and AI conversation history.
   - Automatic re-computation of remaining macros and progress bars.
   - AI response generator and prompt handler.

---

## 4. Dedicated Mobile App Code (`app/`)

The mobile application is built with **React Native / Expo** for on-the-go tracking, camera food scanning, and real-time coaching.

### File Manifest:
1. [`app/App.js`](file:///Users/anuraganand/Desktop/bkl/app/App.js):
   - **Home Tab:** Mobile macro budget card, remaining calorie badge, protein/carbs/fat pills, water logger, and scrollable meal cards.
   - **Camera Scanner Tab:** AI Food Lens interface for capturing plate photos and auto-extracting calorie and macro estimates.
   - **AI Coach Tab:** Conversational interface for real-time dietary advice and meal feedback.
   - **Quick-Log Modal:** Slide-up modal for logging food with instant feedback.
   - **Bottom Navigation Bar:** Tab navigation between Today, Scanner, and AI Coach.

2. [`app/package.json`](file:///Users/anuraganand/Desktop/bkl/app/package.json):
   - Configured for Expo and React Native with standard runtime scripts.

---

## 5. Dedicated Backend API & AI Engine (`backend/`)

Bridges the data storage layer with both client interfaces and provides AI intelligence.

### File Manifest:
1. [`backend/main.py`](file:///Users/anuraganand/Desktop/bkl/backend/main.py):
   - **FastAPI REST Service** with CORS support.
   - **Endpoints:**
     - `GET /api/summary/{user_id}`: Aggregated daily calories, macros, hydration, and meal lists.
     - `POST /api/meals/log`: Validates and saves food logs.
     - `POST /api/water/log`: Increments daily hydration.
     - `POST /api/biometrics/log`: Stores daily weight, sleep, and symptoms.
     - `POST /api/ai/chat`: AI Nutritionist conversation endpoint with context-aware macro analysis.
     - `POST /api/ai/analyze-plate`: Computer vision plate breakdown (detects foods, weights, macros).
   - Mounts the `web/` directory at `/web` for serving the dashboard.

2. [`backend/requirements.txt`](file:///Users/anuraganand/Desktop/bkl/backend/requirements.txt):
   - Core dependencies (`fastapi`, `uvicorn`, `pydantic`).

---

## 6. Verification and Quick Run

- **Inspect Database:** Run `python3 data/nutrition_data_store.py` in your terminal to verify SQLite schema creation and demo data seeding.
- **Open Website:** Open [`web/index.html`](file:///Users/anuraganand/Desktop/bkl/web/index.html) in your browser.
