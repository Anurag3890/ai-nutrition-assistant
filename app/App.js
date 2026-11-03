import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
  Image,
  Share,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
const API = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");
const colors = {
  paper: "#f6f5f0",
  white: "#fffefa",
  ink: "#252d27",
  muted: "#70766f",
  line: "#dedfd6",
  green: "#41664b",
  sage: "#e6ecdd",
};
const PROFILE = [
  ["full_name", "Your name"],
  ["age", "Age", "number"],
  ["sex", "Sex for energy estimates", ["male", "female", "other"]],
  ["height_cm", "Height · cm", "number"],
  ["current_weight_kg", "Current weight · kg", "number"],
  ["target_weight_kg", "Target weight · kg", "number"],
  [
    "activity_level",
    "Activity",
    [
      "sedentary",
      "lightly_active",
      "moderately_active",
      "very_active",
      "extra_active",
    ],
  ],
  [
    "primary_goal",
    "Focus",
    [
      "maintenance",
      "fat_loss",
      "muscle_gain",
      "athletic_performance",
      "metabolic_health",
      "general_wellness",
    ],
  ],
  [
    "dietary_preference",
    "Eating preference",
    [
      "omnivore",
      "vegetarian",
      "vegan",
      "pescatarian",
      "mediterranean",
      "low_carb",
      "keto",
      "paleo",
      "custom",
    ],
  ],
  ["allergies", "Allergies"],
  ["medical_conditions", "Health context · optional"],
  ["timezone", "Timezone"],
];
const TARGETS = [
  ["daily_calorie_target", "Energy · kcal", "number"],
  ["daily_protein_target_g", "Protein · g", "number"],
  ["daily_carbs_target_g", "Carbohydrate · g", "number"],
  ["daily_fat_target_g", "Fat · g", "number"],
  ["daily_water_target_ml", "Water · ml", "number"],
];
const MEAL = [
  ["food_name", "Food or meal"],
  ["meal_type", "Meal", ["breakfast", "lunch", "dinner", "afternoon_snack"]],
  ["log_date", "Date · YYYY-MM-DD"],
  ["calories", "Calories · kcal", "number"],
  ["protein_g", "Protein · g", "number"],
  ["carbs_g", "Carbohydrate · g", "number"],
  ["fat_g", "Fat · g", "number"],
  ["fiber_g", "Fiber · g", "number"],
];
const BIO = [
  ["weight_kg", "Weight · kg", "number"],
  ["sleep_hours", "Sleep · hours", "number"],
  ["energy_level", "Energy · 1 to 10", "number"],
  ["sleep_quality", "Sleep quality · 1 to 10", "number"],
  ["notes", "A note to yourself"],
];
const title = (value) => value.replaceAll("_", " ");
function day(timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function Btn({
  label,
  onPress,
  secondary = false,
  disabled = false,
  danger = false,
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && { color: colors.ink },
          danger && { color: "#a63d36" },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
function Field({ label, value, onChange, kind }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      {Array.isArray(kind) ? (
        <View style={styles.choices}>
          {kind.map((option) => (
            <TouchableOpacity
              key={option}
              accessibilityRole="button"
              onPress={() => onChange(option)}
              style={[styles.choice, value === option && styles.chosen]}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: value === option ? colors.green : colors.muted,
                }}
              >
                {title(option)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <TextInput
          accessibilityLabel={label}
          style={styles.input}
          value={String(value ?? "")}
          onChangeText={onChange}
          keyboardType={kind === "number" ? "decimal-pad" : "default"}
          secureTextEntry={kind === "password"}
          autoCapitalize={kind === "password" ? "none" : "sentences"}
        />
      )}
    </View>
  );
}

export default function App() {
  const token = useRef(""),
    epoch = useRef(0),
    dayRef = useRef("");
  const [user, setUser] = useState(null),
    [caps, setCaps] = useState({}),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [authMode, setAuthMode] = useState("login"),
    [phone, setPhone] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [recoveryCode, setRecoveryCode] = useState("");
  const [tab, setTab] = useState("Today"),
    [date, setDate] = useState(day()),
    [summary, setSummary] = useState(null),
    [progress, setProgress] = useState(null),
    [history, setHistory] = useState([]),
    [question, setQuestion] = useState("");
  const [editor, setEditor] = useState(null),
    [values, setValues] = useState({}),
    [codes, setCodes] = useState(null),
    [modalError, setModalError] = useState(""),
    [foodQuery, setFoodQuery] = useState(""),
    [foods, setFoods] = useState([]),
    [portion, setPortion] = useState("100"),
    [selectedFood, setSelectedFood] = useState(null),
    [source, setSource] = useState("");
  const [profile, setProfile] = useState({}),
    [targets, setTargets] = useState({}),
    [security, setSecurity] = useState(null),
    [currentPassword, setCurrentPassword] = useState(""),
    [newPassword, setNewPassword] = useState(""),
    [challenge, setChallenge] = useState(null),
    [otp, setOtp] = useState("");
  async function saveToken(value) {
    token.current = value;
    if (Platform.OS !== "web") {
      if (value) await SecureStore.setItemAsync("nutriai.session", value);
      else await SecureStore.deleteItemAsync("nutriai.session");
    }
  }
  async function clearSession() {
    epoch.current++;
    await saveToken("");
    setUser(null);
    setSummary(null);
    setHistory([]);
    setProgress(null);
    setQuestion("");
    setEditor(null);
    setSecurity(null);
    setCodes(null);
    setProfile({});
    setTargets({});
  }
  async function api(path, method = "GET", body) {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 60000);
    try {
      const multipart = body instanceof FormData;
      const response = await fetch(API + "/api" + path, {
        method,
        credentials: "include",
        headers: {
          ...(body && !multipart ? { "Content-Type": "application/json" } : {}),
          ...(token.current
            ? { Authorization: "Bearer " + token.current }
            : {}),
        },
        body: body ? (multipart ? body : JSON.stringify(body)) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = Array.isArray(data.detail)
          ? data.detail
              .map((e) => `${e.loc?.at(-1) || "Input"}: ${e.msg}`)
              .join(" ")
          : data.detail || "Please try again.";
        if (response.status === 401 && message === "Please sign in")
          await clearSession();
        throw new Error(message);
      }
      return response.status === 204 ? null : response.json();
    } catch (e) {
      if (e.name === "AbortError")
        throw new Error("The request took too long. Please try again.");
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  async function run(action, modal = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    setModalError("");
    try {
      await action();
    } catch (e) {
      (modal ? setModalError : setError)(e.message);
    } finally {
      setBusy(false);
    }
  }
  function assignUser(account) {
    setUser(account);
    setProfile({
      ...account,
      timezone: account.onboarding_completed
        ? account.timezone
        : Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setTargets(account);
  }
  async function refresh(account = user, targetDate = dayRef.current) {
    if (!account) return;
    const expected = epoch.current;
    const data = await api(`/summary/${account.id}?date_str=${targetDate}`);
    if (expected === epoch.current && targetDate === dayRef.current)
      setSummary(data);
  }
  async function signedIn(result) {
    await saveToken(result.access_token);
    assignUser(result.user);
    epoch.current++;
    const today = day(result.user.timezone);
    dayRef.current = today;
    setDate(today);
    setTab("Today");
    await refresh(result.user, today);
    if (result.recovery_codes) setCodes(result.recovery_codes);
  }
  useEffect(() => {
    (async () => {
      try {
        setCaps(await api("/capabilities"));
        if (Platform.OS !== "web")
          token.current =
            (await SecureStore.getItemAsync("nutriai.session")) || "";
        const account = await api("/auth/me");
        assignUser(account);
        const today = day(account.timezone);
        setDate(today);
        dayRef.current = today;
        await refresh(account, today);
      } catch (e) {
        if (e.message !== "Please sign in") setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  async function navigate(view) {
    setTab(view);
    setError("");
    if (view === "Progress")
      await run(async () => setProgress(await api("/progress?days=14")));
    if (view === "Coach")
      await run(async () => setHistory(await api("/coach/history")));
    if (view === "Settings") {
      const account = await api("/auth/me");
      assignUser(account);
    }
  }
  async function moveDay(amount) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + amount);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setDate(next);
    dayRef.current = next;
    await run(() => refresh(user, next));
  }
  function openMeal(meal = null) {
    setEditor({ type: "meal", id: meal?.id });
    setValues(
      meal
        ? { ...meal }
        : {
            food_name: "",
            meal_type: "lunch",
            log_date: date,
            calories: "",
            protein_g: "0",
            carbs_g: "0",
            fat_g: "0",
            fiber_g: "0",
          },
    );
    setFoods([]);
    setSelectedFood(null);
    setSource("");
    setPortion("100");
    setModalError("");
  }
  function converted(schema, data, omitEmpty = false) {
    const result = {};
    schema.forEach(([key, , kind]) => {
      if (omitEmpty && (data[key] === "" || data[key] == null)) return;
      result[key] = kind === "number" ? Number(data[key]) : (data[key] ?? "");
    });
    return result;
  }
  async function saveEditor() {
    if (editor.type === "meal") {
      const body = converted(MEAL, values);
      for (const key of ["calories", "protein_g", "carbs_g", "fat_g"]) {
        if (values[key] === "" || values[key] == null)
          throw new Error(
            "Enter the nutrition values; missing values cannot be assumed to be zero.",
          );
      }
      body.nutrition_source =
        values.nutrition_source || selectedFood?.source || "Manual entry";
      body.source_url = values.source_url || selectedFood?.source_url || null;
      body.serving_g = selectedFood
        ? Number(portion)
        : values.serving_g || null;
      body.micronutrients = selectedFood
        ? Object.fromEntries(
            Object.entries(selectedFood.micronutrients || {}).map(([k, v]) => [
              k,
              Math.round(((v * Number(portion)) / 100) * 100) / 100,
            ]),
          )
        : JSON.parse(values.micronutrients_json || "{}");
      await api(
        editor.id ? "/meals/" + editor.id : "/meals",
        editor.id ? "PUT" : "POST",
        body,
      );
    } else {
      await api("/biometrics", "PUT", {
        ...converted(BIO, values, true),
        log_date: date,
      });
      assignUser(await api("/auth/me"));
    }
    setEditor(null);
    await refresh();
  }
  function confirmDeleteMeal(meal) {
    if (Platform.OS === "web") {
      if (window.confirm("Delete " + meal.food_name + "?"))
        run(async () => {
          await api("/meals/" + meal.id, "DELETE");
          await refresh();
        });
    } else
      Alert.alert("Delete meal?", meal.food_name, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            run(async () => {
              await api("/meals/" + meal.id, "DELETE");
              await refresh();
            }),
        },
      ]);
  }
  async function choosePhoto(camera) {
    if (!caps.vision)
      throw new Error(
        "Photo analysis is not configured. Use manual logging or food search.",
      );
    let result;
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          "Camera permission was not granted. You can choose an existing photo instead.",
        );
      result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: false,
      });
    } else
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
    if (result.canceled) return;
    const photo = result.assets[0];
    const body = new FormData();
    if (Platform.OS === "web") {
      const blob = await (await fetch(photo.uri)).blob();
      body.append("file", blob, photo.fileName || "meal.jpg");
    } else
      body.append("file", {
        uri: photo.uri,
        name: photo.fileName || "meal.jpg",
        type: photo.mimeType || "image/jpeg",
      });
    const answer = await api("/predict/food-image", "POST", body);
    if (!answer.estimate.is_food)
      throw new Error(
        "Food was not clear in this photo. Try another photo or enter your meal manually.",
      );
    openMeal();
    setValues((v) => ({
      ...v,
      ...answer.estimate,
      nutrition_source: "Photo estimate — user confirmed",
      serving_g: answer.estimate.estimated_serving_g,
    }));
    setSource(
      "Photo estimate: " +
        answer.estimate.uncertainty +
        " Review before saving.",
    );
  }
  function securityAction(mode) {
    setSecurity(mode);
    setCurrentPassword("");
    setNewPassword("");
    setOtp("");
    setChallenge(null);
    setModalError("");
  }
  async function saveSecurity() {
    if (security === "password") {
      await api("/auth/password", "POST", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      await clearSession();
      setError("Password changed. Sign in with the new password.");
    } else if (security === "codes") {
      const answer = await api("/auth/recovery-codes", "POST", {
        current_password: currentPassword,
      });
      setSecurity(null);
      setCodes(answer.recovery_codes);
    } else if (security === "delete") {
      await api("/account", "DELETE", { current_password: currentPassword });
      await clearSession();
    } else if (security === "verify") {
      if (!challenge) {
        const answer = await api("/auth/verification/start", "POST");
        setChallenge(answer.challenge_id);
      } else {
        assignUser(
          await api("/auth/verification/check", "POST", {
            challenge_id: challenge,
            code: otp,
          }),
        );
        setSecurity(null);
      }
    } else if (security === "smsReset") {
      if (!challenge) {
        const answer = await api("/auth/reset/start", "POST", { phone });
        setChallenge(answer.challenge_id);
      } else {
        await api("/auth/reset/check", "POST", {
          challenge_id: challenge,
          code: otp,
          new_password: newPassword,
        });
        setSecurity(null);
        setAuthMode("login");
        setError("Password reset. Sign in with your new password.");
      }
    }
  }
  function action(label, fn, secondary = false) {
    return (
      <Btn
        label={label}
        onPress={() => run(fn)}
        secondary={secondary}
        disabled={busy}
      />
    );
  }
  function editFields(schema, data, setData) {
    return schema.map(([key, label, kind]) => (
      <Field
        key={key}
        label={label}
        value={data[key]}
        kind={kind}
        onChange={(value) => setData((v) => ({ ...v, [key]: value }))}
      />
    ));
  }
  if (loading)
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.wordmark}>nutriai</Text>
          <ActivityIndicator color={colors.green} />
        </View>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.wordmark}>
          nutri<Text style={{ fontWeight: "400" }}>ai</Text>
        </Text>
        {!user ? (
          <>
            <Text style={styles.eyebrow}>A LITTLE MORE BALANCE</Text>
            <Text style={styles.hero}>
              {authMode === "register"
                ? "Make room for you."
                : authMode === "recover"
                  ? "Find your way back."
                  : "Welcome back."}
            </Text>
            <Text style={styles.muted}>
              Your food. Your pace. One day at a time.
            </Text>
            {authMode === "register" && (
              <Field label="Your name" value={name} onChange={setName} />
            )}
            <Field
              label="Phone number · include country code"
              value={phone}
              onChange={setPhone}
            />
            {authMode === "recover" && (
              <Field
                label="Recovery code"
                value={recoveryCode}
                onChange={setRecoveryCode}
              />
            )}
            <Field
              label={authMode === "recover" ? "New password" : "Password"}
              value={password}
              onChange={setPassword}
              kind="password"
            />
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
            {action(
              authMode === "register"
                ? "Create account"
                : authMode === "recover"
                  ? "Reset password"
                  : "Sign in",
              async () => {
                if (authMode === "recover") {
                  await api("/auth/recover", "POST", {
                    phone,
                    password,
                    recovery_code: recoveryCode,
                  });
                  setAuthMode("login");
                  setPassword("");
                  setError("Password reset. Sign in to continue.");
                  return;
                }
                const result = await api("/auth/" + authMode, "POST", {
                  phone,
                  password,
                  ...(authMode === "register"
                    ? {
                        full_name: name,
                        timezone:
                          Intl.DateTimeFormat().resolvedOptions().timeZone,
                      }
                    : {}),
                });
                await signedIn(result);
                setPassword("");
              },
            )}
            {action(
              authMode === "register"
                ? "Already registered? Sign in"
                : "Create an account",
              async () => {
                setAuthMode(authMode === "register" ? "login" : "register");
              },
              true,
            )}
            {action(
              authMode === "recover" ? "Back to sign in" : "Forgot password?",
              async () =>
                setAuthMode(authMode === "recover" ? "login" : "recover"),
              true,
            )}
            {authMode === "recover" &&
              caps.phone_verification &&
              action(
                "Recover with SMS",
                async () => securityAction("smsReset"),
                true,
              )}
          </>
        ) : (
          <>
            <View style={styles.tabs}>
              {["Today", "Progress", "Coach", "Settings"].map((view) => (
                <TouchableOpacity
                  key={view}
                  accessibilityRole="button"
                  accessibilityState={{ selected: tab === view }}
                  onPress={() => {
                    if (!busy) navigate(view).catch((e) => setError(e.message));
                  }}
                  style={[styles.tab, tab === view && styles.activeTab]}
                >
                  <Text
                    style={{
                      color: tab === view ? colors.green : colors.muted,
                      fontSize: 12,
                      fontWeight: tab === view ? "700" : "400",
                    }}
                  >
                    {view}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
            {busy && <ActivityIndicator color={colors.green} />}
            {tab === "Today" && (
              <>
                <Text style={styles.eyebrow}>YOUR DAILY PICTURE</Text>
                <Text style={styles.hero}>Today, at your pace.</Text>
                <View style={styles.dateRow}>
                  <Btn
                    label="‹ Previous"
                    secondary
                    disabled={busy}
                    onPress={() => moveDay(-1)}
                  />
                  <Text style={styles.label}>{date}</Text>
                  <Btn
                    label="Next ›"
                    secondary
                    disabled={busy}
                    onPress={() => moveDay(1)}
                  />
                </View>
                {!user.onboarding_completed && (
                  <View style={styles.notice}>
                    <Text>
                      Make this space yours. Add your profile details.
                    </Text>
                    {action("Set up profile", () => navigate("Settings"), true)}
                  </View>
                )}
                {summary && (
                  <>
                    <View style={styles.energy}>
                      <Text style={styles.eyebrow}>DAILY ENERGY</Text>
                      <Text style={styles.energyNumber}>
                        {summary.macros.calories.consumed}
                        <Text style={styles.energyTarget}>
                          {" "}
                          / {summary.macros.calories.target} kcal
                        </Text>
                      </Text>
                      <View style={styles.track}>
                        <View
                          style={{
                            height: 5,
                            width:
                              Math.min(
                                100,
                                (summary.macros.calories.consumed /
                                  summary.macros.calories.target) *
                                  100,
                              ) + "%",
                            backgroundColor: colors.green,
                          }}
                        />
                      </View>
                      <Text style={styles.muted}>
                        {summary.macros.calories.remaining} kcal remaining in
                        your target
                      </Text>
                    </View>
                    <View style={styles.macroRow}>
                      {[
                        ["protein_g", "Protein"],
                        ["carbs_g", "Carbs"],
                        ["fat_g", "Fat"],
                      ].map(([key, label]) => (
                        <View key={key}>
                          <Text style={styles.muted}>{label}</Text>
                          <Text style={styles.macroNumber}>
                            {summary.macros[key].consumed}
                            <Text style={styles.caption}>
                              {" "}
                              / {summary.macros[key].target} g
                            </Text>
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
                <View style={styles.headingRow}>
                  <Text style={styles.sectionTitle}>On the menu</Text>
                  <Btn label="+ Log food" onPress={() => openMeal()} />
                </View>
                {summary?.meals_list.length ? (
                  summary.meals_list.map((meal) => (
                    <View key={meal.id} style={styles.mealRow}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={styles.label}>{meal.food_name}</Text>
                        <Text style={styles.caption}>
                          {title(meal.meal_type)} · P {meal.protein_g} g · C{" "}
                          {meal.carbs_g} g · F {meal.fat_g} g
                        </Text>
                      </View>
                      <Text style={styles.label}>{meal.calories}</Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={"Edit " + meal.food_name}
                        onPress={() => openMeal(meal)}
                        style={styles.smallButton}
                      >
                        <Text>↗</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={"Delete " + meal.food_name}
                        onPress={() => confirmDeleteMeal(meal)}
                        style={styles.smallButton}
                      >
                        <Text>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.empty}>
                    Nothing logged yet. Start whenever you’re ready.
                  </Text>
                )}
                <View style={styles.card}>
                  <Text style={styles.eyebrow}>A MOMENT TO HYDRATE</Text>
                  <Text style={styles.sectionTitle}>
                    {summary?.hydration.consumed_ml || 0}
                    <Text style={styles.caption}>
                      {" "}
                      / {summary?.hydration.target_ml || 0} ml
                    </Text>
                  </Text>
                  <View style={styles.headingRow}>
                    {action(
                      "+ 250 ml",
                      async () => {
                        await api("/hydration", "POST", {
                          amount_ml: 250,
                          log_date: date,
                        });
                        await refresh();
                      },
                      true,
                    )}
                    {action(
                      "+ 500 ml",
                      async () => {
                        await api("/hydration", "POST", {
                          amount_ml: 500,
                          log_date: date,
                        });
                        await refresh();
                      },
                      true,
                    )}
                  </View>
                </View>
                <View style={styles.checkin}>
                  <Text style={styles.eyebrow}>BEYOND THE NUMBERS</Text>
                  <Text style={styles.sectionTitle}>How are you feeling?</Text>
                  <Text style={styles.muted}>
                    A small check-in can help you see the bigger picture.
                  </Text>
                  <Btn
                    secondary
                    label="Daily check-in ↗"
                    onPress={() => {
                      setEditor({ type: "bio" });
                      setValues(summary?.biometrics || {});
                      setModalError("");
                    }}
                  />
                </View>
                <Text style={styles.caption}>
                  Photo analysis sends a photo to the configured provider.
                  Review estimates before saving.
                </Text>
                <View style={styles.headingRow}>
                  {action("Choose photo", () => choosePhoto(false), true)}
                  {Platform.OS !== "web" &&
                    action("Take photo", () => choosePhoto(true), true)}
                </View>
              </>
            )}
            {tab === "Progress" && (
              <>
                <Text style={styles.eyebrow}>THE BIGGER PICTURE</Text>
                <Text style={styles.hero}>Progress, not perfection.</Text>
                <Text style={styles.muted}>
                  The last two weeks. Unlogged days are excluded from averages.
                </Text>
                {progress && (
                  <>
                    <View style={styles.card}>
                      <Text style={styles.sectionTitle}>
                        {progress.logged_days} days with meals
                      </Text>
                      <Text>
                        Average on logged days:{" "}
                        {progress.average_calories ?? "—"} kcal
                      </Text>
                    </View>
                    {progress.days.map((d) => (
                      <View key={d.date} style={styles.mealRow}>
                        <Text style={{ flex: 1 }}>{d.date}</Text>
                        <Text>
                          {d.calories === null ? "—" : d.calories + " kcal"}
                        </Text>
                        {d.weight_kg !== null && (
                          <Text style={styles.caption}>{d.weight_kg} kg</Text>
                        )}
                      </View>
                    ))}
                  </>
                )}
                <Text style={styles.caption}>
                  These are recorded totals, not a forecast or diagnosis.
                </Text>
              </>
            )}
            {tab === "Coach" && (
              <>
                <Text style={styles.hero}>A little perspective.</Text>
                <Text style={styles.muted}>
                  {caps.ai
                    ? "Messages, recent conversation, daily totals, preferences and allergies are sent to your configured AI provider."
                    : "A summary of your recorded day. Conversational AI is not configured."}
                </Text>
                {history.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.message,
                      item.sender === "user" && styles.userMessage,
                    ]}
                  >
                    <Text style={styles.eyebrow}>
                      {item.sender === "user" ? "YOU" : "NUTRIAI"}
                    </Text>
                    <Text style={{ lineHeight: 23 }}>{item.message_text}</Text>
                  </View>
                ))}
                <Field
                  label="Your message"
                  value={question}
                  onChange={setQuestion}
                />
                {action("Send ↑", async () => {
                  if (!question.trim()) return;
                  await api("/coach/chat", "POST", {
                    message: question.trim(),
                  });
                  setQuestion("");
                  setHistory(await api("/coach/history"));
                })}
                <Text style={styles.caption}>
                  General guidance, not medical care.
                </Text>
              </>
            )}
            {tab === "Settings" && (
              <>
                <Text style={styles.hero}>Make it yours.</Text>
                <Text style={styles.sectionTitle}>Your profile</Text>
                {editFields(PROFILE, profile, setProfile)}
                {action("Save profile", async () => {
                  assignUser(
                    await api("/profile", "PUT", converted(PROFILE, profile)),
                  );
                  await refresh();
                })}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                  Daily targets
                </Text>
                {editFields(TARGETS, targets, setTargets)}
                {action("Save targets", async () => {
                  assignUser(
                    await api(
                      "/profile/targets",
                      "PUT",
                      converted(TARGETS, targets),
                    ),
                  );
                  await refresh();
                })}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                  Account & privacy
                </Text>
                <Text>
                  {user.phone_number} ·{" "}
                  {user.phone_verified ? "Verified" : "Not verified"}
                </Text>
                {!user.phone_verified &&
                  action(
                    "Verify phone",
                    async () => {
                      if (!caps.phone_verification)
                        throw new Error(
                          "Phone verification is not configured.",
                        );
                      securityAction("verify");
                    },
                    true,
                  )}
                {action(
                  "Change password",
                  async () => securityAction("password"),
                  true,
                )}
                {action(
                  "Recovery codes",
                  async () => securityAction("codes"),
                  true,
                )}
                {action(
                  "Export my data",
                  async () => {
                    const data = await api("/account/export");
                    if (Platform.OS === "web") {
                      const blob = new Blob([JSON.stringify(data, null, 2)], {
                          type: "application/json",
                        }),
                        url = URL.createObjectURL(blob),
                        a = document.createElement("a");
                      a.href = url;
                      a.download = "nutriai-export.json";
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    } else
                      await Share.share({
                        message: JSON.stringify(data, null, 2),
                      });
                  },
                  true,
                )}
                {action(
                  "Sign out",
                  async () => {
                    await api("/auth/logout", "POST");
                    await clearSession();
                  },
                  true,
                )}
                {action(
                  "Delete account",
                  async () => securityAction("delete"),
                  true,
                )}
              </>
            )}
          </>
        )}
        <Text style={styles.footer}>Keep showing up for yourself.</Text>
      </ScrollView>
      <Modal
        visible={!!editor}
        animationType="slide"
        onRequestClose={() => setEditor(null)}
      >
        <SafeAreaView style={styles.screen}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headingRow}>
              <Text style={styles.sectionTitle}>
                {editor?.type === "meal"
                  ? editor.id
                    ? "Edit your meal"
                    : "Log a meal"
                  : "How was your day?"}
              </Text>
              <Btn
                label="Close"
                secondary
                onPress={() => setEditor(null)}
                disabled={busy}
              />
            </View>
            {editor?.type === "meal" && (
              <>
                <Field
                  label="Search foods"
                  value={foodQuery}
                  onChange={setFoodQuery}
                />
                <Btn
                  label="Search"
                  secondary
                  disabled={busy}
                  onPress={() =>
                    run(async () => {
                      setFoods(
                        (
                          await api(
                            "/foods/search?q=" + encodeURIComponent(foodQuery),
                          )
                        ).foods,
                      );
                    }, true)
                  }
                />
                {foods.map((food) => (
                  <TouchableOpacity
                    key={food.id}
                    accessibilityRole="button"
                    style={styles.mealRow}
                    onPress={() => {
                      setSelectedFood(food);
                      setSource(food.source);
                      setValues((v) => ({
                        ...v,
                        food_name: food.name,
                        ...Object.fromEntries(
                          [
                            "calories",
                            "protein_g",
                            "carbs_g",
                            "fat_g",
                            "fiber_g",
                          ].map((k) => [k, food[k] ?? ""]),
                        ),
                      }));
                      setFoods([]);
                      setPortion("100");
                    }}
                  >
                    <View>
                      <Text>{food.name}</Text>
                      <Text style={styles.caption}>
                        {food.source} · {food.calories} kcal per 100 g
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <Field
                  label="Portion · g (for selected food)"
                  value={portion}
                  kind="number"
                  onChange={(v) => {
                    setPortion(v);
                    if (selectedFood)
                      setValues((previous) => ({
                        ...previous,
                        ...Object.fromEntries(
                          [
                            "calories",
                            "protein_g",
                            "carbs_g",
                            "fat_g",
                            "fiber_g",
                          ].map((k) => [
                            k,
                            selectedFood[k] === null
                              ? ""
                              : Math.round(
                                  (((selectedFood[k] || 0) * Number(v)) / 100) *
                                    10,
                                ) / 10,
                          ]),
                        ),
                      }));
                  }}
                />
                {source ? <Text style={styles.caption}>{source}</Text> : null}
              </>
            )}
            {editFields(
              editor?.type === "meal" ? MEAL : BIO,
              values,
              setValues,
            )}
            {modalError ? (
              <Text style={styles.error} accessibilityRole="alert">
                {modalError}
              </Text>
            ) : null}
            <Btn
              label={editor?.type === "meal" ? "Save meal" : "Save check-in"}
              disabled={busy}
              onPress={() => run(saveEditor, true)}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={!!codes}
        transparent
        animationType="fade"
        onRequestClose={() => setCodes(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Keep these somewhere safe.</Text>
            <Text style={styles.muted}>
              Each recovery code can reset your password once. Save them outside
              this device.
            </Text>
            <Text selectable style={styles.codeText}>
              {codes?.join("\n")}
            </Text>
            <Btn
              label="Save or share codes"
              onPress={() => Share.share({ message: codes.join("\n") })}
            />
            <Btn
              label="I’ve saved my codes"
              secondary
              onPress={() => setCodes(null)}
            />
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!security}
        animationType="slide"
        onRequestClose={() => setSecurity(null)}
      >
        <SafeAreaView style={styles.screen}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.sectionTitle}>
              {security === "verify"
                ? "Verify your phone"
                : security === "smsReset"
                  ? "Recover by SMS"
                  : security === "delete"
                    ? "Delete account permanently"
                    : security === "codes"
                      ? "New recovery codes"
                      : "Change password"}
            </Text>
            {security === "delete" && (
              <Text style={styles.error}>
                This permanently deletes your profile, records, and
                conversations. Export your data first if you want a copy.
              </Text>
            )}
            {security === "smsReset" && !challenge && (
              <Field label="Phone number" value={phone} onChange={setPhone} />
            )}{" "}
            {security === "verify" || security === "smsReset" ? (
              challenge ? (
                <>
                  <Text style={styles.muted}>
                    If eligible, a code was sent. Enter it below.
                  </Text>
                  <Field label="Code" value={otp} onChange={setOtp} />
                  {security === "smsReset" && (
                    <Field
                      label="New password"
                      value={newPassword}
                      onChange={setNewPassword}
                      kind="password"
                    />
                  )}
                </>
              ) : (
                <Text style={styles.muted}>
                  Send a verification code to your phone.
                </Text>
              )
            ) : (
              <>
                <Field
                  label="Current password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  kind="password"
                />
                {security === "password" && (
                  <Field
                    label="New password"
                    value={newPassword}
                    onChange={setNewPassword}
                    kind="password"
                  />
                )}
              </>
            )}
            {modalError ? <Text style={styles.error}>{modalError}</Text> : null}
            <Btn
              label={
                (security === "verify" || security === "smsReset") && !challenge
                  ? "Send code"
                  : security === "delete"
                    ? "Permanently delete account"
                    : "Confirm"
              }
              disabled={busy}
              danger={security === "delete"}
              onPress={() => run(saveSecurity, true)}
            />
            <Btn
              label="Cancel"
              secondary
              disabled={busy}
              onPress={() => setSecurity(null)}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: {
    padding: 24,
    paddingBottom: 45,
    gap: 17,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  wordmark: {
    fontSize: 29,
    fontWeight: "700",
    letterSpacing: -1.5,
    color: colors.ink,
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
    color: colors.muted,
  },
  hero: {
    fontSize: 37,
    lineHeight: 43,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: colors.ink,
    letterSpacing: -1,
  },
  muted: { fontSize: 13, lineHeight: 21, color: colors.muted },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: "#c9cdc3",
    borderRadius: 7,
    padding: 13,
    backgroundColor: colors.white,
    color: colors.ink,
    minHeight: 46,
  },
  button: {
    paddingHorizontal: 17,
    paddingVertical: 12,
    backgroundColor: colors.green,
    borderRadius: 7,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#c7ccbf",
  },
  buttonText: { color: "white", fontWeight: "600", fontSize: 13 },
  tabs: {
    flexDirection: "row",
    padding: 4,
    backgroundColor: "#ebede4",
    borderRadius: 8,
  },
  tab: { flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 6 },
  activeTab: { backgroundColor: colors.white },
  energy: {
    padding: 24,
    backgroundColor: colors.sage,
    borderRadius: 14,
    gap: 15,
  },
  energyNumber: {
    fontSize: 46,
    letterSpacing: -2,
    fontWeight: "500",
    color: colors.ink,
  },
  energyTarget: { fontSize: 13, letterSpacing: 0, color: colors.muted },
  track: {
    height: 5,
    backgroundColor: "#cfdbc3",
    borderRadius: 4,
    overflow: "hidden",
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  macroNumber: { fontSize: 18, color: colors.ink, marginTop: 6 },
  caption: { fontSize: 11, lineHeight: 18, color: colors.muted },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 25,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  smallButton: {
    width: 33,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.line,
    padding: 24,
    borderRadius: 8,
    fontSize: 13,
    color: colors.muted,
  },
  card: {
    padding: 22,
    gap: 17,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    backgroundColor: colors.white,
  },
  checkin: {
    padding: 23,
    gap: 14,
    borderRadius: 13,
    backgroundColor: "#ede9df",
  },
  notice: { padding: 18, borderRadius: 8, gap: 13, backgroundColor: "#e8eddf" },
  error: { fontSize: 13, color: "#a63d36", lineHeight: 21 },
  message: {
    padding: 18,
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    marginRight: 20,
  },
  userMessage: { backgroundColor: colors.sage, marginLeft: 20, marginRight: 0 },
  footer: {
    fontSize: 11,
    color: "#92998a",
    textAlign: "center",
    marginTop: 30,
  },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
  },
  chosen: { backgroundColor: colors.sage, borderColor: "#a2b297" },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#252d2777",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    padding: 25,
    gap: 18,
    borderRadius: 15,
    backgroundColor: colors.paper,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    lineHeight: 28,
    backgroundColor: colors.sage,
    padding: 15,
    borderRadius: 7,
  },
});
