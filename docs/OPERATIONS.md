# Operations

## Database migrations

Set `NUTRIAI_DB_PATH` explicitly for each environment. Back up before an upgrade.
Startup applies additive, versioned account/food metadata migrations and upgrades
legacy plaintext passwords to PBKDF2. Existing accounts retain their data.

Migration 2 normalizes possible international phone numbers. If two old accounts
normalize to the same number, startup stops with an actionable error. Restore/use the
backup and resolve ownership with the administrator before merging those records;
never delete or combine users automatically. Legacy demo phone IDs that are not real
international numbers are preserved for data recovery but cannot use the public login
form. They require an administrator-assisted identifier migration. New registrations
cannot create those identifiers.

`schema_migrations` records versions. This is SQLite-specific storage; older design
files describing PostgreSQL compatibility are not a supported deployment configuration.

## Backups and restore

Use the SQLite backup API, not a file copy while writes are active.

```sh
python -m backend.database backup --database data/storage/nutrition.db --output backups/2026-11-03.db
python -m backend.database verify backups/2026-11-03.db
# Stop the API before restoring.
python -m backend.database restore --backup backups/2026-11-03.db --database data/storage/nutrition.db --replace
```

The backup destination must be new. Restore refuses an existing destination without
`--replace`. Replacement first creates a dated before-restore snapshot; it does not
silently discard the old database. Integrity and foreign keys are checked. Restore
onto a stopped service, restart it, and verify login, a prior diary day, hydration,
and a new write. A backup inside the same disk/volume is not disaster recovery: keep
encrypted off-host copies, set retention, schedule the backup command in the hosting
platform, and regularly rehearse restore.

Docker example:

```sh
docker compose exec ai-nutrition-assistant python -m backend.database backup --output /app/data/storage/backups/snapshot.db
docker compose cp ai-nutrition-assistant:/app/data/storage/backups/snapshot.db ./snapshot.db
```

## Health and logs

`/api/health` checks a database connection and returns 503 if unavailable. It is a
readiness signal, not an integrity scan, backup check, or provider health check. Docker
uses it for health checks. Enable `NUTRIAI_LOG_REQUESTS=true` for duration, method,
route template, and status logs. Every handled API response has `X-Request-ID`.
Application logs exclude passwords, OTPs, recovery codes, message bodies, and photos.
Route IDs and query strings may still appear in the ASGI server's access log; configure
access-log retention and redaction at your deployment boundary as appropriate.

Monitor failed requests, latency, process restarts, storage use, backup age, provider
availability, SMS sends and cost. Restrict Twilio destinations and configure provider
quotas. Built-in per-IP/per-identifier/per-user limits are a baseline, not a distributed
DDoS service. Configure trusted proxy headers correctly so clients cannot spoof the IP
used for rate limiting.

## Production checks

- HTTPS and secure cookies; exact CORS origins; no credentials in the public bundle.
- Register, save recovery codes, log in, change password, verify session revocation.
- If SMS is enabled, verify a real number, test invalid/expired codes and reset delivery.
- Confirm owner isolation, export completeness and deletion policy.
- Log/edit a meal, backfill a check-in, and check the profile's latest weight.
- Test dates around midnight in the user's timezone and after a server restart.
- Exercise photo/provider failures, non-food photos, dietary preference and allergy
  handling. Review nutrition estimates against labelled/reference meals before launch.
- Test native keychain persistence, camera/library permissions, offline errors, and
  accessibility on supported devices. Current mobile dependencies target Expo SDK 51;
  choose a supported development build rather than assuming compatibility with any
  installed version of Expo Go.
- Load-test realistic traffic. The test suite includes concurrent SQLite writes, but
  that is not a capacity guarantee. A single shared SQLite volume does not support an
  arbitrary multi-replica deployment; move to a service database when needed.
