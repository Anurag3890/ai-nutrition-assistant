# NutriAI

A web and Expo nutrition tracker with a shared FastAPI/SQLite backend.

## Implemented

- Registration, PBKDF2 password hashing, expiring/revocable sessions and ownership checks, and database-backed authentication throttling.
- Web sessions use an HttpOnly cookie; native clients use opaque bearer tokens.
- Persistent meals (create/read/update/delete), hydration, biometrics and profile targets.
- Web meal and hydration logging, profile target editing and weekly reports.
- Expo sign-in, registration, meal logging/deletion, hydration, coach and reports.
- Reports use recorded meals; unlogged days are excluded from meal averages.
- Temporary test databases and GitHub Actions checks for tests, JSX and Docker startup.

## Run locally

```sh
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/web/ and create an account. API documentation is at
http://127.0.0.1:8000/docs. The website requires the backend; opening index.html
as a standalone file is no longer supported. No demo accounts are seeded automatically. Old browser-only accounts must register with
the backend. Old browser meal/water entries are retained locally but are not automatically
imported; the new dashboard displays server records only. Insecure browser-stored
account credentials are cleared when the updated client opens.

The default database is `data/storage/nutrition.db`, excluded from Git. To use an
existing database, set `NUTRIAI_DB_PATH` to its path before starting. Legacy plaintext
passwords are hashed during initialization. Back up any existing database first.
The old bundled `data/nutrition_master.db` is demo data and is not used by default.

Configuration is documented in `.env.example`. Set environment variables in your
shell or pass `--env-file .env` with an appropriate dotenv installation; the app does
not load `.env` implicitly. Set `NUTRIAI_SECURE_COOKIE=true` behind an HTTPS reverse
proxy and configure exact allowed origins with `NUTRIAI_CORS_ORIGINS`.

## Mobile

```sh
cd app
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` before starting Expo. A physical phone needs the API
server's LAN address, and the server must listen on the appropriate network interface.
The localhost default works only when the client and API share a host. Use HTTPS in
production. Tokens stay in memory; sign in again after restarting the app. Meals and
water remain on the server. Native device execution still needs device verification.

## Tests

```sh
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
node --check web/app.js
```

The legacy ML tests exercise educational simulations; passing them does not establish
food-recognition accuracy or clinical validity. API tests verify account isolation,
credential migration, expiry/revocation, CRUD, validation and restart persistence.

## Docker

```sh
docker compose up --build
```

SQLite records persist in the `nutrition-data` named volume. The image runs as a
non-root user. Back up that volume before deploying changes or removing it.

## Remaining work

- Configure and evaluate a real food-vision service or train a classifier. The image
  API currently returns 503 and the UI explains that recognition is unavailable.
- Implement a real LLM provider with appropriate evaluation. Coach/oracle responses
  currently use local templates and are labelled as such.
- Replace the small demonstration nutrition catalog with a sourced, searchable dataset.
- Train and validate forecasting models; current reports are descriptive only.
- Add password recovery, distributed edge abuse protection, monitoring and deployment-specific
  operational controls before a public launch.
- Add mobile camera, secure session restoration and device-level UI tests.
- Add richer meal editing and biometric UI; both already have authenticated APIs.

See `AI_NUTRITION_BLUEPRINT.md` for the current module status.
