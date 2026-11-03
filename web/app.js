"use strict";
const $ = (id) => document.getElementById(id);
const state = {
  user: null,
  capabilities: {},
  date: "",
  summary: null,
  view: "today",
  editId: null,
  provenance: {},
  selectedFood: null,
  authMode: "login",
  epoch: 0,
};
const numeric = ["calories", "protein_g", "carbs_g", "fat_g", "fiber_g"];
const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
const escapeHTML = (value) => {
  const el = document.createElement("span");
  el.textContent = String(value ?? "");
  return el.innerHTML;
};
const iconPaths = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  chart: '<path d="M4 4v16h16M8 16v-4m5 4V8m5 8V5"/>',
  chat: '<path d="M20 11a8 8 0 0 1-8 8H4l1.5-4A8 8 0 1 1 20 11Z"/><path d="M8 10h8m-8 4h5"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  camera: '<path d="M4 6h4l2-3h4l2 3h4v14H4Z"/><circle cx="12" cy="12" r="4"/>',
  water: '<path d="M12 3s-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/>',
};
function hydrateIcons() {
  document
    .querySelectorAll("[data-icon]")
    .forEach(
      (el) =>
        (el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[el.dataset.icon] || ""}</svg>`),
    );
}
function localDay(timezone = state.user?.timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function prettyDay(day) {
  return new Date(day + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("toast").hidden = true), 4000);
}
function pageError(message) {
  $("page-error").textContent = message;
  $("page-error").hidden = !message;
}
async function request(path, method = "GET", body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const multipart = body instanceof FormData;
    const response = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: body && !multipart ? { "Content-Type": "application/json" } : {},
      body: body ? (multipart ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message = Array.isArray(data.detail)
        ? data.detail
            .map((e) => `${e.loc?.at(-1) || "Input"}: ${e.msg}`)
            .join(" ")
        : data.detail || "Something went wrong. Please try again.";
      if (response.status === 401 && message === "Please sign in") showAuth();
      throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
  } catch (error) {
    if (error.name === "AbortError")
      throw new Error("This is taking longer than expected. Please try again.");
    if (error instanceof TypeError)
      throw new Error(
        "Could not reach the server. Check your connection and try again.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
async function withBusy(target, action, errorId) {
  const buttons = target.matches("button")
    ? [target]
    : [...target.querySelectorAll("button")];
  const previous = buttons.map((b) => b.disabled);
  buttons.forEach((b) => (b.disabled = true));
  if (errorId) $(errorId).textContent = "";
  try {
    return await action();
  } catch (error) {
    if (errorId) $(errorId).textContent = error.message;
    else pageError(error.message);
  } finally {
    buttons.forEach((b, i) => (b.disabled = previous[i]));
  }
}
function formValues(form, numbers = []) {
  const values = Object.fromEntries(new FormData(form));
  numbers.forEach((key) => {
    if (key in values) values[key] = Number(values[key]);
  });
  return values;
}
function fillForm(form, values) {
  [...form.elements].forEach((el) => {
    if (el.name && values[el.name] !== undefined)
      el.value = values[el.name] ?? "";
  });
}
function showAuth() {
  state.user = null;
  state.summary = null;
  state.epoch++;
  document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  $("action-body").replaceChildren();
  $("chat-history").replaceChildren();
  $("meal-groups").replaceChildren();
  $("app-shell").hidden = true;
  $("auth-screen").hidden = false;
  $("loading-screen").hidden = true;
  setAuthMode("login");
}
function setAuthMode(mode) {
  state.authMode = mode;
  const signup = mode === "register";
  $("signup-name-wrap").hidden = !signup;
  $("auth-name").required = signup;
  $("password-hint").hidden = !signup;
  $("auth-password").minLength = signup ? 10 : 1;
  $("auth-password").autocomplete = signup
    ? "new-password"
    : "current-password";
  $("auth-title").textContent = signup
    ? "Make a little room for you."
    : "Welcome back.";
  $("auth-description").textContent = signup
    ? "Start fresh. Build a routine that fits your life."
    : "Sign in to pick up where you left off.";
  $("auth-submit").textContent = signup ? "Create account" : "Sign in";
  $("signin-tab").classList.toggle("selected", !signup);
  $("signup-tab").classList.toggle("selected", signup);
  $("auth-error").textContent = "";
}
async function signedIn(user) {
  state.user = user;
  state.epoch++;
  state.date = localDay();
  $("diary-date").value = state.date;
  $("auth-screen").hidden = true;
  $("app-shell").hidden = false;
  $("loading-screen").hidden = true;
  updateProfile();
  switchView("today");
  await loadDay();
}
function updateProfile() {
  if (!state.user) return;
  const user = state.user;
  $("sidebar-name").textContent = user.full_name;
  $("avatar").textContent = user.full_name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  $("onboarding-banner").hidden = !!user.onboarding_completed;
  fillForm($("profile-form"), {
    ...user,
    timezone: user.onboarding_completed
      ? user.timezone
      : Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  fillForm($("targets-form"), user);
  $("phone-status").textContent =
    `${user.phone_number} · ${user.phone_verified ? "Verified" : state.capabilities.phone_verification ? "Not verified" : "Phone verification currently unavailable"}`;
  $("verify-phone").hidden = !!user.phone_verified;
}
async function loadDay() {
  const epoch = state.epoch,
    day = state.date;
  if (!state.user) return;
  pageError("");
  try {
    const summary = await request(`/summary/${state.user.id}?date_str=${day}`);
    if (epoch !== state.epoch || day !== state.date) return;
    state.summary = summary;
    renderDay();
  } catch (error) {
    pageError(error.message);
  }
}
function renderDay() {
  const s = state.summary;
  if (!s) return;
  const cal = s.macros.calories;
  $("calories-consumed").textContent = fmt(cal.consumed);
  $("calories-target").textContent = fmt(cal.target);
  $("calorie-fill").style.width =
    Math.min(100, (cal.consumed / cal.target) * 100) + "%";
  $("energy-status").textContent = s.meals_list.length
    ? "A little more aware"
    : "Ready when you are";
  $("calorie-remaining").textContent = !s.meals_list.length
    ? "No meals logged. Start whenever you are ready."
    : cal.consumed > cal.target
      ? `${fmt(cal.consumed - cal.target)} kcal above your daily target.`
      : `${fmt(cal.remaining)} kcal remaining in your daily target.`;
  $("macro-rows").innerHTML = [
    ["protein_g", "Protein"],
    ["carbs_g", "Carbs"],
    ["fat_g", "Fat"],
  ]
    .map(([key, label]) => {
      const m = s.macros[key];
      return `<div class="macro-row"><span>${label}</span><div class="macro-bar"><span style="width:${Math.min(100, (m.consumed / Math.max(m.target, 1)) * 100)}%"></span></div><span class="macro-numbers"><strong>${fmt(m.consumed)}</strong> / ${fmt(m.target)}</span></div>`;
    })
    .join("");
  $("meal-count").textContent = s.meals_list.length
    ? `${s.meals_list.length} ${s.meals_list.length === 1 ? "meal" : "meals"} logged · ${prettyDay(state.date)}`
    : "Your meals, one at a time.";
  const groups = $("meal-groups");
  groups.replaceChildren();
  [
    ["breakfast", "Breakfast"],
    ["lunch", "Lunch"],
    ["dinner", "Dinner"],
    ["snacks", "Snacks"],
  ].forEach(([key, label]) => {
    const meals = s.meals_by_type[key],
      section = document.createElement("section");
    section.className = "meal-group";
    section.innerHTML = `<div class="meal-group-heading"><h3>${label}</h3><span>${meals.length ? fmt(meals.reduce((n, m) => n + m.calories, 0)) + " kcal" : "Nothing logged yet"}</span></div>`;
    meals.forEach((meal) => {
      const row = document.createElement("div");
      row.className = "meal-row";
      row.innerHTML = `<span class="food-letter" aria-hidden="true">${escapeHTML(meal.food_name[0]?.toUpperCase())}</span><div class="meal-info"><strong>${escapeHTML(meal.food_name)}</strong><p>P ${fmt(meal.protein_g)} g · C ${fmt(meal.carbs_g)} g · F ${fmt(meal.fat_g)} g</p></div><span class="meal-kcal">${fmt(meal.calories)}</span><button class="icon-button edit-meal" aria-label="Edit ${escapeHTML(meal.food_name)}">↗</button><button class="icon-button delete-meal" aria-label="Delete ${escapeHTML(meal.food_name)}">×</button>`;
      row.querySelector(".edit-meal").onclick = () =>
        openMeal(meal.meal_type, meal);
      row.querySelector(".delete-meal").onclick = () =>
        confirmAction(
          "Delete this meal?",
          "This removes the entry from your diary. You can log it again later.",
          "Delete meal",
          async () => {
            await request(`/meals/${meal.id}`, "DELETE");
            await loadDay();
          },
          true,
        );
      section.appendChild(row);
    });
    const add = document.createElement("button");
    add.className = meals.length ? "text-button small" : "empty-meal";
    add.textContent = `+ Add ${label.toLowerCase()}`;
    add.onclick = () => openMeal(key === "snacks" ? "afternoon_snack" : key);
    section.appendChild(add);
    groups.appendChild(section);
  });
  $("water-total").textContent = fmt(s.hydration.consumed_ml);
  $("water-target").textContent = fmt(s.hydration.target_ml);
  $("water-glasses").innerHTML = Array.from(
    { length: 8 },
    (_, i) =>
      `<span><i style="height:${Math.max(0, Math.min(100, ((s.hydration.consumed_ml / s.hydration.target_ml) * 8 - i) * 100))}%"></i></span>`,
  ).join("");
  const bio = s.biometrics;
  $("checkin-summary").textContent = bio
    ? [
        bio.weight_kg ? `${bio.weight_kg} kg` : null,
        bio.sleep_hours !== null ? `${bio.sleep_hours} hours sleep` : null,
        bio.energy_level ? `Energy ${bio.energy_level}/10` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const micros = s.micronutrients || {};
  $("micronutrient-totals").replaceChildren();
  Object.entries(micros).forEach(([key, value]) => {
    const row = document.createElement("div");
    row.className = "weight-row";
    row.textContent = `${key.replaceAll("_", " ")}: ${fmt(value.amount)} · from ${value.contributing_meals} meal(s)`;
    $("micronutrient-totals").appendChild(row);
  });
  if (!Object.keys(micros).length)
    $("micronutrient-totals").textContent =
      "No micronutrient data was recorded for this day.";
  if (state.view === "today")
    $("page-title").textContent =
      state.date === localDay()
        ? "Today, at your pace."
        : prettyDay(state.date) + ", in your own time.";
}
function switchView(view) {
  if (!state.user) return;
  state.view = view;
  pageError("");
  document
    .querySelectorAll(".view")
    .forEach((el) => (el.hidden = el.id !== `view-${view}`));
  document.querySelectorAll("[data-view]").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
    b.setAttribute("aria-current", b.dataset.view === view ? "page" : "false");
  });
  const titles = {
    today: ["YOUR DAILY PICTURE", "Today, at your pace."],
    progress: ["THE BIGGER PICTURE", "Progress, not perfection."],
    coach: ["A LITTLE PERSPECTIVE", "Let’s talk about it."],
    settings: ["MAKE IT YOURS", "A routine that fits you."],
  };
  $("page-eyebrow").textContent = titles[view][0];
  $("page-title").textContent = titles[view][1];
  document.querySelector(".date-control").hidden = view !== "today";
  $("add-food").hidden = view !== "today";
  if (view === "today") renderDay();
  if (view === "progress") loadProgress();
  if (view === "coach") loadChat();
  if (view === "settings") updateProfile();
}
function openMeal(category = "lunch", meal = null) {
  state.editId = meal?.id || null;
  state.selectedFood = null;
  state.provenance = meal
    ? {
        nutrition_source: meal.nutrition_source,
        source_url: meal.source_url,
        serving_g: meal.serving_g,
        micronutrients: JSON.parse(meal.micronutrients_json || "{}"),
      }
    : { nutrition_source: "Manual entry" };
  $("meal-form").reset();
  $("meal-error").textContent = "";
  $("food-results").replaceChildren();
  $("food-source").textContent = "";
  $("meal-dialog-title").textContent = meal ? "Edit your meal" : "Log a meal";
  fillForm($("meal-form"), {
    meal_type: category,
    log_date: state.date,
    ...meal,
  });
  $("meal-dialog").showModal();
}
async function loadProgress() {
  const epoch = state.epoch;
  try {
    const data = await request("/progress?days=14");
    if (!state.user || state.view !== "progress" || epoch !== state.epoch)
      return;
    const water = data.days.reduce((n, d) => n + d.water_ml, 0);
    $("progress-stats").innerHTML = [
      ["Days with meals", `${data.logged_days} / 14`],
      [
        "Average on logged days",
        data.average_calories === null
          ? "—"
          : fmt(data.average_calories) + " kcal",
      ],
      ["Water recorded", fmt(water / 1000) + " L"],
    ]
      .map(
        ([label, value]) =>
          `<article class="stat"><p>${label}</p><strong>${value}</strong></article>`,
      )
      .join("");
    const max = Math.max(1, ...data.days.map((d) => d.calories || 0));
    $("calorie-chart").innerHTML = data.days
      .map(
        (d) =>
          `<div class="chart-column" title="${escapeHTML(prettyDay(d.date))}: ${d.calories === null ? "no meals logged" : fmt(d.calories) + " kcal"}"><span class="bar-value">${d.calories === null ? "—" : Math.round(d.calories)}</span><div class="bar-slot">${d.calories === null ? "" : `<div class="bar" style="height:${Math.max(1, (d.calories / max) * 100)}%"></div>`}</div><span class="bar-label">${new Date(d.date + "T12:00:00").getDate()}</span></div>`,
      )
      .join("");
    $("calorie-chart").setAttribute(
      "aria-label",
      data.days
        .map(
          (d) =>
            `${d.date}: ${d.calories === null ? "not logged" : d.calories + " kcal"}`,
        )
        .join("; "),
    );
    const weights = data.days.filter((d) => d.weight_kg !== null);
    $("weight-history").innerHTML = weights.length
      ? weights
          .map(
            (d) =>
              `<div class="weight-row"><span>${prettyDay(d.date)}</span><strong>${fmt(d.weight_kg)} kg</strong></div>`,
          )
          .join("")
      : '<p class="muted small" style="padding-top:20px">No weight check-ins yet. Add one from your daily journal.</p>';
  } catch (error) {
    pageError(error.message);
  }
}
async function loadChat() {
  const epoch = state.epoch;
  try {
    const history = await request("/coach/history");
    if (!state.user || epoch !== state.epoch) return;
    $("coach-mode").textContent = state.capabilities.ai
      ? "Coaching with your recorded meals and preferences."
      : "A grounded summary of your daily records.";
    $("coach-privacy").textContent = state.capabilities.ai
      ? "Messages, recent conversation, daily totals, preferences, and allergies are sent to your configured AI provider. General guidance, not medical care."
      : "Conversational AI is not configured. You can still get a summary of your recorded day.";
    renderChat(history);
  } catch (error) {
    pageError(error.message);
  }
}
function renderChat(history) {
  const box = $("chat-history");
  box.replaceChildren();
  if (!history.length) {
    box.innerHTML =
      '<div class="chat-empty"><h3>Start with what’s on your mind.</h3><p class="small">A meal you enjoyed, a target you’re working toward, or just a check-in.</p></div>';
  }
  history.forEach((item) => {
    const el = document.createElement("article");
    el.className = "chat-message " + item.sender;
    const label = document.createElement("small");
    label.textContent = item.sender === "user" ? "YOU" : "NUTRIAI";
    el.append(label, document.createTextNode(item.message_text));
    box.appendChild(el);
  });
  box.scrollTop = box.scrollHeight;
}
function actionDialog(title, html) {
  $("action-title").textContent = title;
  $("action-body").innerHTML = html;
  if (!$("action-dialog").open) $("action-dialog").showModal();
}
function confirmAction(title, description, label, action, danger = false) {
  actionDialog(
    title,
    `<p class="muted small">${escapeHTML(description)}</p><form class="form-stack"><p class="form-error" role="alert"></p><button class="button ${danger ? "secondary danger" : "primary"}" type="submit">${escapeHTML(label)}</button></form>`,
  );
  const form = $("action-body").querySelector("form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    await withBusy(form, async () => {
      try {
        await action();
        $("action-dialog").close();
      } catch (error) {
        form.querySelector(".form-error").textContent = error.message;
      }
    });
  };
}
function download(value, filename, type = "application/json") {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function showRecoveryCodes(codes) {
  actionDialog(
    "Keep these somewhere safe.",
    `<p class="muted small">Each code can reset your password once. They are shown only now. Store them outside this device, like a password manager.</p><div class="recovery-code-list"></div><button class="button primary full" id="download-codes">Download recovery codes</button><button class="button quiet full" id="codes-done">I’ve saved my codes</button>`,
  );
  $("action-body").querySelector(".recovery-code-list").textContent =
    codes.join("\n");
  $("download-codes").onclick = () =>
    download(codes.join("\n"), "nutriai-recovery-codes.txt", "text/plain");
  $("codes-done").onclick = () => $("action-dialog").close();
}
function passwordAction(mode) {
  const regen = mode === "recovery";
  const deletion = mode === "delete";
  actionDialog(
    regen
      ? "New recovery codes"
      : deletion
        ? "Delete your account?"
        : "Change your password",
    `<p class="muted small">${regen ? "This replaces any unused recovery codes." : deletion ? "This permanently deletes your profile, meals, water, check-ins, and conversations. Export your data first if you want a copy." : "All sessions will be signed out after your password changes."}</p><form class="form-stack"><label>Current password<input type="password" name="current_password" autocomplete="current-password" required maxlength="128"></label>${!regen && !deletion ? '<label>New password<input type="password" name="new_password" autocomplete="new-password" required minlength="10" maxlength="128"></label>' : ""}<p class="form-error" role="alert"></p><button class="button ${deletion ? "secondary danger" : "primary"}" type="submit">${regen ? "Replace codes" : deletion ? "Permanently delete account" : "Change password"}</button></form>`,
  );
  const form = $("action-body").querySelector("form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    await withBusy(form, async () => {
      try {
        if (regen) {
          const data = await request(
            "/auth/recovery-codes",
            "POST",
            formValues(form),
          );
          showRecoveryCodes(data.recovery_codes);
        } else {
          await request(
            deletion ? "/account" : "/auth/password",
            deletion ? "DELETE" : "POST",
            formValues(form),
          );
          showAuth();
          toast(
            deletion
              ? "Your account has been deleted."
              : "Password changed. Sign in with your new password.",
          );
        }
      } catch (error) {
        form.querySelector(".form-error").textContent = error.message;
      }
    });
  };
}
function recoverAccount() {
  actionDialog(
    "Find your way back.",
    `<p class="muted small">Reset your password with one of your saved recovery codes.</p><form class="form-stack"><label>Phone number<input name="phone" type="tel" placeholder="+91 98765 43210" required></label><label>Recovery code<input name="recovery_code" autocomplete="off" required></label><label>New password<input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label><p class="form-error" role="alert"></p><button class="button primary" type="submit">Reset password</button></form>${state.capabilities.phone_verification ? '<button id="sms-recover" class="text-button">Use an SMS code instead</button>' : '<p class="small muted" style="margin-top:20px">SMS recovery is available when phone verification is configured. If you have no recovery codes, contact the app administrator.</p>'}`,
  );
  const form = $("action-body").querySelector("form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    await withBusy(form, async () => {
      try {
        await request("/auth/recover", "POST", formValues(form));
        $("action-dialog").close();
        setAuthMode("login");
        toast("Password reset. You can sign in now.");
      } catch (error) {
        form.querySelector(".form-error").textContent = error.message;
      }
    });
  };
  if ($("sms-recover")) $("sms-recover").onclick = () => smsFlow(false);
}
function smsFlow(verify = true) {
  if (!state.capabilities.phone_verification) {
    toast(
      "Phone verification has not been configured. Use recovery codes for password recovery.",
    );
    return;
  }
  actionDialog(
    verify ? "Verify your phone" : "Recover by SMS",
    `<p class="muted small">${verify ? "We’ll send a code to your account’s phone number." : "Enter the phone number you previously verified."}</p><form class="form-stack">${verify ? "" : '<label>Phone number<input name="phone" type="tel" required placeholder="+91 98765 43210"></label>'}<p class="form-error" role="alert"></p><button class="button primary" type="submit">Send code</button></form>`,
  );
  const form = $("action-body").querySelector("form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    await withBusy(form, async () => {
      try {
        const result = await request(
          verify ? "/auth/verification/start" : "/auth/reset/start",
          "POST",
          verify ? undefined : formValues(form),
        );
        actionDialog(
          "Check your messages.",
          `<p class="muted small">${verify ? "Enter the code sent to your phone." : "If the phone number is verified on an account, a code has been sent."}</p><form class="form-stack"><label>Verification code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{4,10}" required></label>${verify ? "" : '<label>New password<input name="new_password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label>'}<p class="form-error" role="alert"></p><button class="button primary" type="submit">${verify ? "Verify phone" : "Reset password"}</button></form>`,
        );
        const check = $("action-body").querySelector("form");
        check.onsubmit = async (event) => {
          event.preventDefault();
          await withBusy(check, async () => {
            try {
              const data = await request(
                verify ? "/auth/verification/check" : "/auth/reset/check",
                "POST",
                { ...formValues(check), challenge_id: result.challenge_id },
              );
              if (verify) {
                state.user = data;
                updateProfile();
              } else showAuth();
              $("action-dialog").close();
              toast(
                verify
                  ? "Phone verified."
                  : "Password reset. Sign in with your new password.",
              );
            } catch (error) {
              check.querySelector(".form-error").textContent = error.message;
            }
          });
        };
      } catch (error) {
        form.querySelector(".form-error").textContent = error.message;
      }
    });
  };
}
// Form actions are bound once; dynamic content uses text nodes for user-controlled values.
document
  .querySelectorAll("[data-close]")
  .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
$("action-dialog").addEventListener("close", () =>
  $("action-body").replaceChildren(),
);
$("signin-tab").onclick = () => setAuthMode("login");
$("signup-tab").onclick = () => setAuthMode("register");
$("forgot-password").onclick = recoverAccount;
$("show-password").onclick = () => {
  const show = $("auth-password").type === "password";
  $("auth-password").type = show ? "text" : "password";
  $("show-password").textContent = show ? "Hide" : "Show";
  $("show-password").setAttribute(
    "aria-label",
    show ? "Hide password" : "Show password",
  );
};
$("auth-form").onsubmit = async (event) => {
  event.preventDefault();
  await withBusy(
    $("auth-form"),
    async () => {
      const body = formValues($("auth-form"));
      if (state.authMode === "login") delete body.full_name;
      else body.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await request("/auth/" + state.authMode, "POST", body);
      $("auth-password").value = "";
      await signedIn(result.user);
      if (result.recovery_codes) showRecoveryCodes(result.recovery_codes);
    },
    "auth-error",
  );
};
document
  .querySelectorAll("[data-view]")
  .forEach((b) => (b.onclick = () => switchView(b.dataset.view)));
$("account-button").onclick = () => switchView("settings");
$("complete-profile").onclick = () => switchView("settings");
$("diary-date").onchange = () => {
  if (!$("diary-date").value) return;
  state.date = $("diary-date").value;
  loadDay();
};
function shiftDay(amount) {
  const d = new Date(state.date + "T12:00:00");
  d.setDate(d.getDate() + amount);
  state.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  $("diary-date").value = state.date;
  loadDay();
}
$("previous-day").onclick = () => shiftDay(-1);
$("next-day").onclick = () => shiftDay(1);
$("add-food").onclick = () => openMeal();
$("meal-form").onsubmit = async (event) => {
  event.preventDefault();
  await withBusy(
    $("meal-form"),
    async () => {
      const body = {
        ...formValues($("meal-form"), numeric),
        ...state.provenance,
      };
      const id = state.editId;
      await request(id ? "/meals/" + id : "/meals", id ? "PUT" : "POST", body);
      $("meal-dialog").close();
      state.date = body.log_date;
      $("diary-date").value = state.date;
      await loadDay();
      toast(id ? "Meal updated." : "Meal added to your day.");
    },
    "meal-error",
  );
};
document.querySelectorAll("[data-water]").forEach(
  (button) =>
    (button.onclick = () =>
      withBusy(button, async () => {
        await request("/hydration", "POST", {
          amount_ml: Number(button.dataset.water),
          log_date: state.date,
        });
        await loadDay();
      })),
);
$("water-reset").onclick = () =>
  confirmAction(
    "Reset water for this day?",
    "This clears the water recorded for " + prettyDay(state.date) + ".",
    "Reset water",
    async () => {
      await request("/hydration?day=" + state.date, "DELETE");
      await loadDay();
    },
  );
$("checkin-button").onclick = () => {
  $("checkin-form").reset();
  $("checkin-error").textContent = "";
  if (state.summary?.biometrics)
    fillForm($("checkin-form"), state.summary.biometrics);
  $("checkin-dialog").showModal();
};
$("checkin-form").onsubmit = async (event) => {
  event.preventDefault();
  await withBusy(
    $("checkin-form"),
    async () => {
      const values = formValues($("checkin-form"));
      Object.keys(values).forEach((k) => {
        if (values[k] === "") delete values[k];
        else if (k !== "notes") values[k] = Number(values[k]);
      });
      if (!Object.keys(values).length)
        throw new Error("Add at least one check-in value.");
      await request("/biometrics", "PUT", { ...values, log_date: state.date });
      state.user = await request("/auth/me");
      updateProfile();
      await loadDay();
      $("checkin-dialog").close();
      toast("Check-in saved.");
    },
    "checkin-error",
  );
};
$("profile-form").onsubmit = async (event) => {
  event.preventDefault();
  await withBusy($("profile-form"), async () => {
    state.user = await request(
      "/profile",
      "PUT",
      formValues($("profile-form"), [
        "age",
        "height_cm",
        "current_weight_kg",
        "target_weight_kg",
      ]),
    );
    updateProfile();
    await loadDay();
    $("profile-status").textContent = "Saved";
    toast("Profile updated.");
  });
};
$("targets-form").onsubmit = async (event) => {
  event.preventDefault();
  await withBusy($("targets-form"), async () => {
    state.user = await request(
      "/profile/targets",
      "PUT",
      formValues($("targets-form"), [
        "daily_calorie_target",
        "daily_protein_target_g",
        "daily_carbs_target_g",
        "daily_fat_target_g",
        "daily_water_target_ml",
      ]),
    );
    updateProfile();
    await loadDay();
    toast("Daily targets updated.");
  });
};
$("calculate-targets").onclick = () => {
  if (!state.user.onboarding_completed) {
    pageError(
      "Save your age, height, weight, and activity in your profile first.",
    );
    return;
  }
  const u = state.user;
  const bmr =
    10 * u.current_weight_kg +
    6.25 * u.height_cm -
    5 * u.age +
    (u.sex === "female" ? -161 : 5);
  const multiplier = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  }[u.activity_level];
  const calories = Math.max(
    800,
    Math.round(
      bmr * multiplier +
        (u.primary_goal === "fat_loss"
          ? -300
          : u.primary_goal === "muscle_gain"
            ? 200
            : 0),
    ),
  );
  const protein = Math.round(u.current_weight_kg * 1.6),
    fat = Math.round((calories * 0.25) / 9);
  fillForm($("targets-form"), {
    daily_calorie_target: calories,
    daily_protein_target_g: protein,
    daily_fat_target_g: fat,
    daily_carbs_target_g: Math.max(
      0,
      Math.round((calories - protein * 4 - fat * 9) / 4),
    ),
  });
  toast("Starting estimates filled in. Review and save if they suit you.");
};
$("refresh-progress").onclick = () =>
  withBusy($("refresh-progress"), loadProgress);
$("chat-form").onsubmit = async (event) => {
  event.preventDefault();
  const text = $("chat-input").value.trim();
  if (!text) return;
  await withBusy($("chat-form"), async () => {
    await request("/coach/chat", "POST", { message: text });
    $("chat-input").value = "";
    await loadChat();
  });
};
$("clear-chat").onclick = () =>
  confirmAction(
    "Clear this conversation?",
    "Your meal and hydration records will stay as they are.",
    "Clear conversation",
    async () => {
      await request("/coach/history", "DELETE");
      await loadChat();
    },
  );
$("change-password").onclick = () => passwordAction("password");
$("recovery-codes").onclick = () => passwordAction("recovery");
$("delete-account").onclick = () => passwordAction("delete");
$("verify-phone").onclick = () => smsFlow(true);
$("sign-out").onclick = () =>
  withBusy($("sign-out"), async () => {
    await request("/auth/logout", "POST");
    showAuth();
  });
$("export-data").onclick = () =>
  withBusy($("export-data"), async () => {
    const data = await request("/account/export");
    download(JSON.stringify(data, null, 2), "nutriai-export.json");
    toast("Your export is ready. Keep it somewhere private.");
  });
$("food-search").onclick = () =>
  withBusy(
    $("food-search"),
    async () => {
      const query = $("food-query").value.trim();
      if (query.length < 2)
        throw new Error("Type at least two characters to search.");
      const result = await request(
        "/foods/search?q=" + encodeURIComponent(query),
      );
      const box = $("food-results");
      box.replaceChildren();
      result.foods.forEach((food) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "food-result";
        button.innerHTML = `${escapeHTML(food.name)}<small>${escapeHTML(food.source)} · ${fmt(food.calories)} kcal per 100 g</small>`;
        button.onclick = () => {
          state.selectedFood = food;
          $("meal-form").elements.food_name.value = food.name;
          scaleFood();
          box.replaceChildren();
          $("food-source").textContent =
            food.source +
            (numeric.some((k) => food[k] === null)
              ? ". Some nutrients are missing; check the label."
              : "");
        };
        box.appendChild(button);
      });
      if (!result.foods.length)
        box.textContent =
          "No matching foods. You can enter a label’s nutrition below.";
    },
    "meal-error",
  );
function scaleFood() {
  if (!state.selectedFood) return;
  const portion = Number($("food-portion").value);
  state.provenance = {
    nutrition_source: state.selectedFood.source,
    source_url: state.selectedFood.source_url,
    serving_g: portion,
    micronutrients: Object.fromEntries(
      Object.entries(state.selectedFood.micronutrients || {}).map(([k, v]) => [
        k,
        Math.round(((v * portion) / 100) * 100) / 100,
      ]),
    ),
  };
  numeric.forEach((key) => {
    $("meal-form").elements[key].value =
      state.selectedFood[key] === null
        ? ""
        : Math.round((((state.selectedFood[key] || 0) * portion) / 100) * 10) /
          10;
  });
}
$("food-portion").oninput = scaleFood;
$("photo-food").onclick = () => {
  $("photo-error").textContent = "";
  $("photo-form").reset();
  $("photo-preview").hidden = true;
  $("photo-description").textContent = state.capabilities.vision
    ? "Choose a photo, then confirm the food and portions before saving."
    : "Photo analysis is not configured yet. Manual logging and food search are available.";
  $("photo-form").querySelector("button").disabled = !state.capabilities.vision;
  $("photo-dialog").showModal();
};
let previewURL = null;
$("photo-file").onchange = () => {
  if (previewURL) URL.revokeObjectURL(previewURL);
  const file = $("photo-file").files[0];
  if (!file) return;
  previewURL = URL.createObjectURL(file);
  $("photo-preview").src = previewURL;
  $("photo-preview").hidden = false;
};
$("photo-dialog").addEventListener("close", () => {
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = null;
  $("photo-preview").removeAttribute("src");
});
$("photo-form").onsubmit = async (event) => {
  event.preventDefault();
  await withBusy(
    $("photo-form"),
    async () => {
      const file = $("photo-file").files[0];
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Choose a photo smaller than 5 MB.");
      const body = new FormData();
      body.append("file", file);
      const data = await request("/predict/food-image", "POST", body);
      if (!data.estimate.is_food)
        throw new Error(
          "We could not identify food clearly. Try another photo or log the meal manually.",
        );
      $("photo-dialog").close();
      openMeal();
      fillForm($("meal-form"), data.estimate);
      state.provenance = {
        nutrition_source: "Photo estimate — user confirmed",
        serving_g: data.estimate.estimated_serving_g,
      };
      $("food-portion").value = data.estimate.estimated_serving_g;
      $("food-source").textContent =
        "Photo estimate · " +
        data.estimate.uncertainty +
        " Review the values before saving.";
    },
    "photo-error",
  );
};
localStorage.removeItem("nutriai_accounts_v3");
localStorage.removeItem("nutriai_active_user_id");
hydrateIcons();
(async () => {
  try {
    state.capabilities = await request("/capabilities");
    const user = await request("/auth/me");
    await signedIn(user);
  } catch (error) {
    showAuth();
    if (error.message !== "Please sign in")
      $("auth-error").textContent = error.message;
  }
})();
