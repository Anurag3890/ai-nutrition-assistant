-- ==============================================================================
-- AI NUTRITIONIST ASSISTANT - MASTER DATABASE SCHEMA
-- Compatible with SQLite & PostgreSQL
-- Tracks comprehensive nutrition, meals, macros, micros, biometrics, and AI logs
-- ==============================================================================

-- 1. USERS & NUTRITION TARGETS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    phone_number TEXT UNIQUE,
    password_hash TEXT,
    full_name TEXT,
    age INTEGER,
    sex TEXT CHECK(sex IN ('male', 'female', 'other')),
    height_cm REAL,
    current_weight_kg REAL,
    target_weight_kg REAL,
    activity_level TEXT CHECK(activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),
    primary_goal TEXT CHECK(primary_goal IN ('fat_loss', 'muscle_gain', 'maintenance', 'athletic_performance', 'metabolic_health', 'general_wellness')),
    dietary_preference TEXT CHECK(dietary_preference IN ('omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'mediterranean', 'low_carb', 'custom')),
    allergies TEXT,                       -- Comma-separated or JSON list (e.g. 'peanuts,gluten,dairy')
    medical_conditions TEXT,              -- Comma-separated or JSON list (e.g. 'type2_diabetes,pcos')
    
    -- Daily Targets
    daily_calorie_target REAL DEFAULT 2000.0,
    daily_protein_target_g REAL DEFAULT 150.0,
    daily_carbs_target_g REAL DEFAULT 200.0,
    daily_fat_target_g REAL DEFAULT 65.0,
    daily_fiber_target_g REAL DEFAULT 30.0,
    daily_water_target_ml REAL DEFAULT 2500.0,
    daily_sodium_max_mg REAL DEFAULT 2300.0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. FOOD ITEMS & NUTRITIONAL REFERENCE LIBRARY
CREATE TABLE IF NOT EXISTS food_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT DEFAULT 'Generic',
    category TEXT,                         -- e.g. 'Produce', 'Poultry', 'Grains', 'Dairy'
    serving_size REAL NOT NULL DEFAULT 100,
    serving_unit TEXT NOT NULL DEFAULT 'g',-- 'g', 'ml', 'oz', 'cup', 'piece'
    
    -- Caloric & Macronutrient Breakdown (per serving)
    calories REAL NOT NULL,
    protein_g REAL NOT NULL DEFAULT 0.0,
    carbs_total_g REAL NOT NULL DEFAULT 0.0,
    carbs_net_g REAL DEFAULT 0.0,
    fiber_g REAL DEFAULT 0.0,
    sugar_g REAL DEFAULT 0.0,
    added_sugar_g REAL DEFAULT 0.0,
    fat_total_g REAL NOT NULL DEFAULT 0.0,
    fat_saturated_g REAL DEFAULT 0.0,
    fat_monounsaturated_g REAL DEFAULT 0.0,
    fat_polyunsaturated_g REAL DEFAULT 0.0,
    trans_fat_g REAL DEFAULT 0.0,
    cholesterol_mg REAL DEFAULT 0.0,
    
    -- Key Micronutrients (Minerals & Electrolytes)
    sodium_mg REAL DEFAULT 0.0,
    potassium_mg REAL DEFAULT 0.0,
    calcium_mg REAL DEFAULT 0.0,
    iron_mg REAL DEFAULT 0.0,
    magnesium_mg REAL DEFAULT 0.0,
    zinc_mg REAL DEFAULT 0.0,
    
    -- Vitamins
    vitamin_a_mcg REAL DEFAULT 0.0,
    vitamin_c_mg REAL DEFAULT 0.0,
    vitamin_d_iu REAL DEFAULT 0.0,
    vitamin_e_mg REAL DEFAULT 0.0,
    vitamin_k_mcg REAL DEFAULT 0.0,
    vitamin_b12_mcg REAL DEFAULT 0.0,
    folate_mcg REAL DEFAULT 0.0,
    
    glycemic_index INTEGER,
    barcode TEXT,
    is_custom INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. MEAL INTAKE LOGS (Daily tracking)
CREATE TABLE IF NOT EXISTS meal_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    log_date DATE NOT NULL,               -- Format: YYYY-MM-DD
    log_time TIME NOT NULL,               -- Format: HH:MM:SS
    meal_type TEXT CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'morning_snack', 'afternoon_snack', 'evening_snack', 'pre_workout', 'post_workout')) NOT NULL,
    food_item_id TEXT,
    food_name TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1.0,   -- Serving multiplier
    serving_unit TEXT NOT NULL DEFAULT 'serving',
    
    -- Calculated nutrition for this specific logged portion
    calories REAL NOT NULL,
    protein_g REAL NOT NULL DEFAULT 0.0,
    carbs_g REAL NOT NULL DEFAULT 0.0,
    fat_g REAL NOT NULL DEFAULT 0.0,
    fiber_g REAL DEFAULT 0.0,
    sugar_g REAL DEFAULT 0.0,
    sodium_mg REAL DEFAULT 0.0,
    
    -- Micronutrient breakdown in JSON format for flexibility
    micronutrients_json TEXT,             -- Stores {"potassium_mg": 350, "iron_mg": 2.5, "vitamin_c_mg": 15}
    
    -- AI Analysis Metadata
    photo_url TEXT,
    ai_confidence_score REAL,
    ai_analysis_summary TEXT,             -- e.g. "Estimated 150g grilled salmon with 100g steamed broccoli"
    user_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(food_item_id) REFERENCES food_items(id) ON DELETE SET NULL
);

-- 4. HYDRATION TRACKING LOGS
CREATE TABLE IF NOT EXISTS water_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    log_date DATE NOT NULL,
    log_time TIME NOT NULL,
    amount_ml REAL NOT NULL,
    beverage_type TEXT DEFAULT 'water',    -- 'water', 'herbal_tea', 'electrolyte_drink', 'black_coffee'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. DAILY BIOMETRICS & HEALTH SYMPTOMS LOGS
CREATE TABLE IF NOT EXISTS biometric_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    log_date DATE NOT NULL,
    weight_kg REAL,
    body_fat_pct REAL,
    muscle_mass_kg REAL,
    waist_circumference_cm REAL,
    blood_glucose_fasting_mg_dl REAL,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    energy_level INTEGER CHECK(energy_level BETWEEN 1 AND 10),
    hunger_level INTEGER CHECK(hunger_level BETWEEN 1 AND 10),
    sleep_hours REAL,
    sleep_quality INTEGER CHECK(sleep_quality BETWEEN 1 AND 10),
    digestive_symptoms TEXT,              -- 'normal', 'bloated', 'acid_reflux', 'cramping'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, log_date),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. EXERCISE & ACTIVITY BURNT CALORIES
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    log_date DATE NOT NULL,
    log_time TIME,
    activity_name TEXT NOT NULL,          -- 'Running', 'Weightlifting', 'HIIT', 'Walking'
    duration_minutes REAL NOT NULL,
    calories_burned REAL NOT NULL,
    heart_rate_avg INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. AI NUTRITIONIST ASSISTANT CHAT & RECOMMENDATION LOGS
CREATE TABLE IF NOT EXISTS ai_consultations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sender TEXT CHECK(sender IN ('user', 'assistant')) NOT NULL,
    message_text TEXT NOT NULL,
    recommendation_type TEXT,             -- 'meal_critique', 'recipe_suggestion', 'macro_adjustment', 'deficiency_warning', 'general_qna'
    extracted_meal_data_json TEXT,        -- Structured JSON if user shared food in conversation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. AI GENERATED MEAL PLANS & RECIPES
CREATE TABLE IF NOT EXISTS meal_plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    goal_description TEXT,
    start_date DATE,
    end_date DATE,
    daily_calories_target REAL,
    protein_target_g REAL,
    carbs_target_g REAL,
    fat_target_g REAL,
    plan_details_json TEXT NOT NULL,      -- Full structured plan (Breakfast, Lunch, Dinner, Snacks recipe details)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for lightning fast queries across web and mobile
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_biometrics_user_date ON biometric_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_ai_consultations_user_session ON ai_consultations(user_id, session_id);
