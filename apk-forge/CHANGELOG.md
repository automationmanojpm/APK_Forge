# APK Forge changelist

## 1.2.0 — 2026-08-31
- Website shows tool version and changelist (header, expandable panel, footer)
- `GET /api/version` returns version + changelog JSON

## 1.1.0 — 2026-08-31
- Project template release keystore (`app/signing/template-release.jks`) for QA Release builds
- `signing.defaults.env` fills blank `.env` signing keys (Play-safe vs Android debug cert)
- Gradle falls back to the template keystore when `RELEASE_*` env is unset
- Device EID fetch + managed-config override on the QA app screen
- Docs: README / env.example note project signing defaults

## 1.0.0
- Local APK Forge UI + Gradle assemble/bundle (debug & release)
- Signing editor (RELEASE_* / ANDROID_* / CUSTOM_*) with optional save auth
- App identity editor (`gradle.properties` app.*)
- Serialized build queue and artifact download
