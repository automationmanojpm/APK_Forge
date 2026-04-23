# Builds: GitHub Actions (no VM) + VM backup (APK Forge)

## Triggers

| When | What runs |
|------|-----------|
| **Push / PR** to `main` or `master` | **Debug** only — `:app:assembleDebug` (no signing secrets). |
| **Push a tag** matching `v*` (e.g. `v1.0.0`) | **Release** — signed **APK + AAB** (same as manual release with outputs **both**). Requires all signing secrets below. |
| **Actions → Android build → Run workflow** | You choose every option (see table). |

## Manual workflow (`workflow_dispatch`) options

| Input | Meaning |
|-------|--------|
| **build_variant** | `debug` — no secrets. `release` — needs signing secrets. |
| **release_outputs** | Only for **release**: `apk`, `aab`, or `both`. |
| **run_clean** | If enabled, runs `./gradlew clean` before lint/build. |
| **run_lint** | If enabled, runs `:app:lintDebug` or `:app:lintRelease` before assemble/bundle (slower). |

## Tag-based release builds

Push a version tag from git (example):

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow runs as **release** with **APK + AAB**. Ensure **GitHub Actions secrets** are set on the repository before relying on tag builds.

### Release signing secrets (repository secrets)

If **Decode release keystore** fails with *missing `RELEASE_KEYSTORE_BASE64`*, the workflow does not have your keystore yet. Add **all four** secrets below (names must match exactly).

1. Open your repo on GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Add each row as its own secret (repeat for each name).

| Secret name | Value |
|-------------|--------|
| `RELEASE_KEYSTORE_BASE64` | One-line base64 of your `.jks` / `.keystore` **file** (not a path). See below. |
| `RELEASE_STORE_PASSWORD` | Keystore password |
| `RELEASE_KEY_ALIAS` | Key alias |
| `RELEASE_KEY_PASSWORD` | Key password |

**Encode the keystore file as base64 (single line, safe to paste into GitHub):**

- **Windows (PowerShell)** — replace the path, run in PowerShell, copy the printed string:
  ```powershell
  [Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\to\your-release.keystore'))
  ```
- **macOS / Linux:**
  ```bash
  base64 -w0 path/to/your-release.keystore
  ```
  On macOS without `-w0`, use: `base64 -i path/to/your-release.keystore | tr -d '\n'`

3. Run the workflow again: **Actions** → **Android build** → **Run workflow** → **release** (or push a `v*` tag).

These map to the same env vars `app/build.gradle.kts` already uses for **headless release signing** (`ciRelease`).

### Artifacts

| Trigger | Artifact name (pattern) | Contents |
|--------|---------------------------|----------|
| Push / PR (debug) | `apk-debug-*` | Debug APK |
| Manual or tag **release** (APK path) | `release-apk-*` | Signed release APK (when outputs include apk) |
| Manual or tag **release** (AAB path) | `release-aab-*` | Signed release AAB (when outputs include aab) |

Download from *Actions → workflow run → Artifacts*.

## VM backup (APK Forge)

Deploy the Node server on a VM when you are ready; until then, **GitHub Actions** covers CI builds. For local-style editing (`gradle.properties`, `apk-forge/server/.env`) and Gradle on a host, use **APK Forge** as documented in `apk-forge/SERVER-DEPLOY.txt`.

## Troubleshooting

- If the Android SDK step fails, update the `packages` line in `.github/workflows/android-build.yml` (e.g. add `build-tools;…`) to match your `compileSdk` / AGP requirements.
- JDK **17** is used to run Gradle (required for modern AGP). App bytecode remains **Java 11** per `app/build.gradle.kts`.
