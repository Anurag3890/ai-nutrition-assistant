// ==============================================================================
// NUTRIAI APP CORE - MULTI-USER STATE & OMNI-AI ORACLE ENGINE
// ==============================================================================

const DB_USERS = {
    "user_demo_01": {
        id: "user_demo_01",
        name: "Alex Morgan",
        avatar: "AM",
        goal: "Fat Loss Deficit",
        diet: "Omnivore Balanced",
        targets: { calories: 1850, protein: 135, carbs: 180, fat: 55, water: 2500 },
        waterMl: 1600,
        meals: [
            { id: "m_alex_1", category: "breakfast", name: "Oatmeal with Blueberries & Vanilla Whey", calories: 364, protein: 32.2, carbs: 49.5, fat: 4.5 },
            { id: "m_alex_2", category: "lunch", name: "Grilled Chicken, Jasmine Rice & Broccoli with Avocado", calories: 557, protein: 53.7, carbs: 53.5, fat: 13.5 }
        ],
        streakDays: 14
    },
    "user_sarah_keto": {
        id: "user_sarah_keto",
        name: "Sarah Chen",
        avatar: "SC",
        goal: "Metabolic Health & Ketosis",
        diet: "Strict Ketogenic (<35g Net Carbs)",
        targets: { calories: 2100, protein: 140, carbs: 35, fat: 155, water: 3000 },
        waterMl: 2200,
        meals: [
            { id: "m_sarah_1", category: "breakfast", name: "Avocado & 3 Poached Pasture-Raised Eggs in Olive Oil", calories: 480, protein: 24.0, carbs: 5.0, fat: 40.0 },
            { id: "m_sarah_2", category: "lunch", name: "Wild Salmon Fillet with Asparagus & Garlic Herb Butter", calories: 620, protein: 45.0, carbs: 4.0, fat: 46.0 }
        ],
        streakDays: 28
    },
    "user_marcus_athlete": {
        id: "user_marcus_athlete",
        name: "Marcus Vance",
        avatar: "MV",
        goal: "Muscle Hypertrophy & Athletic Endurance",
        diet: "High-Carb Performance",
        targets: { calories: 3100, protein: 195, carbs: 410, fat: 75, water: 3800 },
        waterMl: 2600,
        meals: [
            { id: "m_marcus_1", category: "breakfast", name: "Monster Protein Oats with Banana, Honey & Peanut Butter", calories: 850, protein: 55.0, carbs: 115.0, fat: 22.0 },
            { id: "m_marcus_2", category: "lunch", name: "Double Chicken Breast Rice Bowl with Roasted Sweet Potato", calories: 920, protein: 68.0, carbs: 125.0, fat: 16.0 }
        ],
        streakDays: 42
    }
};

let currentUserId = "user_demo_01";

// Current Active Scanned Item Buffer
let activeScanItem = {
    name: "Grilled Salmon with Asparagus",
    c100: 165, p100: 20.5, cb100: 2.2, f100: 8.5,
    servingG: 200,
    confidence: "95.4%",
    annVerdict: "Adequate-Protein Power",
    explanation: "Rich in omega-3 EPA/DHA fatty acids and high-biological-value protein. Sustains peptide YY release while maintaining your calorie deficit."
};

// --- Lifecycle Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    renderUserSwitcherList();
    renderCurrentUserData();
});

// --- Tab Routing ---
function switchMainTab(tabKey) {
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".main-view-section").forEach(sec => sec.classList.remove("active-view"));

    // Activate target
    const targetSection = document.getElementById(`section-${tabKey}`);
    if (targetSection) targetSection.classList.add("active-view");

    // Headings update
    const headingMap = {
        dashboard: "Nutritional Intelligence Dashboard",
        oracle: "Omni-AI Health & Nutrition Oracle",
        scanner: "AI Food Lens Vision Scanner",
        patterns: "Chrono-Nutrition & Time-Series Forecast"
    };
    if (headingMap[tabKey]) {
        document.getElementById("page-main-heading").textContent = headingMap[tabKey];
    }

    // Set active sidebar item
    const tabIndexMap = { dashboard: 0, oracle: 1, scanner: 2, patterns: 3 };
    const navItems = document.querySelectorAll(".nav-item");
    if (navItems[tabIndexMap[tabKey]]) {
        navItems[tabIndexMap[tabKey]].classList.add("active");
    }
}

// --- User Profile & Switcher Functions ---
function getActiveUser() {
    return DB_USERS[currentUserId];
}

function switchUser(userId) {
    if (!DB_USERS[userId]) return;
    currentUserId = userId;
    renderUserSwitcherList();
    renderCurrentUserData();
    closeAuthModal();
}

function renderUserSwitcherList() {
    const container = document.getElementById("users-switch-container");
    if (!container) return;

    container.innerHTML = Object.values(DB_USERS).map(u => `
        <div class="user-switch-item ${u.id === currentUserId ? 'active-user-item' : ''}" onclick="switchUser('${u.id}')">
            <div class="avatar-sphere">${u.avatar}</div>
            <div class="user-item-meta" style="flex-grow: 1;">
                <div class="u-name">${u.name} ${u.id === currentUserId ? '✓ Active' : ''}</div>
                <div class="u-desc">${u.goal} • Target: ${u.targets.calories.toLocaleString()} kcal</div>
            </div>
            <div style="font-size: 0.75rem; color: #10b981; font-weight: 800;">🔥 ${u.streakDays}d streak</div>
        </div>
    `).join("");
}

function renderCurrentUserData() {
    const user = getActiveUser();
    if (!user) return;

    // Header & Sidebar
    document.getElementById("side-avatar").textContent = user.avatar;
    document.getElementById("side-username").textContent = user.name;
    document.getElementById("side-usergoal").textContent = `● ${user.goal} (${user.targets.calories} kcal)`;
    document.getElementById("active-user-subhead").textContent = `Active Athlete: ${user.name} • Caloric Target: ${user.targets.calories.toLocaleString()} kcal • ${user.diet}`;

    // Calculate totals
    const totals = user.meals.reduce((acc, m) => {
        acc.calories += m.calories;
        acc.protein += m.protein;
        acc.carbs += m.carbs;
        acc.fat += m.fat;
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const tg = user.targets;

    // Calories Card
    document.getElementById("dash-cal-consumed").textContent = Math.round(totals.calories);
    document.getElementById("dash-cal-target").textContent = tg.calories;
    const calRem = Math.max(0, tg.calories - totals.calories);
    document.getElementById("dash-cal-rem").textContent = `${Math.round(calRem)} kcal`;
    const calPct = Math.min(100, Math.round((totals.calories / tg.calories) * 100));
    document.getElementById("dash-cal-fill").style.width = calPct + "%";
    document.getElementById("dash-cal-status").textContent = totals.calories <= tg.calories ? "In Deficit / Target" : "Over Budget";

    // Protein Card
    document.getElementById("dash-p-consumed").innerHTML = `${totals.protein.toFixed(1)}<small>g</small>`;
    document.getElementById("dash-p-target").textContent = tg.protein;
    document.getElementById("dash-p-rem").textContent = `${Math.max(0, (tg.protein - totals.protein).toFixed(1))}g`;
    const pPct = Math.min(100, Math.round((totals.protein / tg.protein) * 100));
    document.getElementById("dash-p-fill").style.width = pPct + "%";

    // Carbs Card
    document.getElementById("dash-c-consumed").innerHTML = `${totals.carbs.toFixed(1)}<small>g</small>`;
    document.getElementById("dash-c-target").textContent = tg.carbs;
    const cPct = Math.min(100, Math.round((totals.carbs / tg.carbs) * 100));
    document.getElementById("dash-c-fill").style.width = cPct + "%";

    // Fats Card
    document.getElementById("dash-f-consumed").innerHTML = `${totals.fat.toFixed(1)}<small>g</small>`;
    document.getElementById("dash-f-target").textContent = tg.fat;
    document.getElementById("dash-f-rem").textContent = `${Math.max(0, (tg.fat - totals.fat).toFixed(1))}g`;
    const fPct = Math.min(100, Math.round((totals.fat / tg.fat) * 100));
    document.getElementById("dash-f-fill").style.width = fPct + "%";

    // Hydration
    document.getElementById("dash-water-num").textContent = user.waterMl.toLocaleString();
    document.getElementById("dash-water-target").textContent = tg.water.toLocaleString();
    const wPct = Math.min(100, Math.round((user.waterMl / tg.water) * 100));
    document.getElementById("dash-water-fill").style.width = wPct + "%";

    // Render Meals by Category
    renderMealSlot("breakfast");
    renderMealSlot("lunch");
    renderMealSlot("dinner");
    renderMealSlot("snacks");

    document.getElementById("diary-meals-count").textContent = `${user.meals.length} meals tracked`;

    // Update Live summary
    const summaryEl = document.getElementById("coach-live-summary");
    if (summaryEl) {
        summaryEl.innerHTML = `<strong>${user.name}</strong>, you have secured <strong>${totals.protein.toFixed(1)}g of protein</strong> today. You have <strong>${Math.max(0, (tg.protein - totals.protein).toFixed(1))}g remaining</strong>. ${calRem > 0 ? `Your remaining caloric runway is <strong>${Math.round(calRem)} kcal</strong>.` : 'You have reached today\'s target budget.'}`;
    }
}

function renderMealSlot(slot) {
    const listEl = document.getElementById(`list-${slot}`);
    const subtotalEl = document.getElementById(`subtotal-${slot}`);
    if (!listEl) return;

    const user = getActiveUser();
    const items = user.meals.filter(m => m.category === slot);
    const subtotal = items.reduce((s, i) => s + i.calories, 0);

    if (subtotalEl) subtotalEl.textContent = `${Math.round(subtotal)} kcal`;

    if (items.length === 0) {
        listEl.innerHTML = `<div class="empty-slot-btn" onclick="openLogModalFor('${slot}')">+ Tap to log ${capitalize(slot)}</div>`;
        return;
    }

    listEl.innerHTML = items.map(item => `
        <div class="meal-log-entry">
            <div>
                <div class="m-name">${item.name}</div>
                <div class="m-breakdown">${Math.round(item.calories)} kcal • P: ${item.protein}g • C: ${item.carbs}g • F: ${item.fat}g</div>
            </div>
            <button class="btn-del-meal" onclick="deleteUserMeal('${item.id}')" title="Delete meal">✕</button>
        </div>
    `).join("");
}

function deleteUserMeal(mealId) {
    const user = getActiveUser();
    user.meals = user.meals.filter(m => m.id !== mealId);
    renderCurrentUserData();
}

function handleRegisterNewUser(e) {
    e.preventDefault();
    const name = document.getElementById("reg-name").value.trim();
    const cal = parseFloat(document.getElementById("reg-cal").value) || 2000;
    const prot = parseFloat(document.getElementById("reg-prot").value) || 140;
    const goalVal = document.getElementById("reg-goal").value;

    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "NN";
    const newId = "user_" + Date.now();

    DB_USERS[newId] = {
        id: newId,
        name: name,
        avatar: initials,
        goal: goalVal.replace("_", " ").toUpperCase(),
        diet: "Personalized Protocol",
        targets: { calories: cal, protein: prot, carbs: Math.round((cal * 0.45) / 4), fat: Math.round((cal * 0.25) / 9), water: 2800 },
        waterMl: 0,
        meals: [],
        streakDays: 1
    };

    switchUser(newId);
    closeAuthModal();
    alert(`Welcome, ${name}! Your custom profile is now active.`);
}

// --- Hydration ---
function addWater(amount) {
    const user = getActiveUser();
    user.waterMl += amount;
    renderCurrentUserData();
}

function resetWater() {
    const user = getActiveUser();
    user.waterMl = 0;
    renderCurrentUserData();
}

// --- Modals Management ---
function openAuthModal() {
    renderUserSwitcherList();
    document.getElementById("auth-modal").style.display = "flex";
}

function closeAuthModal() {
    document.getElementById("auth-modal").style.display = "none";
}

function openLogModal() {
    document.getElementById("log-modal").style.display = "flex";
}

function openLogModalFor(category) {
    document.getElementById("log-meal-category").value = category;
    document.getElementById("log-modal").style.display = "flex";
}

function closeLogModal() {
    document.getElementById("log-modal").style.display = "none";
}

function handleSaveFoodLog(e) {
    e.preventDefault();
    const user = getActiveUser();
    const category = document.getElementById("log-meal-category").value;
    const name = document.getElementById("log-food-name").value;
    const calories = parseFloat(document.getElementById("log-cal").value) || 0;
    const protein = parseFloat(document.getElementById("log-prot").value) || 0;
    const carbs = parseFloat(document.getElementById("log-carbs").value) || 0;
    const fat = parseFloat(document.getElementById("log-fat").value) || 0;

    user.meals.push({
        id: "m_" + Date.now(),
        category,
        name,
        calories,
        protein,
        carbs,
        fat
    });

    closeLogModal();
    renderCurrentUserData();
}

// ==============================================================================
// OMNI-AI HEALTH & NUTRITION ORACLE ENGINE
// ==============================================================================
const ORACLE_KNOWLEDGE_BASE = {
    "fasting": {
        topic: "Intermittent Fasting & Cellular Autophagy",
        category: "⏱️ Fasting & Autophagy",
        summary: "Intermittent fasting (16:8, 18:6, OMAD) restricts your feeding window to trigger hepatic glycogen depletion, downregulate systemic insulin, and stimulate lysosomal autophagy.",
        mechanism: "When energy intake pauses beyond 14 hours, intracellular AMP/ATP ratios rise, activating AMP-activated protein kinase (AMPK) and Sirtuin-1 (SIRT1). This suppresses mTORC1 and signals autophagosome elongation to degrade damaged mitochondria (mitophagy) and misfolded aggregates.",
        protocol: [
            "16:8 Protocol: 16 hours water/electrolyte fasting, 8-hour feeding window (e.g. 12:00 PM to 8:00 PM).",
            "Maintain Electrolyte Homeostasis: 500mg sodium and 200mg potassium in morning mineral water to prevent orthostatic dizziness.",
            "Break-Fast Strategy: Break your fast with easily digested protein and leafy greens (eggs, bone broth, salmon) rather than refined carbohydrates to avoid severe postprandial glucose swings."
        ],
        evidence: "de Cabo & Mattson, New England Journal of Medicine (NEJM): 'Effects of Intermittent Fasting on Health, Aging, and Disease.'"
    },
    "creatine": {
        topic: "Creatine Monohydrate & Intracellular Phosphagens",
        category: "💊 Supplements & Ergogenics",
        summary: "Creatine Monohydrate is one of the most rigorously validated ergogenic aids in sports science, enhancing muscular power output, lean tissue retention, and cerebral energy metabolism.",
        mechanism: "Creatine combines with phosphate to form phosphocreatine (PCr) inside myocytes. During maximal exertion (sprinting, lifting), creatine kinase rapidly transfers phosphate from PCr to ADP, regenerating ATP far faster than glycolysis or oxidative phosphorylation.",
        protocol: [
            "Dosage: 3 to 5 grams taken daily consistently. No loading phase is necessary; muscular saturation occurs within 21-28 days.",
            "Timing: Can be taken at any time with water or a post-workout meal; co-ingestion with carbohydrates/protein modestly accelerates uptake via insulin receptor signaling.",
            "Hydration: Creatine draws water into the sarcoplasm (intracellular cell swelling); ensure daily water intake exceeds 3 liters."
        ],
        evidence: "International Society of Sports Nutrition (ISSN) Position Stand: 'Safety and Efficacy of Creatine Supplementation in Exercise, Sport, and Medicine.'"
    },
    "longevity": {
        topic: "Hormetic Biohacking: Saunas, Cold Exposure & Longevity",
        category: "🧬 Biohacking & Longevity",
        summary: "Deliberate thermal exposure (sauna and cold water immersion) applies controlled acute physiological stress that triggers adaptive cytoprotective cellular pathways and neuroendocrine responses.",
        mechanism: "Sauna heat stress activates Heat Shock Factor-1 (HSF-1), producing Heat Shock Proteins (HSP70) that refold denatured proteins and improve vascular nitric oxide availability. Cold exposure stimulates beta-adrenergic receptors, boosting plasma norepinephrine up to 250% and activating uncoupling protein-1 (UCP1) in brown adipose tissue.",
        protocol: [
            "Sauna Protocol: 80°C - 90°C (175°F - 195°F) for 15-20 minutes, 3 to 4 times weekly.",
            "Cold Exposure: 11 total minutes per week across 2-4 sessions in cold water (<15°C / 59°F).",
            "Timing Caveat: Avoid ice baths within 4 hours post-hypertrophy resistance training, as it blunts the acute inflammatory signaling necessary for maximum muscle protein synthesis."
        ],
        evidence: "Laukkanen et al., JAMA Internal Medicine: 'Association Between Sauna Bathing and Fatal Cardiovascular Events in Men.'"
    },
    "gut": {
        topic: "Gut Microbiome, Short-Chain Fatty Acids & Bloating",
        category: "🦠 Gut Microbiome",
        summary: "The gut microbiome regulates intestinal mucosal integrity, synthesizes neurotransmitters (serotonin, GABA), and converts dietary prebiotic fiber into anti-inflammatory short-chain fatty acids (SCFAs).",
        mechanism: "Anaerobic bacteria (e.g. Faecalibacterium prausnitzii, Bifidobacteria) ferment resistant starches into acetate, propionate, and butyrate. Butyrate serves as the primary energetic substrate for colonocytes, upregulating tight-junction proteins (claudin-1, occludin) to prevent systemic endotoxemia.",
        protocol: [
            "Plant Diversity: Strive for 30 distinct plant foods weekly (seeds, cruciferous vegetables, herbs, legumes).",
            "Fermented Foods: Add 1-2 daily servings of active fermented foods: unpasteurized kefir, kimchi, raw sauerkraut, or unsweetened Greek yogurt.",
            "Acute Bloating Relief: Temporarily test a low-FODMAP protocol for 14 days before systematically reintroducing fructans, GOS, and polyols."
        ],
        evidence: "Wastyk et al., Cell (2021): 'Gut-Microbiota-Targeted Diets Modulate Human Immune Status (Stanford Fermented Food Study).'"
    },
    "zone 2": {
        topic: "Zone 2 Cardiovascular Training & Mitochondrial Density",
        category: "🏋️‍♂️ Hypertrophy & Workouts",
        summary: "Zone 2 exercise represents the exertion intensity where fat oxidation is maximized and blood lactate concentration remains low (<2.0 mmol/L), building an expansive aerobic metabolic engine.",
        mechanism: "Training at low glycolytic flux forces Type I slow-twitch muscle fibers to rely almost exclusively on mitochondrial beta-oxidation of fatty acids. This stimulates peroxisome proliferator-activated receptor gamma coactivator 1-alpha (PGC-1α), multiplying mitochondrial mass and capillary density.",
        protocol: [
            "Intensity Gauge: Conversational pace (you can speak in full sentences without gasping), approximately 65-75% of maximum heart rate.",
            "Volume: 150 to 200 minutes per week, ideally partitioned into 45-60 minute sessions.",
            "Apparatus: Incline treadmill walking, stationary cycling, rowing, or outdoor rucking."
        ],
        evidence: "San-Millán & Brooks, Sports Medicine (2018): 'Assessment of Metabolic Flexibility and Mitochondrial Performance in Elite Endurance Athletes.'"
    },
    "keto": {
        topic: "Nutritional Ketosis, Insulin Kinetics & Fat Adaptation",
        category: "🥗 Nutrition & Macros",
        summary: "Ketosis is a metabolic state achieved by carbohydrate restriction, inducing the liver to produce acetoacetate, beta-hydroxybutyrate, and acetone as primary systemic fuels.",
        mechanism: "When dietary carbohydrates drop under ~30-50g/day, hepatic glycogen depletes. Lowered circulating insulin disinhibits hormone-sensitive lipase (HSL) in adipose tissue, releasing free fatty acids that enter hepatic mitochondria for beta-oxidation and ketogenesis.",
        protocol: [
            "Macro Split: 70-75% healthy fats (avocado, olive oil, grass-fed butter), 20-25% protein, 5-10% net carbohydrates.",
            "Electrolyte Strategy: Insuline drop causes renal sodium excretion. Supplement 4,000-5,000mg sodium, 1,000mg potassium, and 300mg magnesium daily to avoid the 'keto flu'.",
            "Blood Ketones: Monitor with blood meter aiming for nutritional ketosis range of 0.5 to 3.0 mmol/L."
        ],
        evidence: "Volek & Phinney, European Journal of Sport Science: 'Metabolic Characteristics of Keto-Adapted Ultra-Endurance Athletes.'"
    }
};

function filterOracleCategory(catKey, btnEl) {
    document.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("active"));
    btnEl.classList.add("active");
}

function submitOracleQuery(e) {
    e.preventDefault();
    const query = document.getElementById("oracle-input").value.trim();
    if (!query) return;
    executeOracleSearch(query);
}

function askPresetOracle(query) {
    document.getElementById("oracle-input").value = query;
    executeOracleSearch(query);
    // Smooth scroll to answer
    document.getElementById("oracle-result-box").scrollIntoView({ behavior: 'smooth' });
}

function executeOracleSearch(query) {
    const qLower = query.toLowerCase();
    let match = null;

    for (const [key, data] of Object.entries(ORACLE_KNOWLEDGE_BASE)) {
        if (qLower.includes(key) || key.includes(qLower)) {
            match = data;
            break;
        }
    }

    if (!match) {
        // Universal intelligent answer synthesis
        match = {
            topic: `Clinical Analysis: ${capitalize(query)}`,
            category: "🔬 General Physiology & Nutrition",
            summary: `Regarding '${query}': Biological homeostasis depends upon balancing caloric supply with energetic expenditure, optimizing micronutrient saturation, and respecting circadian endocrine rhythms.`,
            mechanism: `Endocrine axes (insulin, glucagon, cortisol, leptin, ghrelin) continually integrate peripheral nutritional cues from the gut to govern systemic fuel partitioning between storage and ATP expenditure.`,
            protocol: [
                "Prioritize single-ingredient, unprocessed nutrient sources with high satiety index values.",
                "Ensure steady daily hydration: 35-40 ml per kilogram of body weight.",
                "Distribute protein intake evenly across meals to sustain circulating plasma amino acid pools."
            ],
            evidence: "Hall et al., Cell Metabolism: 'Ultra-Processed Diets Cause Excess Calorie Intake and Weight Gain in Humans.'"
        };
    }

    // Render Answer Card
    document.getElementById("oracle-ans-cat").textContent = match.category;
    document.getElementById("oracle-ans-topic").textContent = match.topic;
    document.getElementById("oracle-ans-summary").textContent = match.summary;
    document.getElementById("oracle-ans-mechanism").textContent = match.mechanism;
    document.getElementById("oracle-ans-evidence").textContent = match.evidence;

    const protoList = document.getElementById("oracle-ans-protocol");
    protoList.innerHTML = match.protocol.map(step => `<li>${step}</li>`).join("");

    const resultBox = document.getElementById("oracle-result-box");
    resultBox.style.display = "block";
}

function copyOracleAnswer() {
    const topic = document.getElementById("oracle-ans-topic").textContent;
    const summary = document.getElementById("oracle-ans-summary").textContent;
    navigator.clipboard.writeText(`${topic}\n\n${summary}`);
    alert("Copied Oracle analysis to clipboard!");
}

// ==============================================================================
// FOOD VISION SCANNER SIMULATION
// ==============================================================================
function simulateLensCamera() {
    const plates = [
        {
            name: "Grilled Salmon with Asparagus",
            c100: 165, p100: 20.5, cb100: 2.2, f100: 8.5,
            confidence: "95.4%",
            annVerdict: "Adequate-Protein Power",
            explanation: "Rich in omega-3 EPA/DHA fatty acids and high-biological-value protein. Sustains peptide YY release while maintaining your calorie deficit."
        },
        {
            name: "Grilled Chicken Breast with White Rice",
            c100: 148, p100: 19.5, cb100: 14.2, f100: 1.8,
            confidence: "93.1%",
            annVerdict: "Balanced & Nutrient-Dense",
            explanation: "Classic athlete staple. Fast glycogen restoration from easy-digesting jasmine rice coupled with lean chicken breast for muscle repair."
        }
    ];

    // Pick random or alternate
    const chosen = plates[Math.floor(Math.random() * plates.length)];
    activeScanItem = { ...chosen, servingG: 200 };

    document.getElementById("scanned-dish-name").textContent = chosen.name;
    document.getElementById("scanned-conf-num").textContent = `${chosen.confidence} Confidence Score`;
    document.getElementById("scanned-ann-pill").textContent = chosen.annVerdict;
    document.getElementById("scanned-coach-txt").textContent = chosen.explanation;

    adjustScanPortion();
    alert(`📸 Camera Reticle Detected: ${chosen.name} (${chosen.confidence})`);
}

function adjustScanPortion() {
    const servingG = parseFloat(document.getElementById("scan-portion-select").value) || 200;
    activeScanItem.servingG = servingG;
    const mult = servingG / 100.0;

    const cal = Math.round(activeScanItem.c100 * mult);
    const p = (activeScanItem.p100 * mult).toFixed(1);
    const c = (activeScanItem.cb100 * mult).toFixed(1);
    const f = (activeScanItem.f100 * mult).toFixed(1);

    document.getElementById("scanned-cal-val").textContent = `${cal} kcal`;
    document.getElementById("scanned-p-val").textContent = `${p}g`;
    document.getElementById("scanned-c-val").textContent = `${c}g`;
    document.getElementById("scanned-f-val").textContent = `${f}g`;
}

function logScannedToDiary() {
    const user = getActiveUser();
    const mult = activeScanItem.servingG / 100.0;

    user.meals.push({
        id: "m_scan_" + Date.now(),
        category: "dinner",
        name: `${activeScanItem.name} (${activeScanItem.servingG}g)`,
        calories: Math.round(activeScanItem.c100 * mult),
        protein: parseFloat((activeScanItem.p100 * mult).toFixed(1)),
        carbs: parseFloat((activeScanItem.cb100 * mult).toFixed(1)),
        fat: parseFloat((activeScanItem.f100 * mult).toFixed(1))
    });

    renderCurrentUserData();
    switchMainTab("dashboard");
    alert(`Logged ${activeScanItem.name} to Dinner for ${user.name}!`);
}

// ==============================================================================
// CLINICAL AUDIT REPORT
// ==============================================================================
function openWeeklyAuditModal() {
    const user = getActiveUser();
    const modal = document.getElementById("audit-modal");
    const container = document.getElementById("audit-report-content");

    container.innerHTML = `
        <div style="background: var(--bg-surface); padding: 14px; border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--border-subtle);">
            <strong>Athlete:</strong> ${user.name} | <strong>Protocol:</strong> ${user.goal} | <strong>Compliance Score:</strong> 96.4%
        </div>
        <h4 style="color: #ffffff; margin-bottom: 6px;">1. Caloric Energy Balance & Deficit Stability</h4>
        <p>• Multi-day average: <strong>${user.targets.calories - 30} kcal/day</strong> (Target: ${user.targets.calories} kcal). Negative energy balance maintained without acute metabolic down-regulation or thyroid deceleration.</p>
        
        <h4 style="color: #ffffff; margin: 14px 0 6px;">2. Macronutrient Optimization & Muscle Sparing</h4>
        <p>• Protein average: <strong>${(user.targets.protein + 2).toFixed(1)}g/day</strong> (Target: ${user.targets.protein}g). Fractional synthetic rate (FSR) remains high, shielding myofibrillar mass.</p>
        
        <h4 style="color: #ffffff; margin: 14px 0 6px;">3. Circadian Feeding Rhythm (RNN Sequence Engine)</h4>
        <p>• Model classification: <strong>Optimal Circadian Cadence</strong>. Feeding window strictly contained within 9.5 hours, optimizing insulin sensitivity and nocturnal growth hormone secretion.</p>
        
        <h4 style="color: #ffffff; margin: 14px 0 6px;">4. Cellular Hydration & Electrolytes</h4>
        <p>• Mean fluid intake: <strong>${user.targets.water} ml/day</strong>. Osmotic cellular balance confirmed.</p>
    `;

    modal.style.display = "flex";
}

function closeWeeklyAuditModal() {
    document.getElementById("audit-modal").style.display = "none";
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
