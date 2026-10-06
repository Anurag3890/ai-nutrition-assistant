# 🥗 NutriAI - Complete AI Nutritionist Assistant System

A full-stack, production-ready AI Nutritionist Assistant designed for both a **mobile app** and a **web application**, backed by a unified **data storage layer** and an **AI engine**.

---

## 🗂️ Project Organization

```text
bkl/
├── 📄 AI_NUTRITIONIST_MASTER.md   # Master reference cataloging all data, schemas & codes
├── 📄 PROJECT_ARCHITECTURE.md     # Architecture blueprint & ecosystem design
│
├── 📁 data/                       # DEDICATED DATA STORAGE LAYER
│   ├── nutrition_schema.sql       # SQL database schema (SQLite & PostgreSQL compatible)
│   ├── nutrition_data_store.py    # Python SQLite storage engine (BMR, TDEE, macros, logs)
│   ├── nutrition_master.db        # Live SQLite database file
│   └── nutrition_dictionary.json  # Comprehensive data dictionary for all metrics
│
├── 📁 web/                        # DEDICATED WEBSITE CODE
│   ├── index.html                 # Modern responsive web dashboard
│   ├── styles.css                 # Clean CSS with macro rings, cards & chat styling
│   └── app.js                     # State management, macro calculator & AI chat logic
│
├── 📁 app/                        # DEDICATED MOBILE APP CODE
│   ├── App.js                     # React Native / Expo mobile application
│   └── package.json               # Mobile app dependencies & configuration
│
└── 📁 backend/                    # AI NUTRITIONIST API & ENGINE
    ├── main.py                    # FastAPI server & AI reasoning endpoints
    └── requirements.txt           # Python dependencies (FastAPI, Uvicorn, Pydantic)
```

---

## 📊 What Does It Track? ("Everything About Your Nutrition")

1. **Daily Caloric & Energy Balance**: Consumed calories, target calories, deficit/surplus, BMR & TDEE calculation (Mifflin-St Jeor).
2. **Macronutrients**: Protein, Carbohydrates (Total, Net, Fiber, Sugars), and Fats (Saturated, Unsaturated, Trans).
3. **Micronutrients**: Potassium, Calcium, Iron, Magnesium, Zinc, Vitamin C, Vitamin D, Vitamin B12, Folate, and Sodium limits.
4. **Hydration**: Precise water and electrolyte logging with quick-add presets.
5. **Meals by Type**: Breakfast, Lunch, Dinner, Morning/Afternoon Snacks, and Pre/Post-workout meals.
6. **AI Vision & Plate Analysis**: Image detection metadata, ingredient recognition, portion estimation.
7. **AI Nutritionist Coach**: Real-time conversational guidance, dietary critique, and dynamic meal plan recommendations.
8. **Daily Biometrics & Symptoms**: Body weight, body fat %, sleep hours/quality, energy level (1-10), and gut digestion symptoms.

---

## 🚀 How to Run

### 1. View the Website Immediately
You can open [`web/index.html`](file:///Users/anuraganand/Desktop/bkl/web/index.html) directly in any web browser, or launch a quick local server:
```bash
# In the project directory:
python3 -m http.server 3000 --directory web
```
Then visit: `http://localhost:3000`

### 2. Test the Data Storage Engine
Test the database initialization, sample data seeding, and daily macro calculations:
```bash
python3 data/nutrition_data_store.py
```

### 3. Run the Backend API (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python3 main.py
```
- API Docs: `http://localhost:8000/docs`
- Unified Web UI: `http://localhost:8000/web`

### 4. Run the Mobile App (React Native / Expo)
```bash
cd app
npm install
npx expo start
```
