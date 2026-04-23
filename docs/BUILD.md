# Builds: GitHub Actions (no VM) + VM backup (APK Forge)

## GitHub Actions (default when you push)

- **Pull requests and pushes** to `main` / `master` run **`:app:assembleDebug`** only (no signing secrets).
- **Manual release build:** Actions → *Android build* → *Run workflow* → choose **release**. That run produces a **signed release APK and AAB** (AAB is what you typically upload to Play Console).

### Release signing secrets (repository secrets)

Create these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `RELEASE_KEYSTORE_BASE64` | Base64 of your keystore file (`.jks` / `.keystore`). Example: `base64 -w0 my.jks` (Linux) or PowerShell `[Convert]::ToBase64String([IO.File]::ReadAllBytes('my.jks'))` |
| `RELEASE_STORE_PASSWORD` | Keystore password |
| `RELEASE_KEY_ALIAS` | Key alias |
| `RELEASE_KEY_PASSWORD` | Key password |

These map to the same env vars `app/build.gradle.kts` already uses for **headless release signing** (`ciRelease`).

### Artifacts

| Trigger | Artifact name (pattern) | Contents |
|--------|-------------------------|----------|
| Push / PR (debug) | `apk-debug-*` | Debug APK |
| Manual **release** | `release-apk-aab-*` | Signed release **APK** + **AAB** |

Download from *Actions → workflow run → Artifacts*.

## VM backup (APK Forge)

For local-style editing (`gradle.properties`, `apk-forge/server/.env`) and Gradle on your machine or VM, keep using **APK Forge** as documented in `apk-forge/SERVER-DEPLOY.txt`. Actions do not replace that UI; they complement it when you want CI builds without the VM.

## Troubleshooting

- If the Android SDK step fails, update the `packages` line in `.github/workflows/android-build.yml` (e.g. add `build-tools;…`) to match your `compileSdk` / AGP requirements.
- JDK **17** is used to run Gradle (required for modern AGP). App bytecode remains **Java 11** per `app/build.gradle.kts`.
