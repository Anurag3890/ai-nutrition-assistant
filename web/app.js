// AI Nutritionist Assistant - Integrated Web Dashboard Engine

const state = {
    user: {
        id: "user_demo_01",
        name: "Alex Morgan",
        targets: { calories: 1850, protein: 135, carbs: 180, fat: 55, fiber: 30, water: 2500 }
    },
    meals: [
        { id: "m1", meal_type: "breakfast", name: "Oatmeal with Blueberries & Vanilla Whey", calories: 364, protein: 32.2, carbs: 49.5, fat: 4.5 },
        { id: "m2", meal_type: "lunch", name: "Grilled Chicken, Jasmine Rice & Broccoli with Avocado", calories: 557, protein: 53.7, carbs: 53.5, fat: 13.5 }
    ],
    waterMl: 1600,
    chatMessages: [
        {
            sender: "assistant",
            text: "Hello Alex! I've analyzed your breakfast and lunch. You're currently at <strong>85.9g of protein</strong> and <strong>921 calories</strong>.<div class='recommendation-box'>💡 <strong>Coach Recommendation:</strong> You have 49.1g of protein remaining for dinner. A salmon fillet or tofu stir-fry with quinoa will hit your target while maintaining your 500 kcal deficit.</div>",
            time: "1:15 PM"
        }
    ],
    currentScan: {
        food_name: "Grilled Salmon with Asparagus",
        base_calories_per_100g: 165,
        base_protein_per_100g: 20.5,
        base_carbs_per_100g: 2.2,
        base_fat_per_100g: 8.5,
        confidence: "94.2%",
        serving_g: 200,
        ann_verdict: "Adequate-Protein Power",
        explanation: "With 41g of high-biological-value protein, this plate optimizes muscle protein synthesis and keeps satiety hormones elevated for hours, fitting right within your Fat Loss deficit."
    }
};

const FOOD_PRESETS = {
    grilled_salmon: {
        name: "Grilled Salmon with Asparagus",
        c100: 165, p100: 20.5, cb100: 2.2, f100: 8.5,
        confidence: "95.4%",
        ann_verdict: "Adequate-Protein Power",
        explanation: "Rich in omega-3 polyunsaturated fatty acids (EPA/DHA) and high-quality protein. Provides sustained satiety without spiking insulin."
    },
    chicken_rice: {
        name: "Grilled Chicken Breast with White Rice",
        c100: 148, p100: 19.5, cb100: 14.2, f100: 1.8,
        confidence: "92.8%",
        ann_verdict: "Balanced & Nutrient-Dense",
        explanation: "Classic athlete staple. Fast glycogen restoration from easy-digesting jasmine rice coupled with lean chicken breast for muscle repair."
    },
    oatmeal_berries: {
        name: "Oatmeal with Mixed Berries & Whey",
        c100: 135, p100: 11.5, cb100: 18.0, f100: 2.1,
        confidence: "96.1%",
        ann_verdict: "Balanced & Nutrient-Dense",
        explanation: "Beta-glucan soluble fiber blunts glycemic response, while antioxidant anthocyanins support mitochondrial recovery."
    },
    avocado_toast: {
        name: "Avocado & Poached Egg Whole-Grain Toast",
        c100: 210, p100: 9.2, cb100: 18.5, f100: 12.0,
        confidence: "89.7%",
        ann_verdict: "High-Fat Alert",
        explanation: "High in monounsaturated fats and lutein. Healthy lipids, though energy density requires keeping portion size controlled during fat loss."
    }
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    updateDashboard();
    setupEventListeners();
    recalculateServing();
});

function setupEventListeners() {
    const quickWaterBtn = document.getElementById("btn-quick-water");
    if (quickWaterBtn) quickWaterBtn.addEventListener("click", () => addWater(250));

    const openModalBtn = document.getElementById("btn-open-log-modal");
    const closeModalBtn = document.getElementById("btn-close-modal");
    const cancelModalBtn = document.getElementById("btn-cancel-modal");
    const modal = document.getElementById("meal-modal");

    if (openModalBtn) openModalBtn.addEventListener("click", () => modal.style.display = "flex");
    if (closeModalBtn) closeModalBtn.addEventListener("click", () => modal.style.display = "none");
    if (cancelModalBtn) cancelModalBtn.addEventListener("click", () => modal.style.display = "none");

    const foodForm = document.getElementById("food-log-form");
    if (foodForm) {
        foodForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const mealType = document.getElementById("meal-type-select").value;
            const name = document.getElementById("food-name-input").value;
            const calories = parseFloat(document.getElementById("calories-input").value) || 0;
            const protein = parseFloat(document.getElementById("protein-input").value) || 0;
            const carbs = parseFloat(document.getElementById("carbs-input").value) || 0;
            const fat = parseFloat(document.getElementById("fat-input").value) || 0;

            state.meals.push({ id: "m_" + Date.now(), meal_type: mealType, name, calories, protein, carbs, fat });
            foodForm.reset();
            modal.style.display = "none";
            updateDashboard();

            setTimeout(() => { triggerAIMealAnalysis(name, calories, protein); }, 600);
        });
    }

    const chatForm = document.getElementById("chat-form");
    if (chatForm) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = document.getElementById("chat-input");
            const text = input.value.trim();
            if (!text) return;
            handleUserMessage(text);
            input.value = "";
        });
    }
}

// --- Dashboard Updates ---
function updateDashboard() {
    const totals = state.meals.reduce((acc, m) => {
        acc.calories += m.calories;
        acc.protein += m.protein;
        acc.carbs += m.carbs;
        acc.fat += m.fat;
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const targets = state.user.targets;

    document.getElementById("calories-consumed").textContent = Math.round(totals.calories);
    document.getElementById("calories-target").textContent = targets.calories;
    const calRem = Math.max(0, targets.calories - totals.calories);
    document.getElementById("calories-remaining").textContent = Math.round(calRem);
    document.getElementById("cal-progress-bar").style.width = Math.min(100, (totals.calories / targets.calories) * 100) + "%";

    document.getElementById("protein-consumed").innerHTML = `${totals.protein.toFixed(1)}<small>g</small>`;
    document.getElementById("protein-target").textContent = targets.protein;
    document.getElementById("protein-remaining").textContent = Math.max(0, (targets.protein - totals.protein).toFixed(1));
    document.getElementById("protein-progress-bar").style.width = Math.min(100, (totals.protein / targets.protein) * 100) + "%";

    document.getElementById("carbs-consumed").innerHTML = `${totals.carbs.toFixed(1)}<small>g</small>`;
    document.getElementById("carbs-target").textContent = targets.carbs;
    document.getElementById("carbs-progress-bar").style.width = Math.min(100, (totals.carbs / targets.carbs) * 100) + "%";

    document.getElementById("fat-consumed").innerHTML = `${totals.fat.toFixed(1)}<small>g</small>`;
    document.getElementById("fat-target").textContent = targets.fat;
    document.getElementById("fat-progress-bar").style.width = Math.min(100, (totals.fat / targets.fat) * 100) + "%";

    document.getElementById("water-current").textContent = state.waterMl.toLocaleString();
    document.getElementById("water-target").textContent = targets.water.toLocaleString();
    document.getElementById("water-progress-bar").style.width = Math.min(100, (state.waterMl / targets.water) * 100) + "%";

    renderMealList("breakfast");
    renderMealList("lunch");
    renderMealList("dinner");
    renderMealList("snacks");
    document.getElementById("meals-count-badge").textContent = `${state.meals.length} items`;
}

function renderMealList(type) {
    const listEl = document.getElementById(`${type}-list`);
    const subtotalEl = document.getElementById(`${type}-subtotal`);
    if (!listEl) return;

    const items = state.meals.filter(m => m.meal_type === type);
    const subtotal = items.reduce((s, i) => s + i.calories, 0);
    if (subtotalEl) subtotalEl.textContent = `${Math.round(subtotal)} kcal`;

    if (items.length === 0) {
        listEl.innerHTML = `<div class="empty-meal-slot" onclick="openModalForCategory('${type}')">+ Tap to log ${capitalize(type)}</div>`;
        return;
    }

    listEl.innerHTML = items.map(item => `
        <div class="meal-item">
            <div>
                <div class="meal-item-name">${item.name}</div>
                <div class="meal-item-macros">
                    <strong>${Math.round(item.calories)} kcal</strong> • P: ${item.protein}g • C: ${item.carbs}g • F: ${item.fat}g
                </div>
            </div>
            <div class="meal-item-actions">
                <button class="btn-delete-meal" onclick="deleteMeal('${item.id}')" title="Delete">🗑️</button>
            </div>
        </div>
    `).join("");
}

function openModalForCategory(type) {
    const modal = document.getElementById("meal-modal");
    document.getElementById("meal-type-select").value = type;
    modal.style.display = "flex";
}

function deleteMeal(mealId) {
    state.meals = state.meals.filter(m => m.id !== mealId);
    updateDashboard();
}

function addWater(amount) {
    state.waterMl += amount;
    updateDashboard();
}

function resetWater() {
    state.waterMl = 0;
    updateDashboard();
}

// --- SCANNER & PRESET SIMULATION (MODULES 1-4) ---
function simulateScan(presetKey) {
    const p = FOOD_PRESETS[presetKey];
    if (!p) return;

    state.currentScan.food_name = p.name;
    state.currentScan.base_calories_per_100g = p.c100;
    state.currentScan.base_protein_per_100g = p.p100;
    state.currentScan.base_carbs_per_100g = p.cb100;
    state.currentScan.base_fat_per_100g = p.f100;
    state.currentScan.confidence = p.confidence;
    state.currentScan.ann_verdict = p.ann_verdict;
    state.currentScan.explanation = p.explanation;

    document.getElementById("detected-food-title").textContent = p.name;
    document.getElementById("detected-confidence").textContent = `${p.confidence} Confidence`;
    document.getElementById("ann-verdict-pill").textContent = p.ann_verdict;
    document.getElementById("scan-coach-explanation").textContent = p.explanation;

    recalculateServing();
}

function recalculateServing() {
    const servingG = parseFloat(document.getElementById("scan-serving-select").value) || 200;
    state.currentScan.serving_g = servingG;
    const mult = servingG / 100.0;

    const cal = Math.round(state.currentScan.base_calories_per_100g * mult);
    const prot = (state.currentScan.base_protein_per_100g * mult).toFixed(1);
    const carbs = (state.currentScan.base_carbs_per_100g * mult).toFixed(1);
    const fat = (state.currentScan.base_fat_per_100g * mult).toFixed(1);

    document.getElementById("scan-cal").textContent = `${cal} kcal`;
    document.getElementById("scan-p").textContent = `${prot}g`;
    document.getElementById("scan-c").textContent = `${carbs}g`;
    document.getElementById("scan-f").textContent = `${fat}g`;
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById("detected-food-title").textContent = "Analyzing photo with MobileNetV2...";
    document.getElementById("detected-confidence").textContent = "Processing tensor...";

    setTimeout(() => {
        simulateScan("grilled_salmon");
    }, 800);
}

function logScannedMeal() {
    const servingG = state.currentScan.serving_g;
    const mult = servingG / 100.0;
    const cal = Math.round(state.currentScan.base_calories_per_100g * mult);
    const prot = parseFloat((state.currentScan.base_protein_per_100g * mult).toFixed(1));
    const carbs = parseFloat((state.currentScan.base_carbs_per_100g * mult).toFixed(1));
    const fat = parseFloat((state.currentScan.base_fat_per_100g * mult).toFixed(1));

    state.meals.push({
        id: "m_" + Date.now(),
        meal_type: "dinner",
        name: `${state.currentScan.food_name} (${servingG}g)`,
        calories: cal,
        protein: prot,
        carbs: carbs,
        fat: fat
    });

    updateDashboard();
    triggerAIMealAnalysis(state.currentScan.food_name, cal, prot);
    alert(`Added ${state.currentScan.food_name} to Dinner!`);
}

// --- CHAT & GENAI (MODULE 6) ---
function renderChat() {
    const chatContainer = document.getElementById("chat-messages");
    if (!chatContainer) return;
    
    chatContainer.innerHTML = state.chatMessages.map(msg => `
        <div class="chat-msg ${msg.sender === 'user' ? 'user-msg' : 'ai-msg'}">
            <p>${msg.text}</p>
            <span class="msg-timestamp">${msg.time}</span>
        </div>
    `).join("");
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function handleUserMessage(text) {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    state.chatMessages.push({ sender: "user", text: escapeHTML(text), time: now });
    renderChat();

    setTimeout(() => {
        const aiResponse = generateAINutritionAdvice(text);
        state.chatMessages.push({
            sender: "assistant",
            text: aiResponse,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        renderChat();
    }, 600);
}

function sendQuickPrompt(promptText) {
    handleUserMessage(promptText);
}

function triggerAIMealAnalysis(mealName, calories, protein) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const analysisText = `Logged <strong>${escapeHTML(mealName)}</strong> (${calories} kcal, ${protein}g protein). Remaining calories today: <strong>${document.getElementById("calories-remaining").textContent} kcal</strong>.`;
    state.chatMessages.push({ sender: "assistant", text: analysisText, time });
    renderChat();
}

function generateAINutritionAdvice(query) {
    const q = query.toLowerCase();
    const totals = state.meals.reduce((acc, m) => { acc.calories += m.calories; acc.protein += m.protein; return acc; }, { calories: 0, protein: 0 });
    const remCal = Math.max(0, Math.round(state.user.targets.calories - totals.calories));
    const remP = Math.max(0, (state.user.targets.protein - totals.protein).toFixed(1));

    if (q.includes("swap") || q.includes("fries") || q.includes("alternative")) {
        return `💡 <strong>Smart Swap Recommendation:</strong><br>
        • Instead of traditional deep-fried potatoes: Try <strong>Air-fried Sweet Potato wedges with sea salt and rosemary</strong> (-50% calories, slashes oxidized seed oils, +400% Vitamin A).<br>
        • Craving crunchy snack? Try roasted chickpeas with smoked paprika!`;
    } else if (q.includes("dinner") || q.includes("eat")) {
        return `Based on your remaining budget (<strong>${remCal} kcal</strong> and <strong>${remP}g protein</strong>):<br>
        • <strong>Option A (Salmon & Greens):</strong> 200g Baked Salmon with asparagus and roasted carrots (~380 kcal, 41g protein).<br>
        • <strong>Option B (Plant-Powered):</strong> 200g Grilled Tofu with edamame and brown rice bowl (~420 kcal, 32g protein).`;
    } else {
        return `To support your fat-loss target with 1,850 kcal, prioritize protein distribution across 3-4 meals and keep water intake above 2.5L. You have ${remCal} kcal left today.`;
    }
}

// --- WEEKLY REPORT MODAL ---
function openWeeklyReportModal() {
    const modal = document.getElementById("report-modal");
    const body = document.getElementById("weekly-report-body");
    
    body.innerHTML = `
        <div style="background: #f1f5f9; padding: 14px; border-radius: 8px; margin-bottom: 14px;">
            <strong>Athlete:</strong> Alex Morgan | <strong>Goal:</strong> Fat Loss (1,850 kcal Target) | <strong>Compliance:</strong> 96.2%
        </div>
        <h4 style="margin: 12px 0 6px;">1. Caloric Energy Balance</h4>
        <p>• 7-Day Average: <strong>1,820 kcal/day</strong> (Target: 1,850 kcal/day). Result: Consistent 500 kcal deficit maintained without metabolic slowdown.</p>
        <h4 style="margin: 12px 0 6px;">2. Macronutrient Performance</h4>
        <p>• Average Protein: <strong>138.4g/day</strong> (Target: 135.0g). Sparing lean mass while losing fat tissue.</p>
        <p>• Average Dietary Fiber: <strong>26.2g/day</strong> (Target: 30.0g). Gut microbiome motility score: Good.</p>
        <h4 style="margin: 12px 0 6px;">3. Chrono-Nutrition Rhythm (RNN Model)</h4>
        <p>• Detected Pattern: <strong>Consistent & Metabolic-Optimal</strong>. Meal spacing averages 4.5 hours with zero late-night calorie spikes.</p>
        <h4 style="margin: 12px 0 6px;">4. Hydration</h4>
        <p>• Average Water: <strong>2,550 ml/day</strong> (Optimal cellular hydration).</p>
    `;
    modal.style.display = "flex";
}

function closeWeeklyReportModal() {
    document.getElementById("report-modal").style.display = "none";
}

function scrollToScanner() {
    document.getElementById("scanner-section").scrollIntoView({ behavior: 'smooth' });
}

function scrollToPatterns() {
    document.getElementById("pattern-section").scrollIntoView({ behavior: 'smooth' });
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function escapeHTML(str) { return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); }
