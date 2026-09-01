export type BuildHtmlPageOptions = {
  /**
   * Public origin of the API (no path, no trailing slash), e.g. https://builds.example.com.
   * Empty string = same origin as the page (default when UI and API are served together).
   */
  apiBase?: string;
  /** APK Forge tool version (from apk-forge/VERSION). */
  version?: string;
  /** Latest changelist bullets (from apk-forge/CHANGELOG.md). */
  latestChanges?: string[];
  /** Full changelog markdown text for the expandable panel. */
  changelog?: string;
};

function normalizeApiBase(raw: string | undefined): string {
  const t = (raw ?? "").trim().replace(/\/+$/, "");
  return t;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderChangelogBody(changelog: string, latestChanges: string[]): string {
  const raw = changelog.trim();
  if (raw) {
    return escapeHtml(raw);
  }
  if (latestChanges.length === 0) {
    return "No changelist entries yet.";
  }
  return latestChanges.map((c) => `- ${escapeHtml(c)}`).join("\n");
}

/** APK Forge web UI (served by the Node server, or built for a separate static host). */
export function buildHtmlPage(options?: BuildHtmlPageOptions): string {
  const apiBaseJson = JSON.stringify(normalizeApiBase(options?.apiBase));
  const version = (options?.version ?? "0.0.0").trim() || "0.0.0";
  const latestChanges = options?.latestChanges ?? [];
  const changelog = options?.changelog ?? "";
  const versionEsc = escapeHtml(version);
  const latestListHtml =
    latestChanges.length > 0
      ? `<ul class="changelist-preview">${latestChanges
          .map((c) => `<li>${escapeHtml(c)}</li>`)
          .join("")}</ul>`
      : `<p class="changelist-empty">No recent changes listed.</p>`;
  const changelogPre = renderChangelogBody(changelog, latestChanges);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>APK Forge v${versionEsc}</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="alternate icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/favicon.svg" />
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
    .hdr-version {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }
    .hdr-version strong {
      color: var(--accent);
      font-weight: 700;
    }
    .changelist-panel {
      max-width: 72rem;
      margin: 1.5rem auto 0;
      padding: 0 1rem;
    }
    details.changelist-details {
      margin: 0.85rem 0 0;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.65rem 0.9rem 0.75rem;
    }
    details.changelist-details > summary {
      cursor: pointer;
      list-style: none;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text);
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.35rem 0.75rem;
    }
    details.changelist-details > summary::-webkit-details-marker { display: none; }
    details.changelist-details > summary::before {
      content: "+";
      color: var(--accent);
      font-weight: 700;
      width: 1rem;
    }
    details.changelist-details[open] > summary::before { content: "−"; }
    .changelist-preview {
      margin: 0.55rem 0 0;
      padding-left: 1.15rem;
      font-size: 0.78rem;
      color: var(--muted);
      line-height: 1.45;
    }
    .changelist-preview li { margin: 0.2rem 0; }
    .changelist-empty {
      margin: 0.55rem 0 0;
      font-size: 0.78rem;
      color: var(--muted);
    }
    .changelist-full {
      margin: 0.75rem 0 0;
      padding: 0.75rem 0.85rem;
      border-radius: 10px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      font-family: ui-monospace, "Cascadia Code", monospace;
      font-size: 0.72rem;
      color: var(--muted);
      white-space: pre-wrap;
      overflow-x: auto;
      max-height: 18rem;
      line-height: 1.45;
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
    button.btn-sm {
      padding: 0.25rem 0.55rem;
      font-size: 0.75rem;
      min-height: 0;
    }
    .download-block {
      margin-top: 0.75rem;
      padding: 0.85rem 1rem;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 4px);
      background: var(--bg-elevated);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 100%;
    }
    .download-link {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
      word-break: break-all;
    }
    .download-link:hover { color: #5eead4; }
    .signing-info {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      padding-top: 0.65rem;
      border-top: 1px solid var(--border);
    }
    .signing-info-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .signing-info-row {
      display: grid;
      grid-template-columns: 5.5rem minmax(0, 1fr) auto;
      gap: 0.5rem;
      align-items: center;
    }
    .signing-info-label {
      font-size: 0.8125rem;
      color: var(--muted);
    }
    .signing-info-value {
      font-family: ui-monospace, "Cascadia Code", "Segoe UI Mono", monospace;
      font-size: 0.75rem;
      color: var(--text);
      word-break: break-all;
      line-height: 1.35;
    }
    .signing-info-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.15rem;
    }
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
    .app-icon-preview-wrap {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.65rem;
    }
    .app-icon-preview {
      width: 64px;
      height: 64px;
      object-fit: contain;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--bg-elevated);
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
      margin-top: 1rem;
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
      <span class="hdr-version" id="forge-version" title="APK Forge tool version">v<strong>${versionEsc}</strong></span>
      <p class="hdr-note">
        <strong>APK Forge</strong> is a small web tool to forge APKs and AABs for testing, or to upload to <strong>Google Play</strong> private / managed app distribution.
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
        <p class="side-hint">Five built-in signatures (<strong>Signature 1</strong> … <strong>Signature 5</strong>) are always available in the dropdown. Configure each slot’s keystore below and pick one under <strong>Release signature</strong> when building. <strong>Signature 1</strong> is prefilled from <code>.env</code> + <code>signing.defaults.env</code> on first run.</p>

        <div class="field">
          <label class="f" for="signing_profile_select">Signature</label>
          <select class="f" id="signing_profile_select">
            <option value="signature_1">Signature 1</option>
            <option value="signature_2">Signature 2</option>
            <option value="signature_3">Signature 3</option>
            <option value="signature_4">Signature 4</option>
            <option value="signature_5">Signature 5</option>
          </select>
        </div>
        <div class="field hidden" aria-hidden="true">
          <label class="f" for="signing_profile_id">Signature id</label>
          <input class="f" id="signing_profile_id" autocomplete="off" spellcheck="false" readonly />
        </div>
        <div class="field hidden" aria-hidden="true">
          <label class="f" for="signing_profile_label">Signature name</label>
          <input class="f" id="signing_profile_label" autocomplete="off" readonly />
        </div>

        <fieldset class="signing-mode-fieldset field hidden" id="signing-mode-fieldset" aria-hidden="true">
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
          <button type="button" class="btn" id="load-signing">Reload profile</button>
          <button type="button" class="btn btn-with-lock" id="save-signing" aria-label="Save signing profile (locked)">
            <svg class="btn-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Save profile
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
            <p id="signing-default-cred-label-release" class="env-k" style="margin-top:0">RELEASE_* — file keystore</p>
            <div class="field">
              <label class="f" for="RELEASE_KEYSTORE_FILE">RELEASE_KEYSTORE_FILE</label>
              <input class="f" id="RELEASE_KEYSTORE_FILE" autocomplete="off" spellcheck="false" placeholder="app/signing/template-release.jks" />
            </div>
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
            <p id="signing-default-cred-label-android" class="env-k" style="margin-top:0">ANDROID_* — base64 keystore</p>
            <div class="field">
              <label class="f" for="ANDROID_KEYSTORE_BASE64">ANDROID_KEYSTORE_BASE64</label>
              <textarea class="f" id="ANDROID_KEYSTORE_BASE64" rows="3" spellcheck="false"></textarea>
            </div>
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
        <div class="field">
          <label class="f" for="app_icon_file">App icon &amp; logo (optional)</label>
          <input class="f" id="app_icon_file" type="file" accept="image/png,image/webp,.png,.webp" />
          <p class="note" style="margin-top:0.4rem;margin-bottom:0">Square <strong>PNG</strong> ≥512×512 recommended (WebP also accepted). Used for launcher icon and in-app logo. Max 2&nbsp;MB. Adaptive icons are replaced with bitmaps so MDMs (e.g. AnyMDM) can show the logo.</p>
          <div id="app-icon-preview-wrap" class="app-icon-preview-wrap hidden">
            <img id="app_icon_preview" class="app-icon-preview" alt="Icon preview" />
            <button type="button" class="btn" id="app_icon_clear">Clear icon</button>
          </div>
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
        <div class="field" id="build-signing-profile-field">
          <label class="f" for="build_signing_profile">Release signature</label>
          <select class="f" id="build_signing_profile">
            <option value="signature_1">Signature 1</option>
            <option value="signature_2">Signature 2</option>
            <option value="signature_3">Signature 3</option>
            <option value="signature_4">Signature 4</option>
            <option value="signature_5">Signature 5</option>
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

  <div class="changelist-panel">
    <details class="changelist-details" id="changelist-details">
      <summary>
        <span>Version &amp; changelist</span>
        <span class="hdr-version">v${versionEsc}</span>
      </summary>
      ${latestListHtml}
      <pre class="changelist-full" id="changelist-full" aria-label="Full changelist">${changelogPre}</pre>
    </details>
  </div>

  <footer class="site-footer" role="contentinfo">
    APK Forge <span id="footer-version">v${versionEsc}</span>
    · ⚙️ Created &amp; Powered by the Automation Team 🤖 &amp; AI
  </footer>

  <script>
    var __API_BASE__ = ${apiBaseJson};
    function apiUrl(path) {
      var p = typeof path === "string" ? path : "";
      if (!p) return p;
      if (p.charAt(0) !== "/") p = "/" + p;
      if (!__API_BASE__) return p;
      return __API_BASE__ + p;
    }

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
    const appIconFile = document.getElementById("app_icon_file");
    const appIconPreview = document.getElementById("app_icon_preview");
    const appIconPreviewWrap = document.getElementById("app-icon-preview-wrap");
    const appIconClear = document.getElementById("app_icon_clear");
    var pendingIconFile = /** @type {File | null} */ (null);
    const signingModeDefault = document.getElementById("signing_mode_default");
    const signingModeCustom = document.getElementById("signing_mode_custom");
    const signingCustomPanel = document.getElementById("signing-custom-panel");
    const signingSection = document.getElementById("signing-section");
    const signingDefaultDetails = document.getElementById("signing-default-details");
    const signingProfileSelect = document.getElementById("signing_profile_select");
    const signingProfileIdInput = document.getElementById("signing_profile_id");
    const signingProfileLabelInput = document.getElementById("signing_profile_label");
    const buildSigningProfile = document.getElementById("build_signing_profile");
    const buildSigningProfileField = document.getElementById("build-signing-profile-field");
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
      "RELEASE_KEYSTORE_FILE",
      "RELEASE_STORE_PASSWORD",
      "RELEASE_KEY_ALIAS",
      "RELEASE_KEY_PASSWORD",
    ];
    var ANDROID_SIGNING_FORM_IDS = [
      "ANDROID_KEYSTORE_BASE64",
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
    var signingProfilesCache = /** @type {{ default_profile_id: string, profiles: Array<{id:string,label:string,mode:string,configured?:boolean}> }} */ ({
      default_profile_id: "",
      profiles: [],
    });
    var BUILTIN_SIGNATURE_COUNT = 5;

    function signatureDisplayName(index) {
      return "Signature " + (index + 1);
    }

    function signatureNumberFromId(id) {
      var m = /^signature_(\d+)$/.exec(id || "");
      if (!m) return -1;
      var n = Number(m[1]);
      return n >= 1 && n <= BUILTIN_SIGNATURE_COUNT ? n : -1;
    }

    function getSelectedSigningProfileId() {
      if (signingProfileSelect && signingProfileSelect.value) {
        return signingProfileSelect.value;
      }
      if (signingProfileIdInput && signingProfileIdInput.value) {
        return signingProfileIdInput.value.trim();
      }
      return signingProfilesCache.default_profile_id || "";
    }

    function getBuildSigningProfileId() {
      if (buildSigningProfile && buildSigningProfile.value) {
        return buildSigningProfile.value;
      }
      return getSelectedSigningProfileId();
    }

    function signatureIndexForId(id) {
      var n = signatureNumberFromId(id);
      return n > 0 ? n - 1 : -1;
    }

    function signatureDisplayForId(id) {
      var n = signatureNumberFromId(id);
      return n > 0 ? signatureDisplayName(n - 1) : id;
    }

    function copyTextToClipboard(text, btn) {
      var value = String(text || "");
      if (!value) return;
      var restore = function () {
        var prev = btn.textContent;
        btn.textContent = "Copied";
        btn.disabled = true;
        setTimeout(function () {
          btn.textContent = prev;
          btn.disabled = false;
        }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(restore).catch(function () {
          var ta = document.createElement("textarea");
          ta.value = value;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand("copy");
            restore();
          } catch (e) {
            setError("Could not copy to clipboard.");
          }
          ta.remove();
        });
        return;
      }
      var ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        restore();
      } catch (e) {
        setError("Could not copy to clipboard.");
      }
      ta.remove();
    }

    function appendSigningCopyRow(parent, label, value, copyValue) {
      var row = document.createElement("div");
      row.className = "signing-info-row";
      var lbl = document.createElement("span");
      lbl.className = "signing-info-label";
      lbl.textContent = label;
      var val = document.createElement("code");
      val.className = "signing-info-value";
      val.textContent = value;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm";
      btn.textContent = "Copy";
      btn.addEventListener("click", function () {
        copyTextToClipboard(copyValue != null ? copyValue : value, btn);
      });
      row.appendChild(lbl);
      row.appendChild(val);
      row.appendChild(btn);
      parent.appendChild(row);
    }

    function appendDownloadBlock(out, j) {
      if (!j.download_path || typeof j.download_path !== "string") return;
      var block = document.createElement("div");
      block.className = "download-block";
      var a = document.createElement("a");
      var dlBase = __API_BASE__ || window.location.origin;
      var dlUrl = String(new URL(j.download_path, dlBase));
      var dlName = j.artifact || "artifact.apk";
      a.href = dlUrl;
      a.className = "download-link";
      a.textContent = "Download " + dlName;
      a.rel = "noopener noreferrer";
      a.download = dlName;
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        a.setAttribute("aria-busy", "true");
        var prev = a.textContent;
        a.textContent = "Preparing download…";
        fetch(dlUrl, { credentials: "same-origin", cache: "no-store" })
          .then(function (r) {
            if (!r.ok) throw new Error("Download failed (HTTP " + r.status + ")");
            return r.blob();
          })
          .then(function (blob) {
            var obj = URL.createObjectURL(blob);
            var tmp = document.createElement("a");
            tmp.href = obj;
            tmp.download = dlName;
            document.body.appendChild(tmp);
            tmp.click();
            tmp.remove();
            setTimeout(function () { URL.revokeObjectURL(obj); }, 2000);
          })
          .catch(function (err) {
            setError(String(err && err.message ? err.message : err));
            window.location.assign(dlUrl);
          })
          .finally(function () {
            a.textContent = prev;
            a.removeAttribute("aria-busy");
          });
      });
      block.appendChild(a);

      var cert = j.signing_certificate && typeof j.signing_certificate === "object"
        ? j.signing_certificate
        : null;
      var profileLabel =
        typeof j.signing_profile === "string" && j.signing_profile.trim()
          ? j.signing_profile.trim()
          : buildVariant.value === "release"
            ? signatureDisplayForId(getBuildSigningProfileId())
            : "Debug";
      var copyAll =
        typeof j.signing_copy_text === "string" && j.signing_copy_text.trim()
          ? j.signing_copy_text.trim()
          : profileLabel;

      if (profileLabel || (cert && cert.sha256)) {
        var sig = document.createElement("div");
        sig.className = "signing-info";
        var title = document.createElement("div");
        title.className = "signing-info-title";
        title.textContent = "Signing";
        sig.appendChild(title);
        if (profileLabel) {
          appendSigningCopyRow(sig, "Signature", profileLabel, copyAll);
        }
        if (cert && cert.sha256) {
          appendSigningCopyRow(sig, "SHA-256", cert.sha256, cert.sha256);
        }
        var actions = document.createElement("div");
        actions.className = "signing-info-actions";
        var copyAllBtn = document.createElement("button");
        copyAllBtn.type = "button";
        copyAllBtn.className = "btn btn-sm";
        copyAllBtn.textContent = "Copy all";
        copyAllBtn.addEventListener("click", function () {
          copyTextToClipboard(copyAll, copyAllBtn);
        });
        actions.appendChild(copyAllBtn);
        sig.appendChild(actions);
        block.appendChild(sig);
      }

      out.appendChild(block);
      if (window.location.protocol === "http:") {
        var pHttp = document.createElement("p");
        pHttp.className = "note";
        pHttp.style.marginTop = "0.5rem";
        pHttp.textContent =
          "Tip: if the browser still blocks the file, click Keep, or serve APK Forge over HTTPS (see deploy/Caddyfile).";
        out.appendChild(pHttp);
      }
    }

    function isProfileConfiguredInCache(id) {
      var list = signingProfilesCache.profiles || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i].configured === true;
      }
      return false;
    }

    function firstConfiguredSignatureId() {
      for (var n = 1; n <= BUILTIN_SIGNATURE_COUNT; n++) {
        var id = "signature_" + n;
        if (isProfileConfiguredInCache(id)) return id;
      }
      return "signature_1";
    }

    function fillBuiltinSignatureSelect(sel, selectedId, opts) {
      if (!sel) return;
      var forBuild = !!(opts && opts.forBuild);
      sel.innerHTML = "";
      for (var n = 1; n <= BUILTIN_SIGNATURE_COUNT; n++) {
        var id = "signature_" + n;
        var configured = isProfileConfiguredInCache(id);
        var opt = document.createElement("option");
        opt.value = id;
        opt.textContent =
          signatureDisplayName(n - 1) + (configured ? "" : " (not configured)");
        if (forBuild && !configured) opt.disabled = true;
        sel.appendChild(opt);
      }
      var pick =
        selectedId && signatureNumberFromId(selectedId) > 0
          ? selectedId
          : "signature_1";
      sel.value = pick;
      if (forBuild && sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].disabled) {
        sel.value = firstConfiguredSignatureId();
      }
    }

    function populateSigningProfileDropdowns(store) {
      signingProfilesCache = store || { default_profile_id: "signature_1", profiles: [] };
      var active =
        (store && store.default_profile_id) ||
        getSelectedSigningProfileId() ||
        "signature_1";
      if (signatureNumberFromId(active) <= 0) {
        active = "signature_1";
      }
      fillBuiltinSignatureSelect(signingProfileSelect, active, { forBuild: false });
      fillBuiltinSignatureSelect(
        buildSigningProfile,
        getBuildSigningProfileId() || active,
        { forBuild: true },
      );
    }

    function profileModeToUi(mode) {
      if (mode === "custom_base64") {
        setSigningModeRadiosFromValue("custom");
      } else {
        setSigningModeRadiosFromValue("default");
        if (signingDefaultCredentialSource) {
          signingDefaultCredentialSource.value =
            mode === "android_base64" ? "android" : "release";
        }
      }
      syncSigningUi();
    }

    function uiModeFromForm() {
      if (getSigningModeValue() === "custom") return "custom_base64";
      return getDefaultCredentialSource() === "android"
        ? "android_base64"
        : "release_file";
    }

    function applySigningProfileToForm(profile) {
      if (!profile) return;
      if (signingProfileIdInput) signingProfileIdInput.value = profile.id || "";
      if (signingProfileLabelInput) {
        var n = signatureNumberFromId(profile.id || "");
        signingProfileLabelInput.value = n > 0 ? signatureDisplayName(n - 1) : profile.label || "";
      }
      applySigningValuesToForm(profile);
      profileModeToUi(profile.mode || uiModeFromForm());
    }

    async function fetchSigningProfilesList() {
      var r = await fetch(apiUrl("/api/signing-profiles"));
      var j = await r.json().catch(function () { return {}; });
      return { r: r, j: j };
    }

    async function loadSigningProfileById(id) {
      if (!id) return;
      var r = await fetch(apiUrl("/api/signing-profiles/" + encodeURIComponent(id)));
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) {
        throw new Error(j.error || ("HTTP " + r.status));
      }
      applySigningProfileToForm(j.profile);
    }

    async function refreshSigningProfilesAndLoadActive(preferredId) {
      var res = await fetchSigningProfilesList();
      if (res.r.ok) {
        populateSigningProfileDropdowns(res.j);
      } else {
        populateSigningProfileDropdowns(null);
        setSigningMsg(
          (res.j.error || "Could not load signing profiles (HTTP " + res.r.status + ").") +
            " Using built-in Signature 1–5; restart the server after deploy if this persists.",
          true,
        );
      }
      var id =
        preferredId ||
        getSelectedSigningProfileId() ||
        (res.r.ok && res.j.default_profile_id) ||
        "signature_1";
      if (signatureNumberFromId(id) <= 0) {
        id = "signature_1";
      }
      if (signingProfileSelect) signingProfileSelect.value = id;
      if (buildSigningProfile && !buildSigningProfile.value) {
        buildSigningProfile.value = id;
      }
      try {
        await loadSigningProfileById(id);
      } catch (e) {
        if (res.r.ok) {
          setSigningMsg(String(e && e.message ? e.message : e), true);
        }
      }
    }

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
        var r = await fetch(apiUrl("/api/signing-auth/status"), { headers: headers });
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
      var id = getSelectedSigningProfileId();
      if (!id) id = "signature_1";
      var n = signatureNumberFromId(id);
      var label = n > 0 ? signatureDisplayName(n - 1) : id;
      var o = {
        id: id,
        label: label,
        mode: uiModeFromForm(),
        set_default: true,
      };
      function add(ids) {
        ids.forEach(function (fid) {
          var el = document.getElementById(fid);
          if (el) o[fid] = el.value;
        });
      }
      if (o.mode === "custom_base64") {
        add(CUSTOM_SIGNING_FORM_IDS);
      } else if (o.mode === "android_base64") {
        add(ANDROID_SIGNING_FORM_IDS);
      } else {
        add(RELEASE_SIGNING_FORM_IDS);
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
      var r = await fetch(apiUrl("/api/signing-config"));
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
        await refreshSigningProfilesAndLoadActive(getSelectedSigningProfileId());
        setSigningMsg("Profile loaded.", false);
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
        var r = await fetch(apiUrl("/api/signing-profiles"), {
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
        setSigningMsg(j.message || "Profile saved.", false);
        try {
          await refreshSigningProfilesAndLoadActive(j.profile_id || getSelectedSigningProfileId());
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
      if (buildSigningProfileField) {
        buildSigningProfileField.classList.toggle("hidden", debug);
        buildSigningProfileField.setAttribute("aria-hidden", debug ? "true" : "false");
      }
      if (buildSigningProfile) buildSigningProfile.disabled = debug;
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
      if (signingProfileSelect) signingProfileSelect.disabled = debug;
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

    if (signingProfileSelect) {
      signingProfileSelect.addEventListener("change", async function () {
        setSigningMsg("", false);
        try {
          await loadSigningProfileById(signingProfileSelect.value);
          if (buildSigningProfile) {
            buildSigningProfile.value = signingProfileSelect.value;
            if (
              buildSigningProfile.options[buildSigningProfile.selectedIndex] &&
              buildSigningProfile.options[buildSigningProfile.selectedIndex].disabled
            ) {
              buildSigningProfile.value = firstConfiguredSignatureId();
            }
          }
        } catch (e) {
          setSigningMsg(String(e && e.message ? e.message : e), true);
        }
      });
    }

    if (buildSigningProfile) {
      buildSigningProfile.addEventListener("change", async function () {
        if (
          buildSigningProfile.options[buildSigningProfile.selectedIndex] &&
          buildSigningProfile.options[buildSigningProfile.selectedIndex].disabled
        ) {
          buildSigningProfile.value = firstConfiguredSignatureId();
          return;
        }
        setSigningMsg("", false);
        try {
          if (signingProfileSelect) {
            signingProfileSelect.value = buildSigningProfile.value;
          }
          await loadSigningProfileById(buildSigningProfile.value);
        } catch (e) {
          setSigningMsg(String(e && e.message ? e.message : e), true);
        }
      });
    }

    async function loadConfigFromProject() {
      setConfigMsg("", false);
      loadConfigBtn.disabled = true;
      try {
        var r = await fetch(apiUrl("/api/config"));
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
        var r = await fetch(apiUrl("/api/config"), {
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
        var r = await fetch(apiUrl("/api/signing-auth"), {
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
          apiUrl("/api/build-queue?client_build_id=" + encodeURIComponent(cid));
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

    function clearAppIconSelection() {
      pendingIconFile = null;
      if (appIconFile) appIconFile.value = "";
      if (appIconPreview) {
        appIconPreview.removeAttribute("src");
      }
      if (appIconPreviewWrap) appIconPreviewWrap.classList.add("hidden");
    }

    function syncAppIconPreview(file) {
      if (!file || !appIconPreview || !appIconPreviewWrap) {
        clearAppIconSelection();
        return;
      }
      pendingIconFile = file;
      var url = URL.createObjectURL(file);
      appIconPreview.onload = function () {
        URL.revokeObjectURL(url);
      };
      appIconPreview.src = url;
      appIconPreviewWrap.classList.remove("hidden");
    }

    if (appIconFile) {
      appIconFile.addEventListener("change", function () {
        var f = appIconFile.files && appIconFile.files[0] ? appIconFile.files[0] : null;
        if (!f) {
          clearAppIconSelection();
          return;
        }
        if (f.size > 2 * 1024 * 1024) {
          setConfigMsg("Icon must be 2 MB or smaller.", true);
          clearAppIconSelection();
          return;
        }
        syncAppIconPreview(f);
      });
    }
    if (appIconClear) {
      appIconClear.addEventListener("click", function () {
        clearAppIconSelection();
      });
    }

    async function uploadAppIconIfNeeded() {
      if (!pendingIconFile) return "";
      var buf = await pendingIconFile.arrayBuffer();
      var ct = pendingIconFile.type || "application/octet-stream";
      var r = await fetch(apiUrl("/api/build-icon"), {
        method: "POST",
        headers: { "content-type": ct },
        body: buf,
      });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) {
        throw new Error(j.error || ("Icon upload failed (HTTP " + r.status + ")"));
      }
      if (!j.icon_token || typeof j.icon_token !== "string") {
        throw new Error("Icon upload did not return icon_token");
      }
      return j.icon_token;
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
        client_build_id: clientBuildId,
      });
      if (buildVariant.value === "release") {
        body.signing_profile_id = getBuildSigningProfileId();
        if (!isProfileConfiguredInCache(body.signing_profile_id)) {
          setError(
            signatureDisplayForId(body.signing_profile_id) +
              " is not configured. In the Signing sidebar, select that signature, enter keystore path and passwords, then click Save profile.",
          );
          return;
        }
      }
      go.disabled = true;
      showBuildProgress(true);
      startBuildQueuePoll(clientBuildId);
      if (buildProgressPhase) buildProgressPhase.textContent = "Starting Gradle…";
      var progressTimer = startBuildProgressTimers();
      try {
        if (pendingIconFile) {
          if (buildProgressPhase) buildProgressPhase.textContent = "Uploading icon…";
          body.icon_token = await uploadAppIconIfNeeded();
        }
        if (buildProgressPhase) buildProgressPhase.textContent = "Starting Gradle…";
        var r = await fetch(apiUrl("/api/build"), {
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
          appendDownloadBlock(out, j);
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
    populateSigningProfileDropdowns(null);
    refreshSigningProfilesAndLoadActive("signature_1");
    loadConfigFromProject();
  </script>
</body>
</html>`;
}
