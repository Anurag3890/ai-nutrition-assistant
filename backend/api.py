"""Authenticated API shared by the web and mobile clients."""
import os
import sqlite3
import uuid
from datetime import date, timedelta
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, Depends, HTTPException, Response, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from data.nutrition_data_store import NutritionDataStore


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, str_strip_whitespace=True)


class Login(Input):
    phone: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=128)
    # Passwords are intentionally not stripped.
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)


class Register(Login):
    full_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=10, max_length=128)
    primary_goal: Literal["fat_loss", "muscle_gain", "maintenance", "athletic_performance", "metabolic_health", "general_wellness"] = "maintenance"
    daily_calorie_target: float = Field(default=2000, ge=800, le=10000)
    daily_protein_target_g: float = Field(default=140, ge=0, le=500)


class Targets(Input):
    daily_calorie_target: float = Field(ge=800, le=10000)
    daily_protein_target_g: float = Field(ge=0, le=500)
    daily_carbs_target_g: float = Field(ge=0, le=1500)
    daily_fat_target_g: float = Field(ge=0, le=500)
    daily_water_target_ml: float = Field(ge=250, le=10000)


class Meal(Input):
    food_name: str = Field(min_length=1, max_length=200)
    meal_type: Literal["breakfast", "lunch", "dinner", "morning_snack", "afternoon_snack", "evening_snack", "pre_workout", "post_workout"] = "lunch"
    log_date: date = Field(default_factory=date.today)
    calories: float = Field(ge=0, le=10000)
    protein_g: float = Field(default=0, ge=0, le=1000)
    carbs_g: float = Field(default=0, ge=0, le=2000)
    fat_g: float = Field(default=0, ge=0, le=1000)
    fiber_g: float = Field(default=0, ge=0, le=500)


class Water(Input):
    amount_ml: float = Field(gt=0, le=5000)
    log_date: date = Field(default_factory=date.today)


class Biometrics(Input):
    log_date: date = Field(default_factory=date.today)
    weight_kg: float | None = Field(default=None, gt=0, le=700)
    body_fat_pct: float | None = Field(default=None, ge=0, le=100)
    energy_level: int | None = Field(default=None, ge=1, le=10)
    sleep_hours: float | None = Field(default=None, ge=0, le=24)
    sleep_quality: int | None = Field(default=None, ge=1, le=10)
    digestive_symptoms: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=2000)


class Chat(Input):
    message: str = Field(min_length=1, max_length=4000)


class Oracle(Input):
    query: str = Field(min_length=1, max_length=4000)
    category: str = Field(default="general", max_length=100)


def create_app(store: NutritionDataStore):
    app = FastAPI(title="NutriAI", version="3.0.0")
    app.state.store = store

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # Avoid echoing passwords or non-finite floats in error responses.
        errors = [{key: value for key, value in error.items() if key in ("loc", "msg", "type")} for error in exc.errors()]
        return JSONResponse(status_code=422, content={"detail": errors})

    origins = [x.strip() for x in os.getenv("NUTRIAI_CORS_ORIGINS", "http://localhost:8000,http://localhost:3000").split(",") if x.strip()]
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,
                       allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Authorization", "Content-Type"])

    @app.middleware("http")
    async def guard_cookie_origin(request: Request, call_next):
        # Cookies are same-site; require a same-origin or explicitly allowed origin for mutations.
        origin = request.headers.get("origin")
        if request.method not in ("GET", "HEAD", "OPTIONS") and origin:
            if origin not in origins and origin != str(request.base_url).rstrip("/"):
                return Response(status_code=403)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    def token(request: Request):
        auth = request.headers.get("authorization", "")
        return auth[7:] if auth.startswith("Bearer ") else request.cookies.get("nutriai_session", "")

    def current_user(request: Request):
        user = store.session_user(token(request))
        if not user:
            raise HTTPException(401, "Please sign in")
        return user

    def owner(user_id: str, user=Depends(current_user)):
        if user_id != user["id"]:
            raise HTTPException(403, "Access denied")
        return user

    def check_auth_limit(request, phone):
        address = request.client.host if request.client else "unknown"
        if not store.allow_auth_attempt("ip:" + address, 30) or not store.allow_auth_attempt("phone:" + phone.strip(), 10):
            raise HTTPException(429, "Too many authentication attempts. Try again in five minutes.", headers={"Retry-After": "300"})

    def session_response(user, response):
        session = store.create_session(user["id"])
        response.set_cookie("nutriai_session", session, httponly=True, samesite="lax",
                            secure=os.getenv("NUTRIAI_SECURE_COOKIE", "false").lower() == "true", max_age=604800)
        return {"user": user, "access_token": session, "token_type": "bearer"}

    @app.get("/api/health")
    def health():
        return {"status": "ok", "food_recognition": "not_configured", "coach": "local_templates"}

    @app.post("/api/auth/register", status_code=201)
    @app.post("/api/users/register", status_code=201)
    def register(payload: Register, response: Response, request: Request):
        check_auth_limit(request, payload.phone)
        record = payload.model_dump()
        record["phone_number"] = record.pop("phone").strip()
        if not record["phone_number"] or not record["full_name"].strip():
            raise HTTPException(422, "Name and phone are required")
        record["id"] = str(uuid.uuid4())
        record["username"] = record["id"]
        try:
            store.create_or_update_user(record)
        except sqlite3.IntegrityError:
            raise HTTPException(409, "Phone number is already registered")
        return session_response(store.get_user(record["id"]), response)

    @app.post("/api/auth/login")
    def login(payload: Login, response: Response, request: Request):
        check_auth_limit(request, payload.phone)
        user = store.authenticate_user(payload.phone, payload.password)
        if not user:
            raise HTTPException(401, "Invalid credentials")
        return session_response(user, response)

    @app.post("/api/auth/logout", status_code=204)
    def logout(request: Request, response: Response):
        store.revoke_session(token(request))
        response.delete_cookie("nutriai_session")

    @app.get("/api/auth/me")
    def me(user=Depends(current_user)):
        return user

    @app.get("/api/users")
    def users(user=Depends(current_user)):
        return [user]

    @app.put("/api/profile/targets")
    def targets(payload: Targets, user=Depends(current_user)):
        store.create_or_update_user({**user, **payload.model_dump()})
        return store.get_user(user["id"])

    @app.get("/api/summary/{user_id}")
    def summary(user_id: str, date_str: date | None = None, user=Depends(owner)):
        return store.get_daily_summary(user_id, (date_str or date.today()).isoformat())

    @app.get("/api/meals")
    def meals(day: date | None = None, user=Depends(current_user)):
        return store.get_daily_summary(user["id"], (day or date.today()).isoformat())["meals_list"]

    @app.post("/api/meals", status_code=201)
    def add_meal(payload: Meal, user=Depends(current_user)):
        return {"id": store.log_meal({**payload.model_dump(mode="json"), "user_id": user["id"]})}

    @app.put("/api/meals/{meal_id}")
    def update_meal(meal_id: str, payload: Meal, user=Depends(current_user)):
        values = payload.model_dump(mode="json")
        with store._get_connection() as conn:
            result = conn.execute("UPDATE meal_logs SET " + ", ".join(f"{key} = ?" for key in values) + " WHERE id = ? AND user_id = ?", (*values.values(), meal_id, user["id"]))
            if not result.rowcount:
                raise HTTPException(404, "Meal not found")
        return {"id": meal_id}

    @app.delete("/api/meals/{meal_id}", status_code=204)
    def delete_meal(meal_id: str, user=Depends(current_user)):
        with store._get_connection() as conn:
            result = conn.execute("DELETE FROM meal_logs WHERE id = ? AND user_id = ?", (meal_id, user["id"]))
            if not result.rowcount:
                raise HTTPException(404, "Meal not found")

    @app.post("/api/hydration", status_code=201)
    def hydration(payload: Water, user=Depends(current_user)):
        return {"id": store.log_water(user["id"], payload.amount_ml, log_date=payload.log_date.isoformat())}

    @app.delete("/api/hydration", status_code=204)
    def reset_hydration(day: date | None = None, user=Depends(current_user)):
        with store._get_connection() as conn:
            conn.execute("DELETE FROM water_logs WHERE user_id = ? AND log_date = ?", (user["id"], (day or date.today()).isoformat()))

    @app.put("/api/biometrics")
    def biometrics(payload: Biometrics, user=Depends(current_user)):
        store.log_biometrics(user["id"], payload.model_dump(mode="json", exclude_none=True))
        return store.get_daily_summary(user["id"], payload.log_date.isoformat())["biometrics"]

    @app.get("/api/coach/weekly-report/{user_id}")
    def weekly_report(user_id: str, user=Depends(owner)):
        days = [store.get_daily_summary(user_id, (date.today() - timedelta(days=i)).isoformat()) for i in range(7)]
        tracked = [day for day in days if day["meals_list"]]
        return {"days_with_meals": len(tracked), "window_days": 7,
                "average_calories_on_logged_days": round(sum(d["macros"]["calories"]["consumed"] for d in tracked) / len(tracked), 1) if tracked else None,
                "average_protein_on_logged_days": round(sum(d["macros"]["protein_g"]["consumed"] for d in tracked) / len(tracked), 1) if tracked else None,
                "total_water_ml": sum(d["hydration"]["consumed_ml"] for d in days), "daily_calorie_target": user["daily_calorie_target"]}

    @app.get("/api/patterns/eating-pattern/{user_id}")
    def patterns(user_id: str, user=Depends(owner)):
        days = [store.get_daily_summary(user_id, (date.today() - timedelta(days=i)).isoformat()) for i in range(7)]
        tracked = [d for d in days if d["meals_list"]]
        return {"logged_days": len(tracked), "status": "descriptive_only", "message": "Forecasting is unavailable until a trained model is configured.",
                "daily_calories": [{"date": d["date"], "calories": d["macros"]["calories"]["consumed"]} for d in reversed(tracked)]}

    @app.post("/api/coach/chat")
    def chat(payload: Chat, user=Depends(current_user)):
        from ml.genai_coach import GenAINutritionCoach
        summary = store.get_daily_summary(user["id"])
        reply = GenAINutritionCoach().answer_nutrition_question(payload.message, {
            "remaining_calories": summary["macros"]["calories"]["remaining"],
            "remaining_protein": summary["macros"]["protein_g"]["remaining"]})
        store.log_ai_message(user["id"], "default", "user", payload.message)
        store.log_ai_message(user["id"], "default", "assistant", reply)
        return {"reply": reply, "mode": "local_templates"}

    @app.get("/api/coach/history")
    def history(user=Depends(current_user)):
        return store.get_chat_history(user["id"], "default")

    @app.post("/api/oracle/ask")
    def oracle(payload: Oracle, user=Depends(current_user)):
        from ml.genai_coach import GenAINutritionCoach
        return {**GenAINutritionCoach().consult_omni_oracle(payload.query, payload.category), "mode": "local_templates"}

    @app.post("/api/predict/food-image")
    async def predict(file: UploadFile = File(...), serving_size_g: float = Form(100, gt=0, le=5000), user=Depends(current_user)):
        # Do not present random class scores as food recognition.
        raise HTTPException(503, "Food recognition is not configured. Log a meal manually until a trained model or vision provider is available.")

    web = Path(__file__).resolve().parent.parent / "web"
    app.mount("/web", StaticFiles(directory=web, html=True), name="web")
    return app
