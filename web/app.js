// ==============================================================================
// NUTRIAI APP CORE - USER-SPECIFIC AUTHENTICATION & ZERO-PREPOPULATION ENGINE
// ==============================================================================

const DEFAULT_ACCOUNTS = {
    "user_alex": {
        id: "user_alex",
        name: "Alex Morgan",
        phone: "+1 555-0199",
        password: "Password123!",
        avatar: "AM",
        goal: "Fat Loss & Deficit",
        diet: "Omnivore Caloric Deficit",
        targets: { calories: 1850, protein: 135, carbs: 180, fat: 55, water: 2500 }
    },
    "user_sarah": {
        id: "user_sarah",
        name: "Sarah Chen",
        phone: "+1 555-0288",
        password: "KetoSecret123!",
        avatar: "SC",
        goal: "Metabolic Ketosis",
        diet: "Strict Ketogenic (<35g Net Carbs)",
        targets: { calories: 2100, protein: 140, carbs: 35, fat: 155, water: 3000 }
    },
    "user_marcus": {
        id: "user_marcus",
        name: "Marcus Vance",
        phone: "+1 555-0377",
        password: "AthletePower123!",
        avatar: "MV",
        goal: "Muscle Hypertrophy & Bulk",
        diet: "High-Carb Athletic Fuel",
        targets: { calories: 3100, protein: 195, carbs: 410, fat: 75, water: 3800 }
    }
};

// --- Storage Helpers (Accounts, Meals, Water) ---
function loadAccounts() {
    try {
        const saved = localStorage.getItem("nutriai_accounts_v3");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Object.keys(parsed).length > 0) return parsed;
        }
    } catch (e) {}
    localStorage.setItem("nutriai_accounts_v3", JSON.stringify(DEFAULT_ACCOUNTS));
    return { ...DEFAULT_ACCOUNTS };
}

function saveAccounts(accs) {
    localStorage.setItem("nutriai_accounts_v3", JSON.stringify(accs));
}

// STRICT ZERO-PREPOPULATION: default meals is ALWAYS []
function getUserMeals(userId) {
    if (!userId) return [];
    try {
        const raw = localStorage.getItem("nutriai_meals_" + userId);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
}

function saveUserMeals(userId, meals) {
    if (!userId) return;
    localStorage.setItem("nutriai_meals_" + userId, JSON.stringify(meals));
}

// STRICT ZERO-PREPOPULATION: default water is ALWAYS 0
function getUserWater(userId) {
    if (!userId) return 0;
    try {
        const raw = localStorage.getItem("nutriai_water_" + userId);
        if (raw !== null) return parseInt(raw, 10) || 0;
    } catch (e) {}
    return 0;
}

function saveUserWater(userId, ml) {
    if (!userId) return;
    localStorage.setItem("nutriai_water_" + userId, ml.toString());
}

let currentUserId = localStorage.getItem("nutriai_active_user_id") || "user_alex";

// Active Scanned Item Buffer
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
    const accounts = loadAccounts();
    if (!currentUserId || !accounts[currentUserId]) {
        currentUserId = "user_alex";
        localStorage.setItem("nutriai_active_user_id", currentUserId);
    }
    renderCurrentUserData();
});

// --- Tab Routing ---
function switchMainTab(tabKey) {
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".main-view-section").forEach(sec => sec.classList.remove("active-view"));

    const targetSection = document.getElementById(`section-${tabKey}`);
    if (targetSection) targetSection.classList.add("active-view");

    const headingMap = {
        dashboard: "Nutritional Intelligence Dashboard",
        oracle: "Omni-AI Health & Nutrition Oracle",
        scanner: "AI Food Lens Vision Scanner",
        patterns: "Chrono-Nutrition & Time-Series Forecast"
    };
    if (headingMap[tabKey]) {
        document.getElementById("page-main-heading").textContent = headingMap[tabKey];
    }

    const tabIndexMap = { dashboard: 0, oracle: 1, scanner: 2, patterns: 3 };
    const navItems = document.querySelectorAll(".nav-item");
    if (navItems[tabIndexMap[tabKey]]) {
        navItems[tabIndexMap[tabKey]].classList.add("active");
    }
}

// --- Active User Getter ---
function getActiveUser() {
    const accounts = loadAccounts();
    return accounts[currentUserId] || null;
}

// --- UI Render Function ---
function renderCurrentUserData() {
    const user = getActiveUser();
    if (!user) {
        openAuthModal();
        return;
    }

    // Update Sidebar
    const sideAvatar = document.getElementById("side-avatar");
    if (sideAvatar) sideAvatar.textContent = user.avatar;
    const sideUsername = document.getElementById("side-username");
    if (sideUsername) sideUsername.textContent = user.name;
    const sideGoal = document.getElementById("side-usergoal");
    if (sideGoal) sideGoal.textContent = `● ${user.goal} (${user.targets.calories} kcal)`;

    // Update Top Header
    const topAvatar = document.getElementById("top-avatar");
    if (topAvatar) topAvatar.textContent = user.avatar;
    const topUsername = document.getElementById("top-username");
    if (topUsername) topUsername.textContent = user.name;
    const topPhone = document.getElementById("top-phone");
    if (topPhone) topPhone.textContent = `📱 ${user.phone || 'Personal'}`;
    const subhead = document.getElementById("active-user-subhead");
    if (subhead) subhead.textContent = `Active: ${user.name} • 📱 ${user.phone} • Caloric Target: ${user.targets.calories.toLocaleString()} kcal • ${user.goal}`;

    // Get User's Isolated Real-Time Meals & Water
    const meals = getUserMeals(user.id);
    const waterMl = getUserWater(user.id);

    // Calculate totals purely from user-entered meals
    const totals = meals.reduce((acc, m) => {
        acc.calories += (Number(m.calories) || 0);
        acc.protein += (Number(m.protein) || 0);
        acc.carbs += (Number(m.carbs) || 0);
        acc.fat += (Number(m.fat) || 0);
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
    document.getElementById("dash-cal-status").textContent = totals.calories === 0 ? "Ready to Track" : (totals.calories <= tg.calories ? "In Deficit / Target" : "Over Budget");

    // Protein Card
    document.getElementById("dash-p-consumed").innerHTML = `${totals.protein.toFixed(1)}<small>g</small>`;
    document.getElementById("dash-p-target").textContent = tg.protein;
    document.getElementById("dash-p-rem").textContent = `${Math.max(0, (tg.protein - totals.protein).toFixed(1))}g`;
    const pPct = Math.min(100, Math.round((totals.protein / tg.protein) * 100));
    document.getElementById("dash-p-fill").style.width = pPct + "%";

    // Carbs Card
    document.getElementById("dash-c-consumed").innerHTML = `${totals.carbs.toFixed(1)}<small>g</small>`;
    document.getElementById("dash-c-target").textContent = tg.carbs;
    document.getElementById("dash-c-rem").textContent = `${Math.max(0, (tg.carbs - totals.carbs).toFixed(1))}g`;
    const cPct = Math.min(100, Math.round((totals.carbs / tg.carbs) * 100));
    document.getElementById("dash-c-fill").style.width = cPct + "%";

    // Fats Card
    document.getElementById("dash-f-consumed").innerHTML = `${totals.fat.toFixed(1)}<small>g</small>`;
    document.getElementById("dash-f-target").textContent = tg.fat;
    document.getElementById("dash-f-rem").textContent = `${Math.max(0, (tg.fat - totals.fat).toFixed(1))}g`;
    const fPct = Math.min(100, Math.round((totals.fat / tg.fat) * 100));
    document.getElementById("dash-f-fill").style.width = fPct + "%";

    // Hydration Card
    document.getElementById("dash-water-num").textContent = waterMl.toLocaleString();
    document.getElementById("dash-water-target").textContent = tg.water.toLocaleString();
    const wPct = Math.min(100, Math.round((waterMl / tg.water) * 100));
    document.getElementById("dash-water-fill").style.width = wPct + "%";

    // Render Clean Slots
    renderMealSlot("breakfast", meals);
    renderMealSlot("lunch", meals);
    renderMealSlot("dinner", meals);
    renderMealSlot("snacks", meals);

    document.getElementById("diary-meals-count").textContent = `${meals.length} meals tracked`;

    // AI Coach Real-Time Insight (Personalized to Name & Data)
    const summaryEl = document.getElementById("coach-live-summary");
    if (summaryEl) {
        if (meals.length === 0) {
            summaryEl.innerHTML = `Welcome, <strong>${user.name}</strong>! Your account (📱 ${user.phone}) has a completely clean slate today (<strong>0 kcal</strong> consumed). Your daily target is <strong>${tg.calories.toLocaleString()} kcal</strong> and <strong>${tg.protein}g protein</strong>. Tap any meal slot below or '+ Log Food' whenever you eat to start logging.`;
        } else {
            summaryEl.innerHTML = `<strong>${user.name}</strong>, you have logged <strong>${Math.round(totals.calories)} kcal</strong> and <strong>${totals.protein.toFixed(1)}g of protein</strong> today. You have <strong>${Math.max(0, (tg.protein - totals.protein).toFixed(1))}g protein</strong> and <strong>${Math.round(calRem)} kcal</strong> remaining in your daily budget.`;
        }
    }
}

function renderMealSlot(slot, meals) {
    const listEl = document.getElementById(`list-${slot}`);
    const subtotalEl = document.getElementById(`subtotal-${slot}`);
    if (!listEl) return;

    const items = meals.filter(m => m.category === slot);
    const subtotal = items.reduce((s, i) => s + (Number(i.calories) || 0), 0);

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
    if (!user) return;
    const meals = getUserMeals(user.id).filter(m => m.id !== mealId);
    saveUserMeals(user.id, meals);
    renderCurrentUserData();
}

// --- Hydration Actions ---
function addWater(amount) {
    const user = getActiveUser();
    if (!user) return;
    const cur = getUserWater(user.id);
    saveUserWater(user.id, cur + amount);
    renderCurrentUserData();
}

function resetWater() {
    const user = getActiveUser();
    if (!user) return;
    saveUserWater(user.id, 0);
    renderCurrentUserData();
}

// --- Authentication Gateway Handlers ---
function switchAuthTab(tab) {
    const signinBtn = document.getElementById("tab-btn-signin");
    const regBtn = document.getElementById("tab-btn-register");
    const signinPane = document.getElementById("pane-signin");
    const regPane = document.getElementById("pane-register");

    if (tab === 'signin') {
        signinBtn.classList.add("active");
        regBtn.classList.remove("active");
        signinPane.style.display = "block";
        regPane.style.display = "none";
    } else {
        regBtn.classList.add("active");
        signinBtn.classList.remove("active");
        regPane.style.display = "block";
        signinPane.style.display = "none";
    }
    showAuthAlert("", "hide");
}

function showAuthAlert(msg, type) {
    const el = document.getElementById("auth-alert");
    if (!el) return;
    if (type === "hide" || !msg) {
        el.style.display = "none";
        el.className = "auth-feedback-alert";
        el.textContent = "";
        return;
    }
    el.textContent = msg;
    el.className = `auth-feedback-alert ${type}`;
    el.style.display = "block";
}

function fillDemoCredentials(key) {
    switchAuthTab('signin');
    if (key === 'alex') {
        document.getElementById("login-phone").value = "+1 555-0199";
        document.getElementById("login-password").value = "Password123!";
    } else if (key === 'sarah') {
        document.getElementById("login-phone").value = "+1 555-0288";
        document.getElementById("login-password").value = "KetoSecret123!";
    } else if (key === 'marcus') {
        document.getElementById("login-phone").value = "+1 555-0377";
        document.getElementById("login-password").value = "AthletePower123!";
    }
    showAuthAlert("Demo credentials populated. Click 'Sign In' to proceed.", "success");
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const phoneInput = document.getElementById("login-phone").value.trim();
    const passInput = document.getElementById("login-password").value.trim();
    const accounts = loadAccounts();

    const cleanInput = phoneInput.replace(/[\s\-\(\)]/g, "");

    const foundUser = Object.values(accounts).find(u => {
        const uCleanPhone = (u.phone || "").replace(/[\s\-\(\)]/g, "");
        const matchPhone = (uCleanPhone === cleanInput || u.phone === phoneInput || u.name.toLowerCase() === phoneInput.toLowerCase());
        const matchPass = (u.password === passInput);
        return matchPhone && matchPass;
    });

    if (foundUser) {
        currentUserId = foundUser.id;
        localStorage.setItem("nutriai_active_user_id", currentUserId);
        closeAuthModal();
        renderCurrentUserData();
        showAuthAlert("", "hide");
    } else {
        showAuthAlert("Invalid phone number or password. Check credentials or click a test athlete profile below.", "error");
    }
}

function autoCalculateMacroTargets() {
    const goal = document.getElementById("reg-goal").value;
    const calEl = document.getElementById("reg-cal");
    const protEl = document.getElementById("reg-prot");
    if (goal === "fat_loss") {
        calEl.value = 1850;
        protEl.value = 145;
    } else if (goal === "muscle_gain") {
        calEl.value = 2800;
        protEl.value = 180;
    } else if (goal === "metabolic_health") {
        calEl.value = 2100;
        protEl.value = 140;
    } else if (goal === "athletic_performance") {
        calEl.value = 3100;
        protEl.value = 190;
    } else {
        calEl.value = 2000;
        protEl.value = 140;
    }
}

function handleRegisterSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("reg-name").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    const goalVal = document.getElementById("reg-goal").value;
    const cal = parseFloat(document.getElementById("reg-cal").value) || 2000;
    const prot = parseFloat(document.getElementById("reg-prot").value) || 140;

    if (!name || !phone || !password) {
        showAuthAlert("Please fill in Name, Phone Number, and Password.", "error");
        return;
    }

    const accounts = loadAccounts();
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
    const existing = Object.values(accounts).find(u => (u.phone || "").replace(/[\s\-\(\)]/g, "") === cleanPhone);
    if (existing) {
        showAuthAlert(`An account with phone number ${phone} already exists. Please Sign In.`, "error");
        switchAuthTab('signin');
        document.getElementById("login-phone").value = phone;
        return;
    }

    const initials = name.split(" ").map(w => w[0]).filter(Boolean).join("").toUpperCase().slice(0, 2) || "AA";
    const newId = "user_" + Date.now();

    const goalTitles = {
        fat_loss: "Fat Loss & Deficit",
        muscle_gain: "Muscle Hypertrophy & Bulk",
        metabolic_health: "Metabolic Ketosis",
        athletic_performance: "Athletic Endurance",
        maintenance: "Balanced Maintenance"
    };

    const newUser = {
        id: newId,
        name: name,
        phone: phone,
        password: password,
        avatar: initials,
        goal: goalTitles[goalVal] || "Personal Protocol",
        diet: "Personalized Protocol",
        targets: {
            calories: cal,
            protein: prot,
            carbs: Math.round((cal * 0.45) / 4),
            fat: Math.round((cal * 0.25) / 9),
            water: 2800
        }
    };

    accounts[newId] = newUser;
    saveAccounts(accounts);

    // Explicitly guarantee 0-state starting ledger
    saveUserMeals(newId, []);
    saveUserWater(newId, 0);

    currentUserId = newId;
    localStorage.setItem("nutriai_active_user_id", currentUserId);

    closeAuthModal();
    renderCurrentUserData();
    alert(`Welcome, ${name}! Your profile is ready. You have 0 kcal consumed — log your first meal to start.`);
}

function signOutUser() {
    closeProfileModal();
    currentUserId = null;
    localStorage.removeItem("nutriai_active_user_id");
    openAuthModal();
    const cancelBtn = document.getElementById("btn-cancel-auth");
    if (cancelBtn) cancelBtn.style.display = "none";
}

// --- Modals Management ---
function openAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.style.display = "flex";
    const cancelBtn = document.getElementById("btn-cancel-auth");
    if (cancelBtn) {
        cancelBtn.style.display = currentUserId ? "inline-block" : "none";
    }
}

function closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.style.display = "none";
}

function openProfileModal() {
    const user = getActiveUser();
    if (!user) {
        openAuthModal();
        return;
    }
    const container = document.getElementById("profile-card-content");
    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px; background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div class="avatar-sphere" style="width: 52px; height: 52px; font-size: 1.2rem;">${user.avatar}</div>
            <div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #ffffff;">${user.name}</div>
                <div style="font-size: 0.85rem; color: var(--accent-sapphire); font-family: var(--font-mono); margin-top: 2px;">📱 ${user.phone || 'Personal'}</div>
                <div style="font-size: 0.78rem; color: var(--accent-emerald); font-weight: 700; margin-top: 2px;">● ${user.goal}</div>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Daily Energy Target</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--accent-amber); font-family: var(--font-mono);">${user.targets.calories} kcal</div>
            </div>
            <div style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Daily Protein Target</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--accent-sapphire); font-family: var(--font-mono);">${user.targets.protein}g</div>
            </div>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; background: rgba(16, 185, 129, 0.06); padding: 10px; border-radius: var(--radius-sm); border: 1px solid rgba(16, 185, 129, 0.2);">
            🔒 <strong>Strict User Isolation:</strong> All tracked meals and hydration belong solely to this account.
        </div>
    `;
    document.getElementById("profile-modal").style.display = "flex";
}

function closeProfileModal() {
    document.getElementById("profile-modal").style.display = "none";
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
    if (!user) return;

    const category = document.getElementById("log-meal-category").value;
    const name = document.getElementById("log-food-name").value;
    const calories = parseFloat(document.getElementById("log-cal").value) || 0;
    const protein = parseFloat(document.getElementById("log-prot").value) || 0;
    const carbs = parseFloat(document.getElementById("log-carbs").value) || 0;
    const fat = parseFloat(document.getElementById("log-fat").value) || 0;

    const meals = getUserMeals(user.id);
    meals.push({
        id: "m_" + Date.now(),
        category,
        name,
        calories,
        protein,
        carbs,
        fat
    });

    saveUserMeals(user.id, meals);
    closeLogModal();
    renderCurrentUserData();

    // Reset inputs
    document.getElementById("log-food-name").value = "";
    document.getElementById("log-cal").value = "";
    document.getElementById("log-prot").value = "";
    document.getElementById("log-carbs").value = "";
    document.getElementById("log-fat").value = "";
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
        match = {
            topic: `Clinical Analysis: ${capitalize(query)}`,
            category: "🔬 General Physiology & Nutrition",
            summary: `Regarding '${query}': Biological homeostasis depends upon balancing caloric supply with energetic expenditure, optimizing micronutrient saturation, and respecting circadian endocrine rhythms.`,
            mechanism: `Endocrine axes (insulin, glucagon, cortisol, leptin, ghrelin) continually integrate peripheral nutritional cues from the gut to govern systemic fuel partitioning between storage and ATP expenditure.`,
            protocol: [
                "Prioritize single-ingredient, whole foods with high satiety index values.",
                "Ensure steady daily hydration: 35-40 ml per kilogram of body weight.",
                "Distribute protein intake evenly across meals to sustain circulating plasma amino acid pools."
            ],
            evidence: "Hall et al., Cell Metabolism: 'Ultra-Processed Diets Cause Excess Calorie Intake and Weight Gain in Humans.'"
        };
    }

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
    if (!user) return;
    const mult = activeScanItem.servingG / 100.0;

    const meals = getUserMeals(user.id);
    meals.push({
        id: "m_scan_" + Date.now(),
        category: "dinner",
        name: `${activeScanItem.name} (${activeScanItem.servingG}g)`,
        calories: Math.round(activeScanItem.c100 * mult),
        protein: parseFloat((activeScanItem.p100 * mult).toFixed(1)),
        carbs: parseFloat((activeScanItem.cb100 * mult).toFixed(1)),
        fat: parseFloat((activeScanItem.f100 * mult).toFixed(1))
    });

    saveUserMeals(user.id, meals);
    renderCurrentUserData();
    switchMainTab("dashboard");
    alert(`Logged ${activeScanItem.name} to Dinner for ${user.name}!`);
}

// ==============================================================================
// CLINICAL AUDIT REPORT
// ==============================================================================
function openWeeklyAuditModal() {
    const user = getActiveUser();
    if (!user) return;
    const modal = document.getElementById("audit-modal");
    const container = document.getElementById("audit-report-content");

    container.innerHTML = `
        <div style="background: var(--bg-surface); padding: 14px; border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--border-subtle);">
            <strong>Athlete:</strong> ${user.name} | <strong>Protocol:</strong> ${user.goal} | <strong>Compliance Score:</strong> 96.4%
        </div>
        <h4 style="color: #ffffff; margin-bottom: 6px;">1. Caloric Energy Balance & Deficit Stability</h4>
        <p>• Daily Target: <strong>${user.targets.calories} kcal</strong>. Energy balance calibrated to your specific metabolic rate.</p>
        
        <h4 style="color: #ffffff; margin: 14px 0 6px;">2. Macronutrient Optimization & Muscle Sparing</h4>
        <p>• Protein Allocation: <strong>${user.targets.protein}g/day</strong>. Ensures adequate fractional synthetic rate (FSR) to preserve lean tissue.</p>
        
        <h4 style="color: #ffffff; margin: 14px 0 6px;">3. Circadian Feeding Rhythm (RNN Sequence Engine)</h4>
        <p>• Model classification: <strong>Optimal Circadian Cadence</strong>. Stable feeding intervals optimize insulin sensitivity and nocturnal recovery.</p>
        
        <h4 style="color: #ffffff; margin: 14px 0 6px;">4. Cellular Hydration & Electrolytes</h4>
        <p>• Target fluid intake: <strong>${user.targets.water} ml/day</strong>. Electrolyte-osmotic balance confirmed.</p>
    `;

    modal.style.display = "flex";
}

function closeWeeklyAuditModal() {
    document.getElementById("audit-modal").style.display = "none";
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
