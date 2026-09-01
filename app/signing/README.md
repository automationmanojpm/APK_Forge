# QA release keystores

Committed **QA / local** signing material for `assembleRelease` and APK Forge named signatures.

**Not for Play Store or production.** Do not reuse these keystores for real app publishing.

## Signature slots (APK Forge)

| Slot | File | Alias | Store / key password |
|------|------|-------|----------------------|
| Signature 1 | `template-release.jks` | `template` | `template` |
| Signature 2 | `signature-2.jks` | `signature2` | `signature2` |
| Signature 3 | `signature-3.jks` | `signature3` | `signature3` |
| Signature 4 | `signature-4.jks` | `signature4` | `signature4` |
| Signature 5 | `signature-5.jks` | `signature5` | `signature5` |

Each slot uses a **different certificate** (distinct SHA-256 fingerprint) so QA can verify which key signed a build.

APK Forge bootstraps all five profiles from these files on first use (and fills any empty built-in slots on startup). Signature 1 also loads from `apk-forge/server/signing.defaults.env` when `.env` leaves `RELEASE_*` empty.

Override anytime per slot via the UI **Save profile** or by editing `signing.profiles.json` on the server.
