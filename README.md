# testApp

Android app template with optional **APK Forge** (VM web UI + local Gradle).

## Builds

| Path | Use case |
|------|----------|
| **GitHub Actions** | Push/PR → debug APK; **`v*`** tags or manual run → signed release (APK and/or AAB); optional clean, lint, and **Gradle property overrides** (`-P` / tag version). See [`docs/BUILD.md`](docs/BUILD.md). |
| **APK Forge + VM** | Backup / internal: edit signing & `gradle.properties`, run builds on the host. See [`apk-forge/SERVER-DEPLOY.txt`](apk-forge/SERVER-DEPLOY.txt). |

## Local development

Open the project in Android Studio and use **Run** as usual.
