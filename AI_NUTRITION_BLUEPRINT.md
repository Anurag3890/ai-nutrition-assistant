# Module status

| Area | Implemented | Verification boundary |
|---|---|---|
| Accounts | Canonical phones, hashed passwords, atomic signup, expiring sessions, recovery codes, password changes, optional SMS verification/reset, export/deletion | SMS delivery needs a configured provider and real-number testing |
| Profile | Adult onboarding, activity/preferences/allergies, timezone, editable targets, synchronized dated weight | Personal targets remain estimates, not clinical advice |
| Journal | Meal create/edit/delete, portions, dated history, water, sleep/energy/weight check-ins | Partial logs cannot establish full intake |
| Nutrition data | 374 attributed USDA Foundation Foods, local search and optional live USDA search, recorded micronutrients and source metadata | Missing nutrients remain unknown; local catalog is a subset |
| Coach | Persisted conversation; configurable Responses API integration and grounded offline record summaries | Mocked contracts tested; live model quality must be evaluated |
| Photos | Native camera/library and web upload, size/format checks, metadata removal, validated structured estimates and confirmation | Disabled without provider; portion accuracy is not guaranteed |
| Progress | Timezone-aware descriptive totals, missing-day handling, batch SQL aggregation, weight history | No trained or validated predictive model is supplied |
| Web | Responsive journal/progress/coach/settings, keyboard-friendly dialogs, form errors and loading states | Browser checks cover desktop/tablet/phone widths |
| Mobile | Matching visual language, shared APIs, OS secure token storage, editing/check-ins/profile/security/photo flows | Web target builds and connects; native devices still need testing |
| Operations | Versioned migrations, SQLite backup/verify/restore, readiness, request IDs, optional request logs, CI | Hosting, HTTPS, off-host backups, monitoring and scale are deployment-specific |

Legacy experimental CNN/ANN/RNN code is retained for educational tests. It is not
used as proof of production food recognition or forecasting accuracy.
