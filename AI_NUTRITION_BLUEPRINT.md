# 🥗 AI Nutrition Assistant — Complete 10-Module System Blueprint

This document specifies the exact implementation of the **10 core modules** that power the AI Nutrition Assistant.

---

## 📋 Direct Mapping to the 10 System Modules

| # | Module / Subsystem | Key Responsibility | Implementation File(s) | Status |
|---|---|---|---|:---:|
| **1** | **Food Dataset & Preprocessing** | Image cleaning, deduplication (perceptual MD5), resizing (224x224), normalization (ImageNet mean/std), data augmentation, train/val/test split. | [`ml/preprocessing.py`](file:///Users/anuraganand/Desktop/bkl/ml/preprocessing.py) | ✅ Ready |
| **2** | **CNN + Transfer Learning** | MobileNetV2 / ResNet50 transfer learning backbone, fine-tuned food classification head, evaluation metrics (Accuracy, Precision, Recall, F1, Confusion Matrix), inference function. | [`ml/cnn_classifier.py`](file:///Users/anuraganand/Desktop/bkl/ml/cnn_classifier.py) | ✅ Ready |
| **3** | **Nutrition Database & Mapping** | Structured nutrition database (USDA FDC, Open Food Facts), maps predicted food to calories, macros & micros, dynamic serving size scaling. | [`ml/nutrition_mapper.py`](file:///Users/anuraganand/Desktop/bkl/ml/nutrition_mapper.py)<br>[`data/food_database.json`](file:///Users/anuraganand/Desktop/bkl/data/food_database.json) | ✅ Ready |
| **4** | **ANN Nutritional Analysis** | Feedforward Artificial Neural Network trained with backpropagation; classifies meal nutritional balance (Balanced, High-Calorie, High-Fat, Low-Fiber, Adequate-Protein). | [`ml/ann_evaluator.py`](file:///Users/anuraganand/Desktop/bkl/ml/ann_evaluator.py) | ✅ Ready |
| **5** | **RNN / LSTM Eating Pattern Analysis** | Sequential time-series analysis over meal sequences and multi-day history; predicts eating pattern archetypes and forecasts next-day calorie trend. | [`ml/rnn_pattern_analyzer.py`](file:///Users/anuraganand/Desktop/bkl/ml/rnn_pattern_analyzer.py) | ✅ Ready |
| **6** | **GenAI Nutrition Coach** | Prompt-engineered LLM coach; provides empathetic, scientific explanations for meals, suggests healthier food swaps, answers questions, and compiles weekly reports. | [`ml/genai_coach.py`](file:///Users/anuraganand/Desktop/bkl/ml/genai_coach.py) | ✅ Ready |
| **7** | **Backend & REST API** | FastAPI backend exposing REST endpoints; integrates all 6 ML engines with the database; handles request validation, errors, and OpenAPI docs. | [`backend/main.py`](file:///Users/anuraganand/Desktop/bkl/backend/main.py)<br>[`backend/requirements.txt`](file:///Users/anuraganand/Desktop/bkl/backend/requirements.txt) | ✅ Ready |
| **8** | **Database & Meal History** | SQLite/PostgreSQL schema for users, meals, hydration, biometrics, and AI chat logs; Mifflin-St Jeor BMR/TDEE calculation; daily/weekly aggregations. | [`data/nutrition_schema.sql`](file:///Users/anuraganand/Desktop/bkl/data/nutrition_schema.sql)<br>[`data/nutrition_data_store.py`](file:///Users/anuraganand/Desktop/bkl/data/nutrition_data_store.py)<br>[`data/nutrition_master.db`](file:///Users/anuraganand/Desktop/bkl/data/nutrition_master.db) | ✅ Ready |
| **9** | **Frontend & Dashboard** | User interface featuring drag-and-drop food image scanning, live CNN confidence & ANN verdict pills, RNN eating rhythm forecast meter, meal diary, and GenAI coach chat. | [`web/index.html`](file:///Users/anuraganand/Desktop/bkl/web/index.html)<br>[`web/styles.css`](file:///Users/anuraganand/Desktop/bkl/web/styles.css)<br>[`web/app.js`](file:///Users/anuraganand/Desktop/bkl/web/app.js) | ✅ Ready |
| **10** | **Integration, Testing & Deployment** | End-to-end test suite (`test_e2e.py`) validating all 10 modules working together; Dockerfile & Docker Compose deployment pipeline. | [`tests/test_e2e.py`](file:///Users/anuraganand/Desktop/bkl/tests/test_e2e.py)<br>[`Dockerfile`](file:///Users/anuraganand/Desktop/bkl/Dockerfile)<br>[`docker-compose.yml`](file:///Users/anuraganand/Desktop/bkl/docker-compose.yml) | ✅ Ready |

---

## 🔄 End-to-End Execution Flow

```text
[User Uploads Meal Photo]
         │
         ▼
[Module 1: Preprocessing] ── (Resize 224x224, Normalize with ImageNet mean/std)
         │
         ▼
[Module 2: CNN Classifier] ── (MobileNetV2 outputs: "Grilled Salmon with Asparagus", 95% Conf)
         │
         ▼
[Module 3: Nutrition Database] ── (Maps to 330 kcal, 41g Protein, 5g Carbs, 17g Fat, 480 IU Vit D)
         │
         ▼
[Module 4: ANN Evaluator] ── (Backprop ANN classifies: "Adequate-Protein Power", 89% Conf)
         │
         ▼
[Module 6: GenAI Coach] ── (Explains impact on user's Fat Loss goal & suggests alternatives)
         │
         ▼
[Module 7 & 8: API & Database] ── (Saves to meal_logs table, updates remaining macros in DB)
         │
         ▼
[Module 5: RNN Pattern Analyzer] ── (Analyzes multi-day cadence, forecasts tomorrow's calorie budget)
         │
         ▼
[Module 9: Dashboard Web UI] ── (Displays live macro rings, food item in diary, and coach advice)
```

---

## 🚀 Commands to Run & Verify

1. **Run End-to-End Integration Tests (All 10 Modules):**
   ```bash
   python3 tests/test_e2e.py
   ```

2. **Open Web Dashboard in Browser:**
   ```bash
   python3 -m http.server 3000 --directory web
   # Open http://localhost:3000 in your browser
   ```

3. **Run Full AI Backend Server:**
   ```bash
   python3 backend/main.py
   ```
