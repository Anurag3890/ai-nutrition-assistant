# NutriAI

A private nutrition journal with a FastAPI/SQLite backend, a responsive web client,
and an Expo mobile client. The interface uses plain language, warm neutrals, and
recorded data rather than fabricated health scores.

## Run

```sh
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open [the journal](http://127.0.0.1:8000/web/) or [API docs](http://127.0.0.1:8000/docs).
Create an account using a phone number with its country code. Formatting variations
are normalized to the same identifier. Registration generates five one-time recovery
codes; store them securely outside the device. No SMS or AI calls are made by default.

Configuration is in `.env.example`. Export variables in your shell; this app does not
load `.env` implicitly. Never commit actual credentials. The default database is
`data/storage/nutrition.db`, excluded from Git. No demo users are seeded automatically.

## Account and tracking features

- Password hashing, canonical phone numbers, expiring/revocable sessions, rate limits,
  current-password checks, password changes and one-time recovery codes.
- Optional SMS verification and reset for previously verified numbers.
- Profile onboarding: age, height, current/target weight, activity, preferences,
  allergies, private health context and IANA timezone.
- Editable daily targets, meals, portion scaling, previous-day history, hydration,
  weight/sleep/energy check-ins and two-week descriptive progress.
- Latest dated weight check-ins update profile weight; backfills do not override a
  newer measurement. Profile and weight writes are atomic.
- Food source and portion metadata, plus recorded micronutrients where available.
  Missing nutrient data is not presented as a complete dietary assessment.
- Persisted coach conversations, account export and password-confirmed account deletion.
- Web: HttpOnly cookie sessions. Native: session tokens held in OS-backed SecureStore.
  Expo web uses the API's cookie session rather than browser token storage.

The bundled local catalog contains **374 USDA Foundation Foods** from the October
2026 release, with FDC identifiers, source links, nutrient values per 100 g, and null
values for missing nutrients. Data are [CC0](https://fdc.nal.usda.gov/api-guide/).
The original download is recorded in `data/food_catalog.json`. The legacy sample
`food_database.json` remains only for educational ML tests.

## Optional providers

Provider adapters are configurable and remain disabled unless selected explicitly.

| Feature | Configuration |
|---|---|
| Coach and photo analysis | `NUTRIAI_AI_PROVIDER=openai`, `OPENAI_API_KEY`, `NUTRIAI_AI_MODEL`; optionally `NUTRIAI_VISION_MODEL` |
| Responses-compatible service | `NUTRIAI_AI_PROVIDER=openai_compatible` and a trusted `NUTRIAI_AI_BASE_URL` |
| Phone verification | `NUTRIAI_SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` |
| Require verified phones for tracking | `NUTRIAI_REQUIRE_VERIFIED_PHONE=true`; startup fails if SMS is not configured |
| Live food search | `NUTRIAI_FOOD_PROVIDER=usda`, `USDA_API_KEY` |

AI requests use the [Responses API](https://developers.openai.com/api/docs/guides/images-vision)
with `store=false`. Photo output is schema-validated and is never saved as a meal until
confirmed. Photos are restricted in size, decoded and re-encoded without metadata, and
not persisted. Messages, recent conversation, daily totals, preferences, and allergies
are sent to the configured AI service; private health-context notes are excluded.

The [Twilio Verify adapter](https://www.twilio.com/docs/verify/api/verification-check)
uses expiring, purpose-bound local challenges and attempt limits. SMS reset is allowed
only for a previously verified number. Recovery codes remain available without SMS.
Provider errors produce useful messages; they never substitute made-up predictions.

## Mobile

```sh
cd app
npm ci
npx expo start
```

Set `EXPO_PUBLIC_API_URL` to the API server's address before starting Expo. A physical
phone needs the server's LAN address and a network-reachable server binding. Use HTTPS
in production. SecureStore and camera support require an Expo-compatible native build;
the repository currently targets Expo SDK 51. Native hardware/keychain/camera behavior
must be verified on your supported devices; a successful web build is not that proof.

```sh
# Compile the mobile web target
cd app
npx expo export --platform web --output-dir ../work/mobile-web
```

## Verify

```sh
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
node --check web/app.js
npm ci
npx playwright install chromium
npm run test:e2e
```

Browser tests start their own API on port 8000 with an isolated database under `work/`.
Stop another local server on that port first. CI runs account/database/provider tests,
browser flows at phone/tablet/desktop widths, an Expo web build, and a Docker build and
startup smoke test. Provider tests mock network requests and make no paid calls.
Legacy CNN/ANN/RNN tests are educational simulations, not model-quality evaluations.

## Deploy and operate

```sh
docker compose up --build
```

Records persist in the `nutrition-data` volume. The container runs as a non-root user.
For a public deployment, place it behind HTTPS, set `NUTRIAI_SECURE_COOKIE=true`, and
set exact allowed origins. Provider keys belong only on the server. See
[operations](docs/OPERATIONS.md) for backup/restore, migrations, logging, and deployment
verification. No hosted deployment or provider account has been provisioned by this PR.

## Honest limits

The software supports real AI and SMS adapters, but live credentials, model choice,
provider quality checks, delivery tests and abuse controls remain deployment choices.
Predictive forecasting is not enabled: there is no representative training dataset or
validated model. Progress shows descriptive records instead. Clinical validation and
real-device testing are not implied by passing software tests.
