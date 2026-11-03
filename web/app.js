// ==============================================================================
// NUTRIAI APP CORE - USER-SPECIFIC AUTHENTICATION & ZERO-PREPOPULATION ENGINE
// ==============================================================================

let currentUserId = null;
let activeUser = null;
let dailyMeals = [];
let dailyWater = 0;
let activeScanItem = null;

function localDay() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
async function api(path, method = 'GET', body) {
    const response = await fetch('/api' + path, {
        method, credentials: 'same-origin',
        headers: body ? {'Content-Type': 'application/json'} : {},
        body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        if (response.status === 401) { clearAccount(); openAuthModal(); }
        throw new Error(typeof error.detail === 'string' ? error.detail : 'Please check your input and try again.');
    }
    return response.status === 204 ? null : response.json();
}
function clearAccount() {
    activeUser = null; currentUserId = null; dailyMeals = []; dailyWater = 0;
    document.querySelectorAll('.meal-log-entry').forEach(el => el.remove());
    ['profile-card-content','audit-report-content','oracle-ans-summary','oracle-ans-topic','oracle-ans-mechanism','oracle-ans-evidence','oracle-ans-protocol'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.replaceChildren();
    });
    ['dash-cal-fill','dash-p-fill','dash-c-fill','dash-f-fill','dash-water-fill'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.style.width='0%';
    });
    ['side-username','top-username','top-phone','active-user-subhead','coach-live-summary'].forEach(id => {
        const el = document.getElementById(id); if (el) el.textContent = 'Sign in to view your data';
    });
    ['dash-cal-consumed','dash-p-consumed','dash-c-consumed','dash-f-consumed','dash-water-num'].forEach(id => {
        const el = document.getElementById(id); if (el) el.textContent = '0';
    });
}
function setAccount(user) {
    currentUserId = user.id;
    activeUser = {id:user.id, name:user.full_name, phone:user.phone_number,
        avatar:user.full_name.split(' ').map(w=>w[0]).join('').slice(0,2),
        goal:user.primary_goal.replaceAll('_',' '), diet:user.dietary_preference,
        targets:{calories:user.daily_calorie_target, protein:user.daily_protein_target_g,
            carbs:user.daily_carbs_target_g, fat:user.daily_fat_target_g, water:user.daily_water_target_ml}};
}
function getUserMeals() { return dailyMeals; }
function getUserWater() { return dailyWater; }
async function refreshData() {
    const expectedUser = currentUserId;
    const summary = await api(`/summary/${expectedUser}?date_str=${localDay()}`);
    if (currentUserId !== expectedUser) return;
    dailyMeals = summary.meals_list.map(m => ({id:m.id, name:m.food_name,
        category:['breakfast','lunch','dinner'].includes(m.meal_type) ? m.meal_type : 'snacks',
        calories:m.calories, protein:m.protein_g, carbs:m.carbs_g, fat:m.fat_g}));
    dailyWater = summary.hydration.consumed_ml;
    renderCurrentUserData();
}
function escapeHtml(value) {
    const el = document.createElement('span'); el.textContent = String(value); return el.innerHTML;
}
document.addEventListener('DOMContentLoaded', async () => {
    // Remove credentials stored by previous demo versions.
    localStorage.removeItem('nutriai_accounts_v3');
    localStorage.removeItem('nutriai_active_user_id');
    try { setAccount(await api('/auth/me')); await refreshData(); }
    catch (error) { clearAccount(); openAuthModal(); showAuthAlert(error.message, 'error'); }
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
function getActiveUser() { return activeUser; }

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
            summaryEl.innerHTML = `Welcome, <strong>${escapeHtml(user.name)}</strong>! Your account (📱 ${escapeHtml(user.phone)}) has a completely clean slate today (<strong>0 kcal</strong> consumed). Your daily target is <strong>${tg.calories.toLocaleString()} kcal</strong> and <strong>${tg.protein}g protein</strong>. Tap any meal slot below or '+ Log Food' whenever you eat to start logging.`;
        } else {
            summaryEl.innerHTML = `<strong>${escapeHtml(user.name)}</strong>, you have logged <strong>${Math.round(totals.calories)} kcal</strong> and <strong>${totals.protein.toFixed(1)}g of protein</strong> today. You have <strong>${Math.max(0, (tg.protein - totals.protein).toFixed(1))}g protein</strong> and <strong>${Math.round(calRem)} kcal</strong> remaining in your daily budget.`;
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
                <div class="m-name">${escapeHtml(item.name)}</div>
                <div class="m-breakdown">${Math.round(item.calories)} kcal • P: ${item.protein}g • C: ${item.carbs}g • F: ${item.fat}g</div>
            </div>
            <button class="btn-del-meal" onclick="deleteUserMeal('${item.id}')" title="Delete meal">✕</button>
        </div>
    `).join("");
}

async function deleteUserMeal(mealId) {
    try { await api(`/meals/${encodeURIComponent(mealId)}`, 'DELETE'); await refreshData(); }
    catch (error) { alert(error.message); }
}
async function addWater(amount) {
    try { await api('/hydration', 'POST', {amount_ml:amount, log_date:localDay()}); await refreshData(); }
    catch (error) { alert(error.message); }
}
async function resetWater() {
    try { await api(`/hydration?day=${localDay()}`, 'DELETE'); await refreshData(); }
    catch (error) { alert(error.message); }
}

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

function fillDemoCredentials() { showAuthAlert('Create an account to begin. Demo accounts are disabled.', 'error'); }
async function handleLoginSubmit(e) {
    e.preventDefault();
    try {
        const result = await api('/auth/login', 'POST', {
            phone:document.getElementById('login-phone').value.trim(),
            password:document.getElementById('login-password').value});
        clearAccount(); setAccount(result.user); await refreshData(); closeAuthModal();
        document.getElementById('login-password').value = '';
    } catch (error) { showAuthAlert(error.message, 'error'); }
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

async function handleRegisterSubmit(e) {
    e.preventDefault();
    try {
        const result = await api('/auth/register', 'POST', {
            full_name:document.getElementById('reg-name').value.trim(),
            phone:document.getElementById('reg-phone').value.trim(),
            password:document.getElementById('reg-password').value,
            primary_goal:document.getElementById('reg-goal').value,
            daily_calorie_target:Number(document.getElementById('reg-cal').value),
            daily_protein_target_g:Number(document.getElementById('reg-prot').value)});
        clearAccount(); setAccount(result.user); await refreshData(); closeAuthModal();
        document.getElementById('reg-password').value = '';
    } catch (error) { showAuthAlert(error.message, 'error'); }
}
async function signOutUser() {
    try { await api('/auth/logout', 'POST'); clearAccount(); closeProfileModal(); openAuthModal(); }
    catch (error) { alert(error.message); }
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
    if (!activeUser) {openAuthModal();return;}
    const container=document.getElementById('profile-card-content');
    container.replaceChildren();
    const heading=document.createElement('h4'); heading.textContent=activeUser.name; container.appendChild(heading);
    const form=document.createElement('form');
    const fields=[['calories','Daily calories (kcal)','daily_calorie_target'],['protein','Protein (g)','daily_protein_target_g'],['carbs','Carbs (g)','daily_carbs_target_g'],['fat','Fat (g)','daily_fat_target_g'],['water','Water (ml)','daily_water_target_ml']];
    fields.forEach(([key,label,apiKey])=>{
        const el=document.createElement('label'); el.textContent=label;
        const input=document.createElement('input'); input.type='number'; input.step='any'; input.required=true;
        input.name=apiKey; input.value=activeUser.targets[key]; input.className='input-field-custom';
        el.appendChild(input); form.appendChild(el);
    });
    const save=document.createElement('button'); save.type='submit'; save.className='btn btn-primary'; save.textContent='Save targets'; form.appendChild(save);
    form.onsubmit=async event=>{
        event.preventDefault(); save.disabled=true;
        try {const body=Object.fromEntries(new FormData(form)); Object.keys(body).forEach(k=>body[k]=Number(body[k]));
            setAccount(await api('/profile/targets','PUT',body)); await refreshData(); closeProfileModal();
        } catch(error) {alert(error.message);} finally {save.disabled=false;}
    };
    container.appendChild(form);
    document.getElementById('profile-modal').style.display='flex';
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

async function handleSaveFoodLog(e) {
    e.preventDefault();
    const category = document.getElementById('log-meal-category').value;
    try {
        await api('/meals', 'POST', {
            food_name:document.getElementById('log-food-name').value.trim(),
            meal_type:category === 'snacks' ? 'afternoon_snack' : category,
            log_date:localDay(), calories:Number(document.getElementById('log-cal').value),
            protein_g:Number(document.getElementById('log-prot').value),
            carbs_g:Number(document.getElementById('log-carbs').value),
            fat_g:Number(document.getElementById('log-fat').value)});
        await refreshData(); closeLogModal();
        ['log-food-name','log-cal','log-prot','log-carbs','log-fat'].forEach(id=>document.getElementById(id).value='');
    } catch (error) { alert(error.message); }
}

// ==============================================================================
// OMNI-AI HEALTH & NUTRITION ORACLE ENGINE
// ==============================================================================
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

async function executeOracleSearch(query) {
    try {
        const result = await api('/oracle/ask', 'POST', {query});
        document.getElementById('oracle-ans-cat').textContent = 'Local reference guidance';
        document.getElementById('oracle-ans-topic').textContent = result.topic;
        document.getElementById('oracle-ans-summary').textContent = result.summary;
        document.getElementById('oracle-ans-mechanism').textContent = result.scientific_mechanism;
        document.getElementById('oracle-ans-evidence').textContent = result.clinical_evidence;
        const list = document.getElementById('oracle-ans-protocol'); list.replaceChildren();
        result.actionable_protocol.forEach(step=> {const li=document.createElement('li'); li.textContent=step; list.appendChild(li);});
        document.getElementById('oracle-result-box').style.display = 'block';
    } catch (error) { alert(error.message); }
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
    alert('Food recognition is not configured yet. Use Log Food to enter a meal and its nutrition.');
}
function adjustScanPortion() {}
function logScannedToDiary() { simulateLensCamera(); }
async function openWeeklyAuditModal() {
    if (!currentUserId) { openAuthModal(); return; }
    try {
        const report = await api(`/coach/weekly-report/${currentUserId}`);
        const container = document.getElementById('audit-report-content');
        container.style.whiteSpace = 'pre-wrap';
        container.textContent = `Past 7 days: ${report.days_with_meals} days with meals logged.
Average calories on logged days: ${report.average_calories_on_logged_days ?? 'No meals logged'}
Average protein on logged days: ${report.average_protein_on_logged_days ?? 'No meals logged'} g
Total water logged: ${report.total_water_ml} ml
Unlogged days are excluded from meal averages.`;
        document.getElementById('audit-modal').style.display='flex';
    } catch (error) { alert(error.message); }
}

function closeWeeklyAuditModal() {
    document.getElementById("audit-modal").style.display = "none";
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
