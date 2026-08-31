# APK Forge changelist

## 1.4.0 — 2026-08-31
- In-app file explorer (folder browse, Photos/Downloads, open/share/copy URI)
- Profile label (Personal vs Work) on QA screen and file explorer
- Managed config `qa_disable_files` disables Explore files
- In-app browser (WebView) for Test URL; in-app camera (CameraX) for Capture photo
- Managed config `qa_disable_camera`; Test URL field on QA screen (default google.com)
- Forge UI: removed Open test URL (default) field from the website form

## 1.3.0 — 2026-08-31
- Optional app icon & logo upload in the UI (PNG/WebP ≤2 MB)
- `POST /api/build-icon` → `icon_token`; build swaps main launcher assets for that run then restores
- Custom builds remove adaptive-icon XML so density bitmaps show in MDMs (e.g. AnyMDM)
- QA screen shows in-app logo; launcher uses the same image

## 1.2.1 — 2026-08-31
- Favicon for browser tab / bookmarks
- APK/AAB download via fetch+blob to reduce Chrome “Insecure download blocked” on HTTP
- Artifact responses use attachment + octet-stream headers

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
