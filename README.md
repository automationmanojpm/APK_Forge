# testApp

Android QA app template (managed config / policy checks, build info, device EID) with optional **APK Forge** (local web UI + Gradle builds).

## How to run the Android app

### Prerequisites

- [Android Studio](https://developer.android.com/studio) (Ladybug / recent stable is fine)
- JDK **17** for Gradle (Studio’s bundled JDK is enough)
- An emulator or a USB-debuggable device

### 1. Open the project

1. **File → Open** and select this repo root (the folder that contains `settings.gradle.kts` / `gradlew`).
2. Wait for Gradle sync to finish.

### 2. Configure the app identity (optional)

Edit root [`gradle.properties`](gradle.properties), then sync again:

| Property | Purpose |
|----------|---------|
| `app.applicationId` | Install / Play application ID |
| `app.displayName` | Launcher and in-app title |
| `app.versionCode` | Integer version code |
| `app.versionName` | User-visible version string |
| `app.apk_forge_endpoint` | Default URL for **Open test URL** when MDM leaves it empty |

Source package stays `com.proqa.testapp`; only change that if you intentionally rename the template.

### 3. Run from Android Studio

1. Pick a device or emulator in the toolbar.
2. Select the **app** run configuration.
3. Click **Run** (▶) or press `Shift+F10` (Windows/Linux) / `Ctrl+R` (macOS).

Studio installs a **debug** APK and launches `MainActivity`.

### 4. Run from the command line

From the repo root:

```bash
# Windows
.\gradlew.bat :app:installDebug

# macOS / Linux
./gradlew :app:installDebug
```

Then open the app on the device, or:

```bash
adb shell am start -n com.proqa.testapp/.MainActivity
```

(Use your `app.applicationId` if you changed it.)

**Debug APK only (no install):**

```bash
.\gradlew.bat :app:assembleDebug
```

Output: `app/build/outputs/apk/debug/`.

---

## How to run APK Forge (local build UI)

Use this when you want a browser UI to edit signing / `app.*` properties and trigger Gradle builds on the same machine.

### Prerequisites

- **Node.js 18+**
- Same Android SDK / JDK setup that can already run `./gradlew :app:assembleDebug` from this repo

### Steps (Windows)

```powershell
cd apk-forge\server
copy env.example .env
# Edit .env: set ANDROID_PROJECT_ROOT to the absolute path of this repo root
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (UI under `/apk-forge`).

Full deploy notes (Docker, Linux VM, signing env keys): [`apk-forge/SERVER-DEPLOY.txt`](apk-forge/SERVER-DEPLOY.txt).

---

## CI / release builds

| Path | Use case |
|------|----------|
| **GitHub Actions** | Push/PR → debug APK; **`v*`** tags or manual run → signed release (APK and/or AAB). See [`docs/BUILD.md`](docs/BUILD.md). |
| **APK Forge + VM** | Internal builds on a host with SDK installed. See [`apk-forge/SERVER-DEPLOY.txt`](apk-forge/SERVER-DEPLOY.txt). |

Local **Release** (Studio or APK Forge) signs with the committed QA keystore in [`app/signing/`](app/signing/) when no `RELEASE_*` env is set. Override via `apk-forge/server/.env` or CI secrets — not for Play Store.

---

## App features (QA screen)

- Build / device info (copy, share, print, save, email)
- Managed configuration (EMM restrictions)
- Policy action toggles (print / save / browser / email / share / copy)
- **Device EID (eUICC)** — **Fetch EID** tries the device APIs first; if Android blocks third-party access, it uses managed config `qa_device_eid` when the EMM sets it (e.g. from Android Management API `hardwareInfo.euiccChipInfo`)
