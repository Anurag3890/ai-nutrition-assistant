"""Account lifecycle and data portability; all writes use SQLite transactions."""

import json
import secrets
import sqlite3
import time
from datetime import date
from contextlib import nullcontext

try:
    from .security import hash_password, token_digest, verify_password
    from .identity import normalize_phone
except ImportError:
    from security import hash_password, token_digest, verify_password
    from identity import normalize_phone


class AccountStore:
    def upgrade_schema(self):
        with self._get_connection() as conn:
            columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)")}
            for name, definition in {
                "timezone": "TEXT NOT NULL DEFAULT 'UTC'",
                "phone_verified": "INTEGER NOT NULL DEFAULT 0",
                "onboarding_completed": "INTEGER NOT NULL DEFAULT 0",
            }.items():
                if name not in columns:
                    conn.execute(f"ALTER TABLE users ADD COLUMN {name} {definition}")
            conn.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
            )
            conn.execute(
                "CREATE TABLE IF NOT EXISTS recovery_codes (code_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE)"
            )
            conn.execute(
                "CREATE TABLE IF NOT EXISTS verification_challenges (id_hash TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, phone TEXT NOT NULL, purpose TEXT NOT NULL, expires_at REAL NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)"
            )
            conn.execute(
                "CREATE TABLE IF NOT EXISTS provider_cache (cache_key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at REAL NOT NULL)"
            )
            if not conn.execute(
                "SELECT 1 FROM schema_migrations WHERE version=2"
            ).fetchone():
                # Normalize old valid numbers atomically. Never merge accounts silently.
                rows = conn.execute("SELECT id, phone_number FROM users").fetchall()
                for row in rows:
                    try:
                        canonical = normalize_phone(row["phone_number"] or "")
                    except ValueError:
                        continue  # Legacy demo identifiers require an explicit administrative migration.
                    if canonical != row["phone_number"]:
                        try:
                            conn.execute(
                                "UPDATE users SET phone_number=? WHERE id=?",
                                (canonical, row["id"]),
                            )
                        except sqlite3.IntegrityError:
                            raise RuntimeError(
                                "Conflicting phone formats exist in the database. Back up and resolve duplicate accounts before migrating."
                            ) from None
                conn.execute(
                    "INSERT OR IGNORE INTO schema_migrations(version) VALUES (2)"
                )
            try:
                conn.execute(
                    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone_number) WHERE phone_number IS NOT NULL AND phone_number != ''"
                )
            except sqlite3.IntegrityError:
                raise RuntimeError(
                    "Conflicting phone numbers exist. Back up and resolve duplicate accounts before migrating."
                ) from None
            meal_columns = {
                row["name"] for row in conn.execute("PRAGMA table_info(meal_logs)")
            }
            for name, definition in {
                "nutrition_source": "TEXT",
                "source_url": "TEXT",
                "serving_g": "REAL",
            }.items():
                if name not in meal_columns:
                    conn.execute(
                        f"ALTER TABLE meal_logs ADD COLUMN {name} {definition}"
                    )
            conn.execute("INSERT OR IGNORE INTO schema_migrations(version) VALUES (3)")

    def register_account(self, record):
        codes = [secrets.token_hex(10) for _ in range(5)]
        token = secrets.token_urlsafe(32)
        with self._get_connection() as conn:
            conn.execute("BEGIN IMMEDIATE")
            self.create_or_update_user(record, connection=conn)
            conn.execute(
                "UPDATE users SET timezone=? WHERE id=?",
                (record.get("timezone", "UTC"), record["id"]),
            )
            conn.executemany(
                "INSERT INTO recovery_codes VALUES (?,?)",
                [(token_digest(code), record["id"]) for code in codes],
            )
            conn.execute(
                "INSERT INTO sessions VALUES (?,?,?)",
                (token_digest(token), record["id"], time.time() + 604800),
            )
            user = self.public_user(
                dict(
                    conn.execute(
                        "SELECT * FROM users WHERE id=?", (record["id"],)
                    ).fetchone()
                )
            )
        return user, token, codes

    def generate_recovery_codes(self, user_id):
        codes = [secrets.token_hex(10) for _ in range(5)]
        with self._get_connection() as conn:
            conn.execute("DELETE FROM recovery_codes WHERE user_id=?", (user_id,))
            conn.executemany(
                "INSERT INTO recovery_codes VALUES (?, ?)",
                [(token_digest(code), user_id) for code in codes],
            )
        return codes

    def change_password(self, user_id, current, new):
        with self._get_connection() as conn:
            conn.execute("BEGIN IMMEDIATE")
            row = conn.execute(
                "SELECT password_hash FROM users WHERE id=?", (user_id,)
            ).fetchone()
            if not row or not verify_password(current, row["password_hash"]):
                return False
            conn.execute(
                "UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                (hash_password(new), user_id),
            )
            conn.execute("DELETE FROM sessions WHERE user_id=?", (user_id,))
        return True

    def reset_with_code(self, phone, code, new):
        with self._get_connection() as conn:
            conn.execute("BEGIN IMMEDIATE")
            row = conn.execute(
                "SELECT u.id FROM users u JOIN recovery_codes c ON c.user_id=u.id WHERE u.phone_number=? AND c.code_hash=?",
                (phone, token_digest(code.strip().lower())),
            ).fetchone()
            if not row:
                return False
            conn.execute(
                "DELETE FROM recovery_codes WHERE code_hash=?",
                (token_digest(code.strip().lower()),),
            )
            conn.execute(
                "UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                (hash_password(new), row["id"]),
            )
            conn.execute("DELETE FROM sessions WHERE user_id=?", (row["id"],))
        return True

    def verify_current_password(self, user_id, password):
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT password_hash FROM users WHERE id=?", (user_id,)
            ).fetchone()
        return bool(row and verify_password(password, row["password_hash"]))

    def save_profile(self, user_id, values, connection=None):
        allowed = {
            "full_name",
            "age",
            "sex",
            "height_cm",
            "current_weight_kg",
            "target_weight_kg",
            "activity_level",
            "primary_goal",
            "dietary_preference",
            "allergies",
            "medical_conditions",
            "timezone",
            "onboarding_completed",
        }
        values = {k: v for k, v in values.items() if k in allowed}
        if values:
            with (
                nullcontext(connection) if connection else self._get_connection()
            ) as conn:
                conn.execute(
                    "UPDATE users SET "
                    + ",".join(f"{key}=?" for key in values)
                    + ",updated_at=CURRENT_TIMESTAMP WHERE id=?",
                    (*values.values(), user_id),
                )
        return self.get_user(user_id) if connection is None else None

    def save_profile_with_weight(self, user_id, values, weight, day):
        with self._get_connection() as conn:
            conn.execute("BEGIN IMMEDIATE")
            self.save_profile(
                user_id, {**values, "onboarding_completed": 1}, connection=conn
            )
            self.log_biometrics(
                user_id, {"weight_kg": weight, "log_date": day}, connection=conn
            )
        return self.get_user(user_id)

    def export_user(self, user_id):
        data = {"profile": self.get_user(user_id), "format_version": 1}
        with self._get_connection() as conn:
            for table in (
                "meal_logs",
                "water_logs",
                "biometric_logs",
                "activity_logs",
                "ai_consultations",
                "meal_plans",
            ):
                data[table] = [
                    dict(row)
                    for row in conn.execute(
                        f"SELECT * FROM {table} WHERE user_id=?", (user_id,)
                    )
                ]
        return data

    def delete_user(self, user_id, password):
        with self._get_connection() as conn:
            conn.execute("BEGIN IMMEDIATE")
            row = conn.execute(
                "SELECT password_hash FROM users WHERE id=?", (user_id,)
            ).fetchone()
            if not row or not verify_password(password, row["password_hash"]):
                return False
            conn.execute("DELETE FROM users WHERE id=?", (user_id,))
        return True

    def create_challenge(self, user_id, phone, purpose):
        token = secrets.token_urlsafe(32)
        with self._get_connection() as conn:
            conn.execute(
                "DELETE FROM verification_challenges WHERE expires_at < ? OR (phone=? AND purpose=?)",
                (time.time(), phone, purpose),
            )
            conn.execute(
                "INSERT INTO verification_challenges(id_hash,user_id,phone,purpose,expires_at) VALUES (?,?,?,?,?)",
                (token_digest(token), user_id, phone, purpose, time.time() + 600),
            )
        return token

    def challenge(self, token, purpose, user_id=None):
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM verification_challenges WHERE id_hash=? AND purpose=? AND expires_at>? AND attempts<5",
                (token_digest(token), purpose, time.time()),
            ).fetchone()
            if not row or (purpose == "verify" and row["user_id"] != user_id):
                return None
            conn.execute(
                "UPDATE verification_challenges SET attempts=attempts+1 WHERE id_hash=?",
                (token_digest(token),),
            )
        return dict(row)

    def complete_challenge(self, token, purpose, new_password=None):
        with self._get_connection() as conn:
            conn.execute("BEGIN IMMEDIATE")
            row = conn.execute(
                "SELECT * FROM verification_challenges WHERE id_hash=? AND purpose=? AND expires_at>?",
                (token_digest(token), purpose, time.time()),
            ).fetchone()
            if not row or not row["user_id"]:
                return False
            conn.execute(
                "DELETE FROM verification_challenges WHERE id_hash=?",
                (token_digest(token),),
            )
            if purpose == "verify":
                conn.execute(
                    "UPDATE users SET phone_verified=1 WHERE id=?", (row["user_id"],)
                )
            else:
                conn.execute(
                    "UPDATE users SET password_hash=? WHERE id=?",
                    (hash_password(new_password), row["user_id"]),
                )
                conn.execute("DELETE FROM sessions WHERE user_id=?", (row["user_id"],))
        return True

    def daily_history(self, user_id, start, end):
        with self._get_connection() as conn:
            meals = {
                row["log_date"]: dict(row)
                for row in conn.execute(
                    "SELECT log_date,SUM(calories) AS calories,SUM(protein_g) AS protein_g,COUNT(*) AS meal_count FROM meal_logs WHERE user_id=? AND log_date BETWEEN ? AND ? GROUP BY log_date",
                    (user_id, start.isoformat(), end.isoformat()),
                )
            }
            waters = {
                row["log_date"]: row["water_ml"]
                for row in conn.execute(
                    "SELECT log_date,SUM(amount_ml) AS water_ml FROM water_logs WHERE user_id=? AND log_date BETWEEN ? AND ? GROUP BY log_date",
                    (user_id, start.isoformat(), end.isoformat()),
                )
            }
            weights = {
                row["log_date"]: row["weight_kg"]
                for row in conn.execute(
                    "SELECT log_date,weight_kg FROM biometric_logs WHERE user_id=? AND log_date BETWEEN ? AND ?",
                    (user_id, start.isoformat(), end.isoformat()),
                )
            }
        from datetime import timedelta

        result = []
        for offset in range((end - start).days + 1):
            day = (start + timedelta(days=offset)).isoformat()
            meal = meals.get(day)
            result.append(
                {
                    "date": day,
                    "calories": round(meal["calories"], 1) if meal else None,
                    "protein_g": round(meal["protein_g"], 1) if meal else None,
                    "meal_count": meal["meal_count"] if meal else 0,
                    "water_ml": waters.get(day, 0),
                    "weight_kg": weights.get(day),
                }
            )
        return result

    def cache_get(self, key):
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT value FROM provider_cache WHERE cache_key=? AND expires_at>?",
                (key, time.time()),
            ).fetchone()
        return json.loads(row["value"]) if row else None

    def cache_set(self, key, value):
        with self._get_connection() as conn:
            conn.execute(
                "DELETE FROM provider_cache WHERE expires_at<?", (time.time(),)
            )
            conn.execute(
                "INSERT OR REPLACE INTO provider_cache VALUES (?,?,?)",
                (key, json.dumps(value), time.time() + 86400),
            )
