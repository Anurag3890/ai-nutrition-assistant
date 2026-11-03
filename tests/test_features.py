"""Security, lifecycle, provider, and operational regression tests. No live providers."""

import io
import json
import os
import sqlite3
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch, Mock

from fastapi.testclient import TestClient
from PIL import Image
from backend.api import create_app
from backend.database import backup, restore, verify
from backend.providers import AIService, FoodService, ProviderError, VisionEstimate
from data.nutrition_data_store import NutritionDataStore


class FeatureAPITest(unittest.TestCase):
    def setUp(self):
        env = patch.dict(
            os.environ,
            {
                "NUTRIAI_AI_PROVIDER": "disabled",
                "NUTRIAI_SMS_PROVIDER": "disabled",
                "NUTRIAI_FOOD_PROVIDER": "local",
                "NUTRIAI_REQUIRE_VERIFIED_PHONE": "false",
            },
        )
        env.start()
        self.addCleanup(env.stop)
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        self.addCleanup(self.temp.cleanup)
        self.path = str(Path(self.temp.name) / "db.sqlite")
        self.store = NutritionDataStore(self.path)
        self.app = create_app(self.store)
        self.client = TestClient(self.app)
        self.addCleanup(self.client.close)
        self.payload = {
            "phone": "+12025550190",
            "password": "A long test password!",
            "full_name": "Test Person",
            "timezone": "Asia/Kolkata",
        }
        result = self.client.post("/api/auth/register", json=self.payload)
        self.assertEqual(result.status_code, 201, result.text)
        self.account = result.json()
        self.uid = self.account["user"]["id"]
        self.headers = {"Authorization": "Bearer " + self.account["access_token"]}
        self.client.cookies.clear()

    def test_phone_formats_share_one_account(self):
        body = {**self.payload, "phone": "+1 (202) 555-0190"}
        self.assertEqual(
            self.client.post("/api/auth/register", json=body).status_code, 409
        )
        response = self.client.post(
            "/api/auth/login",
            json={"phone": body["phone"], "password": self.payload["password"]},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["user"]["id"], self.uid)

    def test_full_name_cannot_shadow_another_phone(self):
        self.client.post(
            "/api/auth/register",
            json={**self.payload, "phone": "+12025550191", "full_name": "+12025550192"},
        )
        victim = self.client.post(
            "/api/auth/register",
            json={
                **self.payload,
                "phone": "+12025550192",
                "full_name": "Real account",
                "password": "Different secret phrase!",
            },
        )
        self.assertEqual(victim.status_code, 201)
        response = self.client.post(
            "/api/auth/login",
            json={"phone": "+12025550192", "password": "Different secret phrase!"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["user"]["id"], victim.json()["user"]["id"])
        wrong = self.client.post(
            "/api/auth/login",
            json={"phone": "+12025550192", "password": self.payload["password"]},
        )
        self.assertEqual(wrong.status_code, 401)

    def test_invalid_identifiers_and_passwords(self):
        for phone in ["not-a-phone", "9876543210", "+91 12", "+1 2025550190 ext. 22"]:
            self.assertEqual(
                self.client.post(
                    "/api/auth/register", json={**self.payload, "phone": phone}
                ).status_code,
                422,
            )
        for password in ["          ", "short", "         a"]:
            self.assertEqual(
                self.client.post(
                    "/api/auth/register",
                    json={
                        **self.payload,
                        "phone": "+12025550191",
                        "password": password,
                    },
                ).status_code,
                422,
            )
        self.assertEqual(
            self.client.post(
                "/api/auth/register", json={**self.payload, "timezone": "No/SuchPlace"}
            ).status_code,
            422,
        )

    def test_signup_is_atomic_on_failure(self):
        original = self.store.create_or_update_user

        def fail_after_user(record, connection=None):
            original(record, connection)
            raise sqlite3.IntegrityError("Simulated later write failure")

        with patch.object(
            self.store, "create_or_update_user", side_effect=fail_after_user
        ):
            response = self.client.post(
                "/api/auth/register", json={**self.payload, "phone": "+12025550191"}
            )
        self.assertEqual(response.status_code, 409)
        self.assertIsNone(self.store.get_user_by_phone("+12025550191"))
        with self.store._get_connection() as conn:
            self.assertEqual(
                conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0], 1
            )
            self.assertEqual(
                conn.execute("SELECT COUNT(*) FROM recovery_codes").fetchone()[0], 5
            )

    def test_recovery_is_one_time_and_revokes_sessions(self):
        code = self.account["recovery_codes"][0]
        response = self.client.post(
            "/api/auth/recover",
            json={
                "phone": self.payload["phone"],
                "recovery_code": code,
                "password": "New recovery password!",
            },
        )
        self.assertEqual(response.status_code, 204, response.text)
        self.assertEqual(
            self.client.get("/api/auth/me", headers=self.headers).status_code, 401
        )
        self.assertEqual(
            self.client.post(
                "/api/auth/recover",
                json={
                    "phone": self.payload["phone"],
                    "recovery_code": code,
                    "password": "Another password!",
                },
            ).status_code,
            400,
        )
        self.assertIsNotNone(
            self.store.authenticate_user(
                self.payload["phone"], "New recovery password!"
            )
        )

    def test_recovery_rotation_replaces_old_codes(self):
        response = self.client.post(
            "/api/auth/recovery-codes",
            headers=self.headers,
            json={"current_password": self.payload["password"]},
        )
        self.assertEqual(response.status_code, 200)
        code = self.account["recovery_codes"][0]
        self.assertFalse(
            self.store.reset_with_code(
                self.payload["phone"], code, "New test password!"
            )
        )
        self.assertTrue(
            self.store.reset_with_code(
                self.payload["phone"],
                response.json()["recovery_codes"][0],
                "New test password!",
            )
        )

    def test_password_change_requires_current_and_revokes_all_sessions(self):
        another = self.store.create_session(self.uid)
        self.assertEqual(
            self.client.post(
                "/api/auth/password",
                headers=self.headers,
                json={
                    "current_password": "wrong",
                    "new_password": "New test password!",
                },
            ).status_code,
            401,
        )
        self.assertIsNotNone(self.store.session_user(another))
        self.assertEqual(
            self.client.post(
                "/api/auth/password",
                headers=self.headers,
                json={
                    "current_password": self.payload["password"],
                    "new_password": "New test password!",
                },
            ).status_code,
            204,
        )
        self.assertIsNone(self.store.session_user(another))
        self.assertIsNone(self.store.session_user(self.account["access_token"]))

    def test_export_and_delete_cascade(self):
        self.client.post(
            "/api/meals",
            headers=self.headers,
            json={"food_name": "Test", "calories": 100},
        )
        self.client.post(
            "/api/hydration", headers=self.headers, json={"amount_ml": 250}
        )
        self.client.put("/api/biometrics", headers=self.headers, json={"weight_kg": 80})
        self.client.post(
            "/api/coach/chat", headers=self.headers, json={"message": "summary"}
        )
        exported = self.client.get("/api/account/export", headers=self.headers).json()
        self.assertEqual(len(exported["meal_logs"]), 1)
        for secret in ("password_hash", "code_hash", "token_hash", "access_token"):
            self.assertNotIn(secret, json.dumps(exported))
        self.assertEqual(
            self.client.request(
                "DELETE",
                "/api/account",
                headers=self.headers,
                json={"current_password": "wrong"},
            ).status_code,
            401,
        )
        self.assertEqual(
            self.client.request(
                "DELETE",
                "/api/account",
                headers=self.headers,
                json={"current_password": self.payload["password"]},
            ).status_code,
            204,
        )
        self.assertIsNone(self.store.get_user(self.uid))
        with self.store._get_connection() as conn:
            for table in (
                "meal_logs",
                "water_logs",
                "biometric_logs",
                "ai_consultations",
                "sessions",
                "recovery_codes",
            ):
                self.assertEqual(
                    conn.execute(
                        f"SELECT COUNT(*) FROM {table} WHERE user_id=?", (self.uid,)
                    ).fetchone()[0],
                    0,
                )

    def test_latest_weight_wins_over_backfills(self):
        self.client.put(
            "/api/biometrics",
            headers=self.headers,
            json={"weight_kg": 82, "log_date": "2026-11-03"},
        )
        self.client.put(
            "/api/biometrics",
            headers=self.headers,
            json={"weight_kg": 79, "log_date": "2026-11-01"},
        )
        self.assertEqual(self.store.get_user(self.uid)["current_weight_kg"], 82)
        self.client.put(
            "/api/biometrics",
            headers=self.headers,
            json={"weight_kg": 81, "log_date": "2026-11-04"},
        )
        self.assertEqual(self.store.get_user(self.uid)["current_weight_kg"], 81)

    def test_profile_fields_and_timezone_are_saved(self):
        profile = {
            "full_name": "Updated Name",
            "age": 30,
            "sex": "female",
            "height_cm": 165,
            "current_weight_kg": 65,
            "target_weight_kg": 63,
            "activity_level": "lightly_active",
            "primary_goal": "maintenance",
            "dietary_preference": "vegetarian",
            "allergies": "peanuts",
            "medical_conditions": "private",
            "timezone": "Pacific/Auckland",
        }
        result = self.client.put("/api/profile", headers=self.headers, json=profile)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()["allergies"], "peanuts")
        self.assertEqual(result.json()["onboarding_completed"], 1)
        self.assertEqual(result.json()["timezone"], "Pacific/Auckland")

    def test_default_dates_use_profile_timezone(self):
        real_datetime = datetime
        with patch("backend.api.datetime") as clock:
            clock.now.side_effect = lambda tz: real_datetime(
                2026, 11, 3, 23, 30, tzinfo=timezone.utc
            ).astimezone(tz)
            response = self.client.post(
                "/api/meals",
                headers=self.headers,
                json={"food_name": "Late meal", "calories": 100},
            )
            self.assertEqual(response.status_code, 201)
            summary = self.client.get(
                "/api/summary/" + self.uid, headers=self.headers
            ).json()
        self.assertEqual(summary["date"], "2026-11-04")
        self.assertEqual(len(summary["meals_list"]), 1)

    def test_progress_excludes_missing_days(self):
        self.client.post(
            "/api/meals",
            headers=self.headers,
            json={"food_name": "Meal", "calories": 450, "log_date": "2026-11-02"},
        )
        progress = self.client.get(
            "/api/progress?days=7&end=2026-11-03", headers=self.headers
        ).json()
        self.assertEqual(progress["average_calories"], 450)
        self.assertEqual(progress["logged_days"], 1)
        self.assertIsNone(progress["days"][-1]["calories"])

    def test_chat_history_returns_latest_turns_in_order(self):
        for i in range(60):
            self.store.log_ai_message(self.uid, "default", "user", str(i))
        history = self.client.get("/api/coach/history", headers=self.headers).json()
        self.assertEqual(history[0]["message_text"], "10")
        self.assertEqual(history[-1]["message_text"], "59")

    def test_phone_verification_is_bound_and_single_use(self):
        self.app.state.sms.send = Mock()
        self.app.state.sms.check = Mock(return_value=True)
        challenge = self.client.post(
            "/api/auth/verification/start", headers=self.headers
        ).json()["challenge_id"]
        payload = {"challenge_id": challenge, "code": "123456"}
        response = self.client.post(
            "/api/auth/verification/check", headers=self.headers, json=payload
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["phone_verified"], 1)
        self.assertEqual(
            self.client.post(
                "/api/auth/verification/check", headers=self.headers, json=payload
            ).status_code,
            400,
        )
        self.assertIsNone(self.store.challenge(challenge, "reset"))

    def test_sms_reset_requires_previously_verified_phone(self):
        with patch.dict(
            os.environ,
            {
                "NUTRIAI_SMS_PROVIDER": "twilio",
                "TWILIO_ACCOUNT_SID": "ACtest",
                "TWILIO_AUTH_TOKEN": "test",
                "TWILIO_VERIFY_SERVICE_SID": "VAtest",
            },
        ):
            self.app.state.sms.send = Mock()
            self.app.state.sms.check = Mock(return_value=True)
            challenge = self.client.post(
                "/api/auth/reset/start", json={"phone": self.payload["phone"]}
            ).json()["challenge_id"]
            self.app.state.sms.send.assert_not_called()
            self.assertEqual(
                self.client.post(
                    "/api/auth/reset/check",
                    json={
                        "challenge_id": challenge,
                        "code": "123456",
                        "new_password": "New password phrase!",
                    },
                ).status_code,
                400,
            )

    def test_unconfigured_providers_do_not_make_network_requests(self):
        with patch("backend.providers.requests.post") as post:
            result = self.client.post(
                "/api/coach/chat", headers=self.headers, json={"message": "summary"}
            )
            self.assertEqual(result.json()["mode"], "record_summary")
            photo = self.client.post(
                "/api/predict/food-image",
                headers=self.headers,
                files={"file": ("meal.jpg", b"not an image", "image/jpeg")},
            )
            self.assertEqual(photo.status_code, 503)
            self.assertEqual(
                self.client.post(
                    "/api/auth/verification/start", headers=self.headers
                ).status_code,
                503,
            )
            post.assert_not_called()

    def test_photo_response_is_not_saved_automatically(self):
        raw = io.BytesIO()
        Image.new("RGB", (50, 50)).save(raw, "PNG")
        estimate = {
            "is_food": True,
            "food_name": "Meal",
            "estimated_serving_g": 200,
            "calories": 400,
            "protein_g": 20,
            "carbs_g": 40,
            "fat_g": 10,
            "fiber_g": 3,
            "uncertainty": "Estimate; confirm your portion.",
        }
        with patch.dict(
            os.environ,
            {
                "NUTRIAI_AI_PROVIDER": "openai",
                "OPENAI_API_KEY": "test",
                "NUTRIAI_AI_MODEL": "test-model",
            },
        ):
            self.app.state.ai.provider = "openai"
            self.app.state.ai.key = "test"
            self.app.state.ai.model = "test-model"
            self.app.state.ai.analyze = Mock(return_value=estimate)
            response = self.client.post(
                "/api/predict/food-image",
                headers=self.headers,
                files={"file": ("meal.png", raw.getvalue(), "image/png")},
            )
            self.assertEqual(response.status_code, 200, response.text)
            self.assertTrue(response.json()["requires_confirmation"])
            self.assertEqual(
                self.client.get("/api/meals", headers=self.headers).json(), []
            )
            bad = self.client.post(
                "/api/predict/food-image",
                headers=self.headers,
                files={"file": ("meal.jpg", b"not an image", "image/jpeg")},
            )
            self.assertEqual(bad.status_code, 422)

    def test_backup_restore_round_trip(self):
        self.store.log_water(self.uid, 500)
        snap = str(Path(self.temp.name) / "backup.db")
        target = str(Path(self.temp.name) / "restored.db")
        backup(self.path, snap)
        restore(snap, target)
        restored = NutritionDataStore(target)
        self.assertEqual(
            restored.get_daily_summary(self.uid)["hydration"]["consumed_ml"], 500
        )
        self.assertTrue(verify(target))
        with self.assertRaises(ValueError):
            restore(snap, target)
        with self.assertRaises(ValueError):
            backup(self.path, snap)

    def test_concurrent_logging_preserves_all_entries(self):
        with ThreadPoolExecutor(max_workers=8) as workers:
            list(workers.map(lambda _: self.store.log_water(self.uid, 100), range(24)))
        self.assertEqual(
            self.store.get_daily_summary(self.uid)["hydration"]["consumed_ml"], 2400
        )
        with self.store._get_connection() as conn:
            self.assertEqual(conn.execute("PRAGMA integrity_check").fetchone()[0], "ok")
            self.assertEqual(conn.execute("PRAGMA foreign_key_check").fetchall(), [])

    def test_local_catalog_and_source_metadata_round_trip(self):
        result = self.client.get("/api/foods/search?q=rice", headers=self.headers)
        self.assertEqual(result.status_code, 200, result.text)
        food = result.json()["foods"][0]
        self.assertIn("USDA", food["source"])
        payload = {
            "food_name": food["name"],
            "calories": food["calories"],
            "nutrition_source": food["source"],
            "source_url": food["source_url"],
            "serving_g": 100,
            "micronutrients": {"potassium_mg": 100, "vitamin_c_mg": 5},
        }
        response = self.client.post("/api/meals", headers=self.headers, json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        identifier = response.json()["id"]
        updated = {**payload, "calories": 200, "micronutrients": {"potassium_mg": 200}}
        self.assertEqual(
            self.client.put(
                "/api/meals/" + identifier, headers=self.headers, json=updated
            ).status_code,
            200,
        )
        summary = self.client.get(
            "/api/summary/" + self.uid, headers=self.headers
        ).json()
        self.assertEqual(summary["micronutrients"]["potassium_mg"]["amount"], 200)
        self.assertNotIn("vitamin_c_mg", summary["micronutrients"])
        self.assertEqual(summary["meals_list"][0]["nutrition_source"], food["source"])
        self.assertEqual(summary["meals_list"][0]["serving_g"], 100)

    def test_profile_and_weight_are_atomic(self):
        profile = {
            "full_name": "Must not persist",
            "age": 30,
            "sex": "female",
            "height_cm": 165,
            "current_weight_kg": 65,
            "target_weight_kg": 63,
            "activity_level": "lightly_active",
            "primary_goal": "maintenance",
            "dietary_preference": "vegetarian",
            "allergies": "peanuts",
            "medical_conditions": "",
            "timezone": "Asia/Kolkata",
        }
        with patch.object(
            self.store,
            "log_biometrics",
            side_effect=sqlite3.OperationalError("Simulated write error"),
        ):
            result = self.client.put("/api/profile", headers=self.headers, json=profile)
        self.assertEqual(result.status_code, 503)
        self.assertEqual(self.store.get_user(self.uid)["full_name"], "Test Person")

    def test_conflicting_legacy_phone_migration_refuses_to_merge(self):
        with self.store._get_connection() as conn:
            conn.execute("DELETE FROM schema_migrations WHERE version=2")
            conn.execute(
                "INSERT INTO users(id,username,phone_number) VALUES (?,?,?)",
                ("legacy", "legacy", "+1 (202) 555-0190"),
            )
        with self.assertRaises(RuntimeError):
            NutritionDataStore(self.path)
        with self.store._get_connection() as conn:
            self.assertEqual(
                conn.execute("SELECT COUNT(*) FROM users").fetchone()[0], 2
            )

    def test_required_sms_configuration_fails_closed(self):
        with patch.dict(os.environ, {"NUTRIAI_REQUIRE_VERIFIED_PHONE": "true"}):
            with self.assertRaises(RuntimeError):
                create_app(self.store)


class ProviderContractTest(unittest.TestCase):
    def test_openai_request_and_response_contract(self):
        with patch.dict(
            os.environ,
            {
                "NUTRIAI_AI_PROVIDER": "openai",
                "OPENAI_API_KEY": "secret",
                "NUTRIAI_AI_MODEL": "configured-model",
            },
        ):
            provider = AIService()
            response = Mock()
            response.json.return_value = {
                "status": "completed",
                "output": [
                    {
                        "content": [
                            {"type": "output_text", "text": "A helpful response."}
                        ]
                    }
                ],
            }
            with patch(
                "backend.providers.requests.post", return_value=response
            ) as post:
                result = provider.chat(
                    "hello",
                    {
                        "date": "2026-11-03",
                        "calories": 450,
                        "protein_g": 20,
                        "target_calories": 2000,
                    },
                    [],
                )
                self.assertEqual(result["reply"], "A helpful response.")
                self.assertFalse(post.call_args.kwargs["json"]["store"])
                self.assertEqual(
                    post.call_args.kwargs["json"]["model"], "configured-model"
                )

    def test_invalid_vision_values_are_rejected(self):
        with self.assertRaises(ValueError):
            VisionEstimate.model_validate(
                {
                    "is_food": True,
                    "food_name": "x",
                    "estimated_serving_g": 200,
                    "calories": -1,
                    "protein_g": 20,
                    "carbs_g": 40,
                    "fat_g": 10,
                    "fiber_g": 3,
                    "uncertainty": "x",
                }
            )


if __name__ == "__main__":
    unittest.main()
