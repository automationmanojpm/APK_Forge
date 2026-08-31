# Template release keystore

Committed **QA / local** signing material for `assembleRelease` when no `RELEASE_*` / `ANDROID_*` env is set.

| Field | Value |
|-------|--------|
| File | `template-release.jks` |
| Alias | `template` |
| Store / key password | `template` |

APK Forge loads the same values from `apk-forge/server/signing.defaults.env` when `apk-forge/server/.env` leaves those keys empty. Override anytime via `.env` or the UI **Save to .env**.

**Not for Play Store or production.** Do not reuse this keystore for real app publishing.
