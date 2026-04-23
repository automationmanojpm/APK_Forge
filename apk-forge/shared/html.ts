/** APK Forge web UI (served by the Node server). */
export function buildHtmlPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>APK Forge</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0c1222;
      --bg-elevated: #141b2e;
      --surface: #1a2336;
      --border: rgba(148, 163, 184, 0.18);
      --text: #e8edf7;
      --muted: #94a3b8;
      --accent: #2dd4bf;
      --accent-dim: #0f766e;
      --danger: #f87171;
      --success: #4ade80;
      --radius: 14px;
      --shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
      font-family: "DM Sans", system-ui, sans-serif;
      color: var(--text);
      background: var(--bg);
      line-height: 1.5;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; }
    .hidden { display: none !important; }

    .hdr {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg) 100%);
    }
    .hdr-inner {
      max-width: 72rem;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.5rem 1.25rem;
    }
    .hdr h1 {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      margin: 0;
      background: linear-gradient(135deg, #fff 0%, var(--accent) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .hdr-badge {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
      border: 1px solid rgba(45, 212, 191, 0.35);
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
    }
    .hdr-note {
      width: 100%;
      font-size: 0.8125rem;
      color: var(--muted);
      max-width: 52rem;
      margin: 0;
    }
    .hdr-note code {
      font-size: 0.78em;
      padding: 0.1em 0.35em;
      border-radius: 6px;
      background: rgba(45, 212, 191, 0.1);
      color: var(--accent);
    }

    .shell {
      max-width: 72rem;
      margin: 0 auto;
      padding: 1.25rem 1rem 3rem;
      display: grid;
      grid-template-columns: min(18rem, 100%) 1fr;
      gap: 1.25rem;
      align-items: start;
    }
    @media (max-width: 840px) {
      .shell { grid-template-columns: 1fr; }
    }

    .side {
      position: sticky;
      top: 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.1rem 1rem;
      box-shadow: var(--shadow);
    }
    @media (max-width: 840px) {
      .side { position: static; }
    }
    .side-title {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      margin: 0 0 1rem;
    }
    .side-section {
      padding-bottom: 1rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    .side-section:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .side-section.is-muted {
      opacity: 0.45;
      pointer-events: none;
    }
    .side-h {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text);
      margin: 0 0 0.5rem;
    }
    .side-hint {
      font-size: 0.75rem;
      color: var(--muted);
      margin: 0 0 0.65rem;
      line-height: 1.4;
    }
    .field { margin-bottom: 0.85rem; }
    .field:last-child { margin-bottom: 0; }
    label.f {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--muted);
      margin-bottom: 0.35rem;
    }
    select.f, input.f, textarea.f {
      width: 100%;
      padding: 0.55rem 0.65rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      color: var(--text);
      font-family: inherit;
      font-size: 0.875rem;
    }
    textarea.f {
      min-height: 4.25rem;
      resize: vertical;
      font-family: ui-monospace, "Cascadia Code", monospace;
      font-size: 0.7rem;
      line-height: 1.35;
    }
    .signing-group {
      margin-top: 0.85rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--border);
    }
    .signing-group:first-of-type {
      border-top: none;
      padding-top: 0;
      margin-top: 0.5rem;
    }
    .signing-mode-fieldset {
      border: none;
      margin: 0;
      padding: 0;
      min-width: 0;
    }
    .signing-mode-legend {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--muted);
      margin-bottom: 0.35rem;
      padding: 0;
    }
    .signing-mode-options {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .signing-mode-options label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text);
      display: flex;
      align-items: flex-start;
      gap: 0.45rem;
      cursor: pointer;
      line-height: 1.35;
    }
    .signing-mode-options input[type="radio"] {
      margin-top: 0.2rem;
      flex-shrink: 0;
      accent-color: var(--accent);
    }
    .btn-lock-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      opacity: 0.9;
    }
    button.btn-with-lock {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-link {
      background: none;
      border: none;
      color: var(--accent);
      cursor: pointer;
      text-decoration: underline;
      font: inherit;
      padding: 0;
      font-size: inherit;
    }
    .btn-link:hover {
      color: #5eead4;
    }
    dialog.save-auth-dialog {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0;
      background: var(--surface);
      color: var(--text);
      max-width: min(22rem, 94vw);
      box-shadow: var(--shadow);
    }
    dialog.save-auth-dialog::backdrop {
      background: rgba(0, 0, 0, 0.55);
    }
    .save-auth-dialog-inner {
      padding: 1.25rem 1.35rem;
    }
    .save-auth-dialog-title {
      margin: 0 0 0.5rem;
      font-size: 1rem;
      font-weight: 600;
    }
    details.signing-default-details {
      margin-top: 0.65rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.12);
      overflow: hidden;
    }
    details.signing-default-details > summary.signing-default-summary {
      list-style: none;
      cursor: pointer;
      padding: 0.55rem 0.65rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 0.4rem;
      user-select: none;
    }
    details.signing-default-details > summary.signing-default-summary::-webkit-details-marker {
      display: none;
    }
    details.signing-default-details > summary.signing-default-summary::before {
      content: "+";
      font-weight: 700;
      color: var(--accent);
      width: 1.1rem;
      text-align: center;
      flex-shrink: 0;
    }
    details.signing-default-details[open] > summary.signing-default-summary::before {
      content: "−";
    }
    details.signing-default-details[open] > summary.signing-default-summary {
      color: var(--accent);
      border-bottom: 1px solid var(--border);
    }
    .signing-default-details-body {
      padding: 0 0.65rem 0.75rem;
    }
    select.f:focus, input.f:focus, textarea.f:focus {
      outline: none;
      border-color: rgba(45, 212, 191, 0.5);
      box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.12);
    }

    .main { min-width: 0; }
    .main.main-stack {
      display: grid;
      gap: 1.25rem;
      align-items: start;
      grid-template-columns: 1fr;
      grid-template-areas:
        "app"
        "output"
        "go"
        "progress"
        "out";
    }
    .app-config-card { grid-area: app; }
    .output-config-card { grid-area: output; }
    .main.main-stack > #go { grid-area: go; }
    .main.main-stack > #build-progress { grid-area: progress; }
    .main.main-stack > #out { grid-area: out; }
    @media (min-width: 960px) {
      .main.main-stack {
        grid-template-columns: 1fr min(17.5rem, 32vw);
        grid-template-areas:
          "app output"
          "go output"
          "progress output"
          "out output";
      }
      .output-config-card {
        position: sticky;
        top: 1rem;
      }
    }
    .main.main-stack > .card {
      margin-bottom: 0;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem 1.35rem;
      box-shadow: var(--shadow);
      margin-bottom: 1rem;
    }
    .card-legend {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
      margin: 0 0 1rem;
    }
    .row-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    button.btn {
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      padding: 0.5rem 0.9rem;
      border-radius: 10px;
      cursor: pointer;
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      color: var(--text);
      transition: background 0.15s, border-color 0.15s;
    }
    button.btn:hover:not(:disabled) {
      border-color: rgba(45, 212, 191, 0.35);
      background: rgba(45, 212, 191, 0.08);
    }
    button.btn:disabled { opacity: 0.45; cursor: not-allowed; }
    button.btn-primary {
      width: 100%;
      margin-top: 0.25rem;
      padding: 0.85rem 1rem;
      font-size: 0.9375rem;
      border: none;
      background: linear-gradient(135deg, var(--accent-dim) 0%, #115e59 50%, var(--accent-dim) 100%);
      color: #fff;
      box-shadow: 0 8px 24px rgba(15, 118, 110, 0.35);
    }
    button.btn-primary:hover:not(:disabled) {
      filter: brightness(1.06);
    }

    .note { font-size: 0.8125rem; color: var(--muted); margin-top: 0.5rem; line-height: 1.45; }
    .err { color: var(--danger); font-size: 0.875rem; margin-top: 0.5rem; white-space: pre-wrap; }
    .ok { color: var(--success); font-size: 0.875rem; margin-top: 0.5rem; }
    .application-id-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem 0.85rem;
    }
    .application-id-row .application-id-input {
      flex: 1 1 12rem;
      min-width: 10rem;
    }
    a.play-store-link {
      color: var(--accent);
      font-weight: 600;
      font-size: 0.8125rem;
      text-decoration: underline;
      white-space: nowrap;
    }
    a.play-store-link:hover {
      color: #5eead4;
    }
    a.play-store-link[aria-disabled="true"] {
      color: var(--muted);
      pointer-events: none;
      cursor: not-allowed;
      text-decoration: none;
    }

    #build-progress {
      margin-top: 1rem;
      padding: 1rem 1.1rem;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    #build-progress .build-progress-meta { font-size: 0.78rem; color: var(--muted); margin: 0.35rem 0 0.5rem; }
    #build-queue-status {
      font-size: 0.78rem;
      color: var(--accent);
      margin: 0.35rem 0 0;
      line-height: 1.4;
    }
    .build-progress-track {
      width: 100%; height: 0.5rem; border-radius: 999px; overflow: hidden;
      background: rgba(148, 163, 184, 0.15);
    }
    .build-progress-fill {
      height: 100%; width: 36%; border-radius: 999px;
      background: linear-gradient(90deg, var(--accent-dim), var(--accent), var(--accent-dim));
      animation: build-progress-slide 1.25s ease-in-out infinite;
    }
    @keyframes build-progress-slide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(320%); }
    }

    .site-footer {
      margin-top: 2.5rem;
      padding: 1rem 1.25rem 2rem;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 0.8125rem;
      color: var(--muted);
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <header class="hdr">
    <div class="hdr-inner">
      <h1>APK Forge</h1>
      <span class="hdr-badge">Local Gradle</span>
      <p class="hdr-note">
        Builds run on this machine (<code>ANDROID_PROJECT_ROOT</code> in <code>apk-forge/server/.env</code>).
        APK and AAB outputs use the same name pattern: <code>displayName-buildType-vversionName</code>.
        Requests are logged in the server terminal.
      </p>
    </div>
  </header>

  <main class="shell">
    <aside class="side" aria-label="Signing configuration">
      <p class="side-title">Configuration</p>
      <p id="editor-session-line" class="note hidden" style="margin:-0.35rem 0 0.85rem;font-size:0.75rem;line-height:1.45">
        <span id="editor-session-text"></span>
        <button type="button" class="btn-link" id="editor-sign-out">Sign out</button>
      </p>

      <div class="side-section" id="signing-section">
        <h3 class="side-h">Signing (release)</h3>
        <p class="side-hint"><strong>Release</strong> reads signing from <code>apk-forge/server/.env</code>. Put <code>RELEASE_KEYSTORE_FILE</code> (absolute; or relative to the Android project root; or <code>.android/…</code> under your user profile for the default debug keystore) and/or <code>ANDROID_KEYSTORE_BASE64</code> there directly. Use <strong>+/−</strong> on <strong>Default credentials</strong> to expand (collapsed by default). <strong>Save to .env</strong> opens a sign-in dialog when required. <strong>Save</strong> only updates the fields sent from the form (the other default group in <code>.env</code> is unchanged). If both ANDROID_* and RELEASE_* are set, Gradle uses ANDROID base64 first. <strong>Debug</strong> ignores signing. Localhost only.</p>
        <fieldset class="signing-mode-fieldset field" id="signing-mode-fieldset">
          <legend class="signing-mode-legend">Keystore group</legend>
          <div class="signing-mode-options">
            <label>
              <input type="radio" name="signing_mode" id="signing_mode_default" value="default" checked />
              <span>Default — path or base64 in <code>.env</code>, credentials below</span>
            </label>
            <label>
              <input type="radio" name="signing_mode" id="signing_mode_custom" value="custom" />
              <span>Custom — <code>CUSTOM_ANDROID_*</code> (base64 + credentials)</span>
            </label>
          </div>
        </fieldset>

        <div class="row-actions" style="margin-top:0.65rem">
          <button type="button" class="btn" id="load-signing">Load from .env</button>
          <button type="button" class="btn btn-with-lock" id="save-signing" aria-label="Save signing to .env (locked)">
            <svg class="btn-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Save to .env
          </button>
        </div>
        <p id="signing-msg" class="note" aria-live="polite"></p>

        <details class="signing-default-details" id="signing-default-details">
          <summary class="signing-default-summary">
            <span class="signing-default-summary-text">Default credentials (RELEASE / ANDROID)</span>
          </summary>
          <div class="signing-default-details-body">
        <div id="signing-default-credentials">
          <div class="field" style="margin-top:0.65rem">
            <label class="f" for="signing_default_credential_source">Default credentials</label>
            <select class="f" id="signing_default_credential_source" aria-controls="signing-default-release-panel signing-default-android-panel">
              <option value="release">RELEASE_* — file keystore (RELEASE_KEYSTORE_FILE in .env)</option>
              <option value="android">ANDROID_* — base64 keystore (ANDROID_KEYSTORE_BASE64 in .env)</option>
            </select>
          </div>

          <div id="signing-default-release-panel" class="signing-group" role="region" aria-labelledby="signing-default-cred-label-release">
            <p id="signing-default-cred-label-release" class="env-k" style="margin-top:0">RELEASE_* — store / alias / key</p>
            <div class="field">
              <label class="f" for="RELEASE_STORE_PASSWORD">RELEASE_STORE_PASSWORD</label>
              <input class="f" id="RELEASE_STORE_PASSWORD" type="password" autocomplete="off" />
            </div>
            <div class="field">
              <label class="f" for="RELEASE_KEY_ALIAS">RELEASE_KEY_ALIAS</label>
              <input class="f" id="RELEASE_KEY_ALIAS" autocomplete="off" />
            </div>
            <div class="field">
              <label class="f" for="RELEASE_KEY_PASSWORD">RELEASE_KEY_PASSWORD</label>
              <input class="f" id="RELEASE_KEY_PASSWORD" type="password" autocomplete="off" />
            </div>
          </div>

          <div id="signing-default-android-panel" class="signing-group hidden" role="region" aria-hidden="true" aria-labelledby="signing-default-cred-label-android">
            <p id="signing-default-cred-label-android" class="env-k" style="margin-top:0">ANDROID_* — store / alias / key</p>
            <div class="field">
              <label class="f" for="ANDROID_KEYSTORE_PASSWORD">ANDROID_KEYSTORE_PASSWORD</label>
              <input class="f" id="ANDROID_KEYSTORE_PASSWORD" type="password" autocomplete="off" />
            </div>
            <div class="field">
              <label class="f" for="ANDROID_KEY_ALIAS">ANDROID_KEY_ALIAS</label>
              <input class="f" id="ANDROID_KEY_ALIAS" autocomplete="off" />
            </div>
            <div class="field">
              <label class="f" for="ANDROID_KEY_PASSWORD">ANDROID_KEY_PASSWORD</label>
              <input class="f" id="ANDROID_KEY_PASSWORD" type="password" autocomplete="off" />
            </div>
          </div>
        </div>
          </div>
        </details>

        <div id="signing-custom-panel" class="signing-group hidden" aria-hidden="true">
          <p class="env-k" style="margin-top:0">CUSTOM_ANDROID_* — custom / second keystore</p>
          <div class="field">
            <label class="f" for="CUSTOM_ANDROID_KEYSTORE_BASE64">CUSTOM_ANDROID_KEYSTORE_BASE64</label>
            <textarea class="f" id="CUSTOM_ANDROID_KEYSTORE_BASE64" rows="3" spellcheck="false"></textarea>
          </div>
          <div class="field">
            <label class="f" for="CUSTOM_ANDROID_KEYSTORE_PASSWORD">CUSTOM_ANDROID_KEYSTORE_PASSWORD</label>
            <input class="f" id="CUSTOM_ANDROID_KEYSTORE_PASSWORD" type="password" autocomplete="off" />
          </div>
          <div class="field">
            <label class="f" for="CUSTOM_ANDROID_KEY_ALIAS">CUSTOM_ANDROID_KEY_ALIAS</label>
            <input class="f" id="CUSTOM_ANDROID_KEY_ALIAS" autocomplete="off" />
          </div>
          <div class="field">
            <label class="f" for="CUSTOM_ANDROID_KEY_PASSWORD">CUSTOM_ANDROID_KEY_PASSWORD</label>
            <input class="f" id="CUSTOM_ANDROID_KEY_PASSWORD" type="password" autocomplete="off" />
          </div>
        </div>
      </div>
    </aside>

    <div class="main main-stack">
      <section class="card app-config-card" aria-labelledby="app-fields-title">
        <p id="app-fields-title" class="card-legend">App · gradle.properties &amp; Gradle -P</p>
        <div class="field">
          <label class="f" for="application_id">applicationId</label>
          <div class="application-id-row">
            <input class="f application-id-input" id="application_id" autocomplete="off" placeholder="com.example.client" />
            <a class="play-store-link" id="check-play-store" href="#" target="_blank" rel="noopener noreferrer" aria-disabled="true">Check in Play Store</a>
          </div>
        </div>
        <div class="field">
          <label class="f" for="display_name">displayName</label>
          <input class="f" id="display_name" autocomplete="off" placeholder="Client App" />
        </div>
        <div class="field">
          <label class="f" for="version_code">versionCode</label>
          <input class="f" id="version_code" autocomplete="off" placeholder="42" inputmode="numeric" />
        </div>
        <div class="field">
          <label class="f" for="version_name">versionName</label>
          <input class="f" id="version_name" autocomplete="off" placeholder="1.0.0" />
        </div>
        <div class="row-actions">
          <button type="button" class="btn" id="load-config">Load from gradle.properties</button>
          <button type="button" class="btn btn-with-lock" id="save-config" aria-label="Save to gradle.properties (locked)">
            <svg class="btn-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Save to gradle.properties
          </button>
        </div>
        <p id="config-msg" class="note" aria-live="polite"></p>
        <p class="note">When the server enables editor auth, <strong>Save to gradle.properties</strong> opens a sign-in dialog first.</p>
        <p class="note"><strong>Check in Play Store</strong> opens the Google Play listing for the current applicationId in a new tab.</p>
      </section>

      <section class="card output-config-card" id="output-config-section" aria-labelledby="output-config-title">
        <p id="output-config-title" class="card-legend">Output config</p>
        <p class="note" style="margin-top:0;margin-bottom:1rem">Gradle task and artifact format for <strong>Start build</strong>.</p>
        <div class="field">
          <label class="f" for="build_variant">Build type</label>
          <select class="f" id="build_variant">
            <option value="release" selected>Release</option>
            <option value="debug">Debug</option>
          </select>
        </div>
        <div class="field">
          <label class="f" for="artifact_type">Artifact</label>
          <select class="f" id="artifact_type">
            <option value="apk">APK</option>
            <option value="aab">AAB</option>
          </select>
        </div>
      </section>

      <button class="btn btn-primary" id="go" type="button">Start build</button>
      <div id="build-progress" class="hidden" aria-live="polite" aria-busy="false">
        <p class="note" style="margin-top:0"><strong id="build-progress-phase">Starting Gradle…</strong></p>
        <p class="build-progress-meta" id="build-progress-meta">Elapsed 0:00</p>
        <p id="build-queue-status" class="hidden" aria-live="polite"></p>
        <div class="build-progress-track" role="progressbar" aria-valuetext="Build in progress">
          <div class="build-progress-fill"></div>
        </div>
      </div>
      <div id="out"></div>
    </div>
  </main>

  <dialog id="save-auth-dialog" class="save-auth-dialog" aria-labelledby="save-auth-dialog-title">
    <div class="save-auth-dialog-inner">
      <h3 class="save-auth-dialog-title" id="save-auth-dialog-title">Sign in to save</h3>
      <p id="save-auth-dialog-hint" class="note" style="margin-top:0;margin-bottom:1rem"></p>
      <div class="field">
        <label class="f" for="save_auth_dialog_email">Email</label>
        <input class="f" id="save_auth_dialog_email" type="email" autocomplete="username" />
      </div>
      <div class="field">
        <label class="f" for="save_auth_dialog_password">Password</label>
        <input class="f" id="save_auth_dialog_password" type="password" autocomplete="current-password" />
      </div>
      <p id="save-auth-dialog-err" class="note err hidden" style="margin-top:0"></p>
      <div class="row-actions" style="margin-top:1rem">
        <button type="button" class="btn" id="save-auth-dialog-cancel">Cancel</button>
        <button type="button" class="btn" id="save-auth-dialog-submit">Sign in and save</button>
      </div>
    </div>
  </dialog>

  <footer class="site-footer" role="contentinfo">
    ⚙️ Created &amp; Powered by the Automation Team 🤖 &amp; AI
  </footer>

  <script>
    const out = document.getElementById("out");
    const go = document.getElementById("go");
    const buildProgress = document.getElementById("build-progress");
    const buildProgressPhase = document.getElementById("build-progress-phase");
    const buildProgressMeta = document.getElementById("build-progress-meta");
    const buildQueueStatus = document.getElementById("build-queue-status");
    var queuePollId = null;
    const applicationIdInput = document.getElementById("application_id");
    const checkPlayStoreLink = document.getElementById("check-play-store");
    const loadConfigBtn = document.getElementById("load-config");
    const saveConfigBtn = document.getElementById("save-config");
    const configMsg = document.getElementById("config-msg");
    const buildVariant = document.getElementById("build_variant");
    const signingModeDefault = document.getElementById("signing_mode_default");
    const signingModeCustom = document.getElementById("signing_mode_custom");
    const signingCustomPanel = document.getElementById("signing-custom-panel");
    const signingSection = document.getElementById("signing-section");
    const signingDefaultDetails = document.getElementById("signing-default-details");
    const editorSessionLine = document.getElementById("editor-session-line");
    const editorSessionText = document.getElementById("editor-session-text");
    const editorSignOut = document.getElementById("editor-sign-out");
    const saveAuthDialog = document.getElementById("save-auth-dialog");
    const saveAuthDialogHint = document.getElementById("save-auth-dialog-hint");
    const saveAuthDialogEmail = document.getElementById("save_auth_dialog_email");
    const saveAuthDialogPassword = document.getElementById("save_auth_dialog_password");
    const saveAuthDialogErr = document.getElementById("save-auth-dialog-err");
    const saveAuthDialogCancel = document.getElementById("save-auth-dialog-cancel");
    const saveAuthDialogSubmit = document.getElementById("save-auth-dialog-submit");
    const signingDefaultCredentialSource = document.getElementById("signing_default_credential_source");
    const signingDefaultReleasePanel = document.getElementById("signing-default-release-panel");
    const signingDefaultAndroidPanel = document.getElementById("signing-default-android-panel");
    const loadSigningBtn = document.getElementById("load-signing");
    const saveSigningBtn = document.getElementById("save-signing");
    const signingMsg = document.getElementById("signing-msg");
    var SIGNING_SAVE_TOKEN_KEY = "apkForgeSigningSaveToken";
    var signingSaveAllowed = false;
    var signingSaveConfiguredOnServer = false;
    var pendingEditorSave = /** @type {"signing" | "gradle" | null} */ (null);
    var RELEASE_SIGNING_FORM_IDS = [
      "RELEASE_STORE_PASSWORD",
      "RELEASE_KEY_ALIAS",
      "RELEASE_KEY_PASSWORD",
    ];
    var ANDROID_SIGNING_FORM_IDS = [
      "ANDROID_KEYSTORE_PASSWORD",
      "ANDROID_KEY_ALIAS",
      "ANDROID_KEY_PASSWORD",
    ];
    var CUSTOM_SIGNING_FORM_IDS = [
      "CUSTOM_ANDROID_KEYSTORE_BASE64",
      "CUSTOM_ANDROID_KEYSTORE_PASSWORD",
      "CUSTOM_ANDROID_KEY_ALIAS",
      "CUSTOM_ANDROID_KEY_PASSWORD",
    ];
    var ALL_SIGNING_FORM_IDS = RELEASE_SIGNING_FORM_IDS.concat(ANDROID_SIGNING_FORM_IDS).concat(CUSTOM_SIGNING_FORM_IDS);
    var CUSTOM_SIGNING_PREFIX = "CUSTOM_ANDROID_";
    var DEFAULT_CRED_SESSION_KEY = "apkForgeDefaultCred";

    function getSigningModeValue() {
      var c = document.querySelector('input[name="signing_mode"]:checked');
      return c && c.value ? c.value : "default";
    }

    function setSigningModeRadiosFromValue(mode) {
      if (mode === "custom" && signingModeCustom) {
        signingModeCustom.checked = true;
      } else if (signingModeDefault) {
        signingModeDefault.checked = true;
      }
    }

    function getDefaultCredentialSource() {
      if (!signingDefaultCredentialSource) return "release";
      return signingDefaultCredentialSource.value === "android" ? "android" : "release";
    }

    function inferDefaultCredentialSourceFromEnv(j) {
      var b64 = typeof j.ANDROID_KEYSTORE_BASE64 === "string" ? j.ANDROID_KEYSTORE_BASE64.trim() : "";
      var kf = typeof j.RELEASE_KEYSTORE_FILE === "string" ? j.RELEASE_KEYSTORE_FILE.trim() : "";
      if (b64 && !kf) return "android";
      if (kf && !b64) return "release";
      var rAlias = typeof j.RELEASE_KEY_ALIAS === "string" ? j.RELEASE_KEY_ALIAS.trim() : "";
      var aAlias = typeof j.ANDROID_KEY_ALIAS === "string" ? j.ANDROID_KEY_ALIAS.trim() : "";
      if (aAlias && !rAlias) return "android";
      if (rAlias && !aAlias) return "release";
      try {
        var p = sessionStorage.getItem(DEFAULT_CRED_SESSION_KEY);
        if (p === "android" || p === "release") return p;
      } catch (e) { /* private mode */ }
      return "release";
    }

    function setSigningMsg(text, isErr) {
      signingMsg.textContent = text || "";
      signingMsg.className = "note" + (isErr ? " err" : "");
    }

    function syncSaveSigningButton() {
      var debug = buildVariant.value === "debug";
      if (saveSigningBtn) {
        saveSigningBtn.disabled = debug;
      }
    }

    function updateEditorSessionLine() {
      if (!editorSessionLine || !editorSessionText) return;
      if (signingSaveAllowed && signingSaveConfiguredOnServer) {
        editorSessionLine.classList.remove("hidden");
        editorSessionText.textContent = "Signed in — locked saves enabled for this tab. ";
      } else {
        editorSessionLine.classList.add("hidden");
        editorSessionText.textContent = "";
      }
    }

    function setSaveAuthDialogErr(text) {
      if (!saveAuthDialogErr) return;
      saveAuthDialogErr.textContent = text || "";
      saveAuthDialogErr.classList.toggle("hidden", !text);
    }

    function openSaveAuthDialog(target) {
      pendingEditorSave = target;
      setSaveAuthDialogErr("");
      if (saveAuthDialogHint) {
        saveAuthDialogHint.textContent =
          "Enter the editor email and password (SIGNING_EDITOR_EMAIL / SIGNING_EDITOR_PASSWORD on the server). The same sign-in protects Save to .env and Save to gradle.properties.";
      }
      if (saveAuthDialogPassword) saveAuthDialogPassword.value = "";
      if (saveAuthDialog && typeof saveAuthDialog.showModal === "function") {
        saveAuthDialog.showModal();
        if (saveAuthDialogEmail) saveAuthDialogEmail.focus();
      }
    }

    function closeSaveAuthDialog() {
      pendingEditorSave = null;
      if (saveAuthDialog && typeof saveAuthDialog.close === "function") {
        saveAuthDialog.close();
      }
      setSaveAuthDialogErr("");
    }

    async function refreshSigningSaveGate() {
      var tok = "";
      try {
        tok = sessionStorage.getItem(SIGNING_SAVE_TOKEN_KEY) || "";
      } catch (e) {
        tok = "";
      }
      var headers = {};
      if (tok) {
        headers["Authorization"] = "Bearer " + tok;
      }
      signingSaveAllowed = false;
      signingSaveConfiguredOnServer = false;
      try {
        var r = await fetch("/api/signing-auth/status", { headers: headers });
        var j = await r.json().catch(function () {
          return {};
        });
        if (!r.ok) {
          updateEditorSessionLine();
          syncSaveSigningButton();
          return;
        }
        signingSaveConfiguredOnServer = j.signing_save_enabled === true;
        if (signingSaveConfiguredOnServer && j.signed_in) {
          signingSaveAllowed = true;
        }
      } catch (e) {
        /* ignore */
      }
      updateEditorSessionLine();
      syncSaveSigningButton();
    }

    function readSigningPayloadFromForm() {
      var o = {};
      function add(ids) {
        ids.forEach(function (id) {
          var el = document.getElementById(id);
          if (el) o[id] = el.value;
        });
      }
      if (getSigningModeValue() === "custom") {
        add(CUSTOM_SIGNING_FORM_IDS);
      } else {
        if (getDefaultCredentialSource() === "android") {
          add(ANDROID_SIGNING_FORM_IDS);
        } else {
          add(RELEASE_SIGNING_FORM_IDS);
        }
      }
      return o;
    }

    function applySigningValuesToForm(j) {
      if (!j || typeof j !== "object") return;
      for (var id in j) {
        if (!Object.prototype.hasOwnProperty.call(j, id)) continue;
        var el = document.getElementById(id);
        if (el) {
          el.value = typeof j[id] === "string" ? j[id] : "";
        }
      }
    }

    async function fetchSigningConfigResponse() {
      var r = await fetch("/api/signing-config");
      var j = await r.json().catch(function () { return {}; });
      return { r: r, j: j };
    }

    function applySigningLoadedJson(j) {
      if (!j || typeof j !== "object") return;
      applySigningValuesToForm(j);
      var customB64 = typeof j.CUSTOM_ANDROID_KEYSTORE_BASE64 === "string" ? j.CUSTOM_ANDROID_KEYSTORE_BASE64.trim() : "";
      if (customB64.length > 0) {
        setSigningModeRadiosFromValue("custom");
      } else {
        setSigningModeRadiosFromValue("default");
        if (signingDefaultCredentialSource) {
          signingDefaultCredentialSource.value = inferDefaultCredentialSourceFromEnv(j);
        }
      }
      syncSigningUi();
    }

    async function loadSigningFromEnv() {
      setSigningMsg("", false);
      loadSigningBtn.disabled = true;
      try {
        var res = await fetchSigningConfigResponse();
        if (!res.r.ok) {
          setSigningMsg(res.j.error || ("HTTP " + res.r.status), true);
          return;
        }
        applySigningLoadedJson(res.j);
        setSigningMsg("Loaded from server .env.", false);
      } catch (e) {
        setSigningMsg(String(e && e.message ? e.message : e), true);
      } finally {
        loadSigningBtn.disabled = false;
        syncSigningUi();
      }
    }

    async function saveSigningToEnvImpl() {
      var tok = "";
      try {
        tok = sessionStorage.getItem(SIGNING_SAVE_TOKEN_KEY) || "";
      } catch (e) {
        tok = "";
      }
      if (signingSaveConfiguredOnServer && !tok) {
        openSaveAuthDialog("signing");
        return;
      }
      saveSigningBtn.disabled = true;
      try {
        var headers = { "content-type": "application/json" };
        if (signingSaveConfiguredOnServer && tok) {
          headers["Authorization"] = "Bearer " + tok;
        }
        var r = await fetch("/api/signing-config", {
          method: "PUT",
          headers: headers,
          body: JSON.stringify(readSigningPayloadFromForm()),
        });
        var j = await r.json().catch(function () { return {}; });
        if (r.status === 401) {
          try {
            sessionStorage.removeItem(SIGNING_SAVE_TOKEN_KEY);
          } catch (e2) { /* ignore */ }
          await refreshSigningSaveGate();
          syncSigningUi();
          setSigningMsg(
            j.error || "Session expired. Use Save again to sign in.",
            true,
          );
          openSaveAuthDialog("signing");
          return;
        }
        if (!r.ok) {
          setSigningMsg(j.error || ("HTTP " + r.status), true);
          return;
        }
        setSigningMsg(j.message || "Saved.", false);
        try {
          var res2 = await fetchSigningConfigResponse();
          if (res2.r.ok) {
            applySigningLoadedJson(res2.j);
          }
        } catch (e3) { /* ignore */ }
      } catch (e) {
        setSigningMsg(String(e && e.message ? e.message : e), true);
      } finally {
        saveSigningBtn.disabled = false;
        syncSaveSigningButton();
      }
    }

    async function onSaveSigningClick() {
      setSigningMsg("", false);
      if (buildVariant.value === "debug") {
        return;
      }
      await refreshSigningSaveGate();
      if (!signingSaveConfiguredOnServer) {
        await saveSigningToEnvImpl();
        return;
      }
      if (!signingSaveAllowed) {
        openSaveAuthDialog("signing");
        return;
      }
      await saveSigningToEnvImpl();
    }

    function setConfigMsg(text, isErr) {
      configMsg.textContent = text || "";
      configMsg.className = "note" + (isErr ? " err" : "");
    }

    function readAppFieldsPayload() {
      return {
        application_id: document.getElementById("application_id").value.trim(),
        display_name: document.getElementById("display_name").value.trim(),
        version_code: document.getElementById("version_code").value.trim(),
        version_name: document.getElementById("version_name").value.trim(),
      };
    }

    function syncSigningUi() {
      var debug = buildVariant.value === "debug";
      var useCustom = getSigningModeValue() === "custom";
      var src = getDefaultCredentialSource();
      if (signingModeDefault) signingModeDefault.disabled = debug;
      if (signingModeCustom) signingModeCustom.disabled = debug;
      signingSection.classList.toggle("is-muted", debug);
      if (signingDefaultDetails) {
        signingDefaultDetails.classList.toggle("hidden", useCustom);
        signingDefaultDetails.setAttribute("aria-hidden", useCustom ? "true" : "false");
      }
      if (signingDefaultCredentialSource) {
        signingDefaultCredentialSource.disabled = debug || useCustom;
      }
      if (signingCustomPanel) {
        signingCustomPanel.classList.toggle("hidden", !useCustom);
        signingCustomPanel.setAttribute("aria-hidden", useCustom ? "false" : "true");
      }
      var showRelease = !useCustom && src === "release";
      var showAndroid = !useCustom && src === "android";
      if (signingDefaultReleasePanel) {
        signingDefaultReleasePanel.classList.toggle("hidden", !showRelease);
        signingDefaultReleasePanel.setAttribute("aria-hidden", showRelease ? "false" : "true");
      }
      if (signingDefaultAndroidPanel) {
        signingDefaultAndroidPanel.classList.toggle("hidden", !showAndroid);
        signingDefaultAndroidPanel.setAttribute("aria-hidden", showAndroid ? "false" : "true");
      }
      RELEASE_SIGNING_FORM_IDS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.disabled = debug || useCustom || !showRelease;
      });
      ANDROID_SIGNING_FORM_IDS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.disabled = debug || useCustom || !showAndroid;
      });
      CUSTOM_SIGNING_FORM_IDS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.disabled = debug || !useCustom;
      });
      loadSigningBtn.disabled = debug;
      syncSaveSigningButton();
    }
    buildVariant.addEventListener("change", syncSigningUi);
    document.querySelectorAll('input[name="signing_mode"]').forEach(function (inp) {
      inp.addEventListener("change", syncSigningUi);
    });
    if (signingDefaultCredentialSource) {
      signingDefaultCredentialSource.addEventListener("change", function () {
        try {
          sessionStorage.setItem(DEFAULT_CRED_SESSION_KEY, getDefaultCredentialSource());
        } catch (e) { /* ignore */ }
        syncSigningUi();
      });
      try {
        var persisted = sessionStorage.getItem(DEFAULT_CRED_SESSION_KEY);
        if (persisted === "android" || persisted === "release") {
          signingDefaultCredentialSource.value = persisted;
        }
      } catch (e) { /* ignore */ }
    }
    syncSigningUi();

    async function loadConfigFromProject() {
      setConfigMsg("", false);
      loadConfigBtn.disabled = true;
      try {
        var r = await fetch("/api/config");
        var j = await r.json().catch(function () { return {}; });
        if (!r.ok) {
          setConfigMsg(j.error || ("HTTP " + r.status), true);
          return;
        }
        document.getElementById("application_id").value = j.application_id || "";
        document.getElementById("display_name").value = j.display_name || "";
        document.getElementById("version_code").value = j.version_code || "";
        document.getElementById("version_name").value = j.version_name || "";
        syncPlayStoreLink();
        setConfigMsg("Loaded from gradle.properties.", false);
      } catch (e) {
        setConfigMsg(String(e && e.message ? e.message : e), true);
      } finally {
        loadConfigBtn.disabled = false;
      }
    }

    async function saveConfigToProjectImpl() {
      setConfigMsg("", false);
      var tok = "";
      try {
        tok = sessionStorage.getItem(SIGNING_SAVE_TOKEN_KEY) || "";
      } catch (e) {
        tok = "";
      }
      if (signingSaveConfiguredOnServer && !tok) {
        openSaveAuthDialog("gradle");
        return;
      }
      saveConfigBtn.disabled = true;
      try {
        var headers = { "content-type": "application/json" };
        if (signingSaveConfiguredOnServer && tok) {
          headers["Authorization"] = "Bearer " + tok;
        }
        var r = await fetch("/api/config", {
          method: "PUT",
          headers: headers,
          body: JSON.stringify(readAppFieldsPayload()),
        });
        var j = await r.json().catch(function () { return {}; });
        if (r.status === 401) {
          try {
            sessionStorage.removeItem(SIGNING_SAVE_TOKEN_KEY);
          } catch (e2) { /* ignore */ }
          await refreshSigningSaveGate();
          syncSigningUi();
          setConfigMsg(
            j.error || "Session expired. Use Save again to sign in.",
            true,
          );
          openSaveAuthDialog("gradle");
          return;
        }
        if (!r.ok) {
          setConfigMsg(j.error || ("HTTP " + r.status), true);
          return;
        }
        setConfigMsg(j.message || "Saved.", false);
      } catch (e) {
        setConfigMsg(String(e && e.message ? e.message : e), true);
      } finally {
        saveConfigBtn.disabled = false;
      }
    }

    async function onSaveConfigClick() {
      setConfigMsg("", false);
      await refreshSigningSaveGate();
      if (!signingSaveConfiguredOnServer) {
        await saveConfigToProjectImpl();
        return;
      }
      if (!signingSaveAllowed) {
        openSaveAuthDialog("gradle");
        return;
      }
      await saveConfigToProjectImpl();
    }

    async function submitSaveAuthDialog() {
      setSaveAuthDialogErr("");
      var email = saveAuthDialogEmail ? saveAuthDialogEmail.value.trim() : "";
      var password = saveAuthDialogPassword ? saveAuthDialogPassword.value : "";
      if (!email || !password) {
        setSaveAuthDialogErr("Enter email and password.");
        return;
      }
      if (saveAuthDialogSubmit) saveAuthDialogSubmit.disabled = true;
      try {
        var r = await fetch("/api/signing-auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: email, password: password }),
        });
        var j = await r.json().catch(function () { return {}; });
        if (!r.ok) {
          setSaveAuthDialogErr(j.error || ("HTTP " + r.status));
          return;
        }
        if (j.token) {
          try {
            sessionStorage.setItem(SIGNING_SAVE_TOKEN_KEY, j.token);
          } catch (e) {
            setSaveAuthDialogErr("Could not store session in this browser.");
            return;
          }
        }
        var which = pendingEditorSave;
        if (saveAuthDialogPassword) saveAuthDialogPassword.value = "";
        if (saveAuthDialog && typeof saveAuthDialog.close === "function") {
          saveAuthDialog.close();
        }
        pendingEditorSave = null;
        await refreshSigningSaveGate();
        syncSigningUi();
        if (which === "signing") {
          setSigningMsg(j.message ? j.message + " Saving…" : "Saving…", false);
          await saveSigningToEnvImpl();
        } else if (which === "gradle") {
          setConfigMsg(j.message ? j.message + " Saving…" : "Saving…", false);
          await saveConfigToProjectImpl();
        }
      } catch (e) {
        setSaveAuthDialogErr(String(e && e.message ? e.message : e));
      } finally {
        if (saveAuthDialogSubmit) saveAuthDialogSubmit.disabled = false;
      }
    }

    loadConfigBtn.addEventListener("click", loadConfigFromProject);
    saveConfigBtn.addEventListener("click", onSaveConfigClick);
    loadSigningBtn.addEventListener("click", loadSigningFromEnv);
    saveSigningBtn.addEventListener("click", onSaveSigningClick);

    if (saveAuthDialogCancel) {
      saveAuthDialogCancel.addEventListener("click", function () {
        closeSaveAuthDialog();
      });
    }
    if (saveAuthDialogSubmit) {
      saveAuthDialogSubmit.addEventListener("click", function () {
        submitSaveAuthDialog();
      });
    }
    if (editorSignOut) {
      editorSignOut.addEventListener("click", async function () {
        try {
          sessionStorage.removeItem(SIGNING_SAVE_TOKEN_KEY);
        } catch (e) { /* ignore */ }
        await refreshSigningSaveGate();
        syncSigningUi();
      });
    }

    function formatElapsed(sec) {
      var m = Math.floor(sec / 60);
      var s = sec % 60;
      return m + ":" + (s < 10 ? "0" : "") + s;
    }

    function phaseForElapsed(sec) {
      if (sec < 25) return "Starting Gradle…";
      if (sec < 120) return "Configuring & compiling…";
      if (sec < 300) return "Packaging…";
      return "Still running…";
    }

    function showBuildProgress(show) {
      buildProgress.classList.toggle("hidden", !show);
      buildProgress.setAttribute("aria-busy", show ? "true" : "false");
    }

    function setBuildQueueStatus(text) {
      if (!buildQueueStatus) return;
      buildQueueStatus.textContent = text || "";
      buildQueueStatus.classList.toggle("hidden", !text);
    }

    function stopBuildQueuePoll() {
      if (queuePollId !== null) {
        clearInterval(queuePollId);
        queuePollId = null;
      }
      setBuildQueueStatus("");
    }

    function startBuildQueuePoll(clientBuildIdForPoll) {
      stopBuildQueuePoll();
      var cid =
        typeof clientBuildIdForPoll === "string" ? clientBuildIdForPoll.trim() : "";
      if (!cid) return;
      var poll = function () {
        var url =
          "/api/build-queue?client_build_id=" + encodeURIComponent(cid);
        fetch(url)
          .then(function (r) {
            return r.json().catch(function () {
              return {};
            });
          })
          .then(function (j) {
            if (!j || j.ok !== true) return;
            var st = j.your_status;
            var place = j.your_place;
            var total =
              typeof j.total_in_queue === "number"
                ? j.total_in_queue
                : typeof j.pending_builds === "number"
                  ? j.pending_builds
                  : 0;
            var pending =
              typeof j.pending_builds === "number" ? j.pending_builds : 0;
            if (st === "building") {
              setBuildQueueStatus("Building — Gradle is running your job.");
              return;
            }
            if (st === "queued" && place != null && total > 0) {
              setBuildQueueStatus(
                "Build queued — you are #" +
                  place +
                  " of " +
                  total +
                  " in line (moves to Building when your turn starts).",
              );
              return;
            }
            if (st === "unknown" && pending <= 0) {
              setBuildQueueStatus("");
              return;
            }
            if (st === "unknown" && pending > 0) {
              setBuildQueueStatus(
                "Build queue: " +
                  pending +
                  " job(s) active — could not resolve this tab’s place (refresh if stuck).",
              );
              return;
            }
            if (pending <= 0) {
              setBuildQueueStatus("");
            } else {
              setBuildQueueStatus(
                "Build queue: " +
                  pending +
                  " job(s) on this server (one Gradle at a time).",
              );
            }
          })
          .catch(function () {
            /* ignore */
          });
      };
      poll();
      queuePollId = setInterval(poll, 1500);
    }

    function startBuildProgressTimers() {
      var started = Date.now();
      var tick = function () {
        var sec = Math.floor((Date.now() - started) / 1000);
        if (buildProgressPhase) buildProgressPhase.textContent = phaseForElapsed(sec);
        if (buildProgressMeta) {
          buildProgressMeta.textContent =
            "Elapsed " + formatElapsed(sec) + " — waiting for Gradle. Keep this tab open.";
        }
      };
      tick();
      return setInterval(tick, 1000);
    }

    function setError(msg) {
      out.innerHTML = msg ? '<p class="err">' + msg.replace(/</g, "&lt;") + "</p>" : "";
    }
    function setOk(msg) {
      out.innerHTML = msg ? '<p class="ok">' + msg.replace(/</g, "&lt;") + "</p>" : "";
    }

    function playStoreUrlForId(id) {
      return "https://play.google.com/store/apps/details?id=" + encodeURIComponent(id.trim());
    }

    function syncPlayStoreLink() {
      if (!checkPlayStoreLink || !applicationIdInput) return;
      var aid = applicationIdInput.value.trim();
      if (!aid) {
        checkPlayStoreLink.href = "#";
        checkPlayStoreLink.setAttribute("aria-disabled", "true");
        return;
      }
      checkPlayStoreLink.href = playStoreUrlForId(aid);
      checkPlayStoreLink.removeAttribute("aria-disabled");
    }

    if (checkPlayStoreLink && applicationIdInput) {
      checkPlayStoreLink.addEventListener("click", function (e) {
        if (!applicationIdInput.value.trim()) {
          e.preventDefault();
        }
      });
      applicationIdInput.addEventListener("input", syncPlayStoreLink);
      applicationIdInput.addEventListener("change", syncPlayStoreLink);
      syncPlayStoreLink();
    }

    go.addEventListener("click", async function () {
      setError("");
      setOk("");
      out.innerHTML = "";
      var clientBuildId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "cli-" + Date.now() + "-" + Math.random().toString(16).slice(2, 10);
      var body = Object.assign(readAppFieldsPayload(), {
        build_variant: buildVariant.value,
        artifact_type: document.getElementById("artifact_type").value,
        signing_mode: getSigningModeValue(),
        client_build_id: clientBuildId,
      });
      go.disabled = true;
      showBuildProgress(true);
      startBuildQueuePoll(clientBuildId);
      if (buildProgressPhase) buildProgressPhase.textContent = "Starting Gradle…";
      var progressTimer = startBuildProgressTimers();
      try {
        var r = await fetch("/api/build", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        var j = await r.json().catch(function () { return {}; });
        if (!r.ok) {
          setError(j.error || ("HTTP " + r.status));
        } else {
          out.innerHTML = "";
          var pOk = document.createElement("p");
          pOk.className = "ok";
          pOk.textContent = j.message || "Build finished.";
          out.appendChild(pOk);
          if (
            j.queue &&
            typeof j.queue.waited_behind === "number" &&
            j.queue.waited_behind > 0
          ) {
            var pQueue = document.createElement("p");
            pQueue.className = "note";
            pQueue.textContent =
              "You were queued behind " +
              j.queue.waited_behind +
              " other build(s); Gradle runs one at a time on this server.";
            out.appendChild(pQueue);
          }
          if (j.download_path && typeof j.download_path === "string") {
            var br = document.createElement("br");
            out.appendChild(br);
            var a = document.createElement("a");
            var dlUrl = new URL(j.download_path, window.location.origin);
            a.href = dlUrl.pathname + dlUrl.search;
            a.textContent = "Download " + (j.artifact || "artifact");
            a.rel = "noopener noreferrer";
            a.style.color = "var(--accent)";
            a.style.fontWeight = "600";
            out.appendChild(a);
          }
        }
      } catch (e) {
        setError(String(e && e.message ? e.message : e));
      } finally {
        clearInterval(progressTimer);
        stopBuildQueuePoll();
        showBuildProgress(false);
        go.disabled = false;
      }
    });

    refreshSigningSaveGate().then(function () {
      syncSigningUi();
    });
    loadSigningFromEnv();
    loadConfigFromProject();
  </script>
</body>
</html>`;
}
