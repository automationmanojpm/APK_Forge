import * as jose from "jose";

export interface Env {
  GOOGLE_CLIENT_ID: string;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  WORKFLOW_FILE: string;
  DEFAULT_GIT_REF: string;
  /** Comma-separated extra origins allowed to call /api/dispatch (e.g. https://you.github.io). Same worker origin is always allowed. */
  ALLOWED_ORIGINS?: string;
}

const JWKS = jose.createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

const APPLICATION_ID_RE =
  /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

function parseExtraOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Whether the browser Origin may call this API (CORS). */
function isAllowedBrowserOrigin(
  request: Request,
  env: Env,
  origin: string | null,
): boolean {
  if (!origin) {
    return true;
  }
  const selfOrigin = new URL(request.url).origin;
  if (origin === selfOrigin) {
    return true;
  }
  return parseExtraOrigins(env.ALLOWED_ORIGINS).includes(origin);
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (!origin || !isAllowedBrowserOrigin(request, env, origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(
  request: Request,
  env: Env,
  data: unknown,
  status = 200,
): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  for (const [k, v] of Object.entries(corsHeaders(request, env))) {
    headers.set(k, v);
  }
  return new Response(JSON.stringify(data), { status, headers });
}

async function verifyGoogleIdToken(
  token: string,
  clientId: string,
): Promise<jose.JWTPayload> {
  const { payload } = await jose.jwtVerify(token, JWKS, {
    audience: clientId,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });
  return payload;
}

function validateBody(raw: unknown):
  | { ok: true; inputs: Record<string, string> }
  | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Expected JSON object body" };
  }
  const o = raw as Record<string, unknown>;

  const application_id =
    typeof o.application_id === "string" ? o.application_id.trim() : "";
  const display_name =
    typeof o.display_name === "string" ? o.display_name.trim() : "";
  const version_code =
    typeof o.version_code === "string" ? o.version_code.trim() : "";
  const version_name =
    typeof o.version_name === "string" ? o.version_name.trim() : "";
  const artifact_type =
    typeof o.artifact_type === "string" ? o.artifact_type.trim() : "";
  const signing_mode =
    typeof o.signing_mode === "string" ? o.signing_mode.trim() : "";

  if (!APPLICATION_ID_RE.test(application_id)) {
    return {
      ok: false,
      error:
        "Invalid application_id (use reverse-DNS, e.g. com.example.myapp)",
    };
  }
  if (!display_name || display_name.length > 80) {
    return { ok: false, error: "display_name must be 1–80 characters" };
  }
  if (!/^\d+$/.test(version_code)) {
    return { ok: false, error: "version_code must be digits only" };
  }
  if (!version_name || version_name.length > 40) {
    return { ok: false, error: "version_name must be 1–40 characters" };
  }
  if (artifact_type !== "apk" && artifact_type !== "aab") {
    return { ok: false, error: "artifact_type must be apk or aab" };
  }
  if (signing_mode !== "default" && signing_mode !== "custom") {
    return { ok: false, error: "signing_mode must be default or custom" };
  }

  return {
    ok: true,
    inputs: {
      application_id,
      display_name,
      version_code,
      version_name,
      artifact_type,
      signing_mode,
    },
  };
}

async function dispatchGithubWorkflow(
  env: Env,
  inputs: Record<string, string>,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const owner = env.GITHUB_OWNER.trim();
  const repo = env.GITHUB_REPO.trim();
  const workflow = env.WORKFLOW_FILE.trim();
  const ref = env.DEFAULT_GIT_REF.trim() || "main";
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "APK-Forge-Worker",
    },
    body: JSON.stringify({ ref, inputs }),
  });

  if (res.status === 204) {
    return { ok: true };
  }
  const text = await res.text();
  return {
    ok: false,
    status: res.status,
    message: text.slice(0, 2000) || res.statusText,
  };
}

function htmlPage(clientId: string): string {
  const cidJs = JSON.stringify(clientId);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>APK Forge</title>
  <style>
    :root { font-family: system-ui, sans-serif; color: #0f172a; background: #f8fafc; }
    body { max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-size: 1.5rem; }
    fieldset { border: 1px solid #cbd5e1; border-radius: 8px; padding: 1rem; margin: 1rem 0; background: #fff; }
    label { display: block; font-size: 0.875rem; font-weight: 600; margin-top: 0.75rem; }
    input, select { width: 100%; box-sizing: border-box; margin-top: 0.25rem; padding: 0.5rem; border-radius: 6px; border: 1px solid #94a3b8; }
    button.primary { margin-top: 1rem; padding: 0.6rem 1rem; border-radius: 8px; border: none; background: #0f766e; color: #fff; font-weight: 600; cursor: pointer; }
    button.primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .note { font-size: 0.875rem; color: #475569; margin-top: 0.5rem; }
    .err { color: #b91c1c; font-size: 0.875rem; margin-top: 0.5rem; white-space: pre-wrap; }
    .ok { color: #047857; font-size: 0.875rem; margin-top: 0.5rem; }
    #gsi { margin: 1rem 0; }
  </style>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
</head>
<body>
  <h1>APK Forge</h1>
  <p class="note">Sign in with Google, then start a release build on GitHub Actions using your app Gradle properties.</p>

  <div id="gsi"></div>
  <p id="who" class="note" hidden></p>

  <fieldset>
    <legend>App (Gradle <code>-P</code>)</legend>
    <label for="application_id">applicationId</label>
    <input id="application_id" autocomplete="off" placeholder="com.example.client" />
    <label for="display_name">displayName</label>
    <input id="display_name" autocomplete="off" placeholder="Client App" />
    <label for="version_code">versionCode</label>
    <input id="version_code" autocomplete="off" placeholder="42" inputmode="numeric" />
    <label for="version_name">versionName</label>
    <input id="version_name" autocomplete="off" placeholder="1.0.0" />
  </fieldset>

  <fieldset>
    <legend>Build</legend>
    <label for="artifact_type">Artifact</label>
    <select id="artifact_type">
      <option value="apk">APK</option>
      <option value="aab">AAB</option>
    </select>
    <label for="signing_mode">Signing (GitHub secrets)</label>
    <select id="signing_mode">
      <option value="default">default — ANDROID_*</option>
      <option value="custom">custom — CUSTOM_ANDROID_*</option>
    </select>
    <p class="note"><strong>Play / package name:</strong> this tool cannot verify that your <code>applicationId</code> is unique on Google Play. Check in Play Console before shipping.</p>
  </fieldset>

  <button class="primary" id="go" type="button" disabled>Start build</button>
  <div id="out"></div>

  <script>
    let idToken = null;
    const out = document.getElementById("out");
    const go = document.getElementById("go");
    const who = document.getElementById("who");

    function setError(msg) {
      out.innerHTML = msg ? '<p class="err">' + msg.replace(/</g, "&lt;") + "</p>" : "";
    }
    function setOk(msg) {
      out.innerHTML = msg ? '<p class="ok">' + msg.replace(/</g, "&lt;") + "</p>" : "";
    }

    function parseJwtSub(jwt) {
      try {
        const parts = jwt.split(".");
        if (parts.length < 2) return "";
        const json = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        return json.email || json.sub || "";
      } catch (e) { return ""; }
    }

    window.addEventListener("load", function () {
      const GOOGLE_CLIENT_ID = ${cidJs};
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: function (res) {
          idToken = res.credential;
          go.disabled = false;
          const label = parseJwtSub(idToken);
          who.textContent = label ? ("Signed in as " + label) : "Signed in";
          who.hidden = false;
          setError("");
        },
      });
      google.accounts.id.renderButton(document.getElementById("gsi"), {
        theme: "outline",
        size: "large",
        text: "signin_with",
      });
    });

    go.addEventListener("click", async function () {
      setError("");
      setOk("");
      if (!idToken) {
        setError("Sign in with Google first.");
        return;
      }
      const body = {
        id_token: idToken,
        application_id: document.getElementById("application_id").value.trim(),
        display_name: document.getElementById("display_name").value.trim(),
        version_code: document.getElementById("version_code").value.trim(),
        version_name: document.getElementById("version_name").value.trim(),
        artifact_type: document.getElementById("artifact_type").value,
        signing_mode: document.getElementById("signing_mode").value,
      };
      go.disabled = true;
      try {
        const r = await fetch("/api/dispatch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await r.json().catch(function () { return {}; });
        if (!r.ok) {
          setError(j.error || ("HTTP " + r.status));
        } else {
          setOk(j.message || "Build queued. Open GitHub → Actions for status and artifacts.");
        }
      } catch (e) {
        setError(String(e && e.message ? e.message : e));
      } finally {
        go.disabled = !idToken;
      }
    });
  </script>
</body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return new Response("ok", {
        status: 200,
        headers: { "cache-control": "no-store" },
      });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(htmlPage(env.GOOGLE_CLIENT_ID), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    if (
      request.method === "OPTIONS" &&
      url.pathname === "/api/dispatch"
    ) {
      const origin = request.headers.get("Origin");
      if (origin && !isAllowedBrowserOrigin(request, env, origin)) {
        return new Response(null, { status: 403 });
      }
      const headers = new Headers({ "cache-control": "no-store" });
      for (const [k, v] of Object.entries(corsHeaders(request, env))) {
        headers.set(k, v);
      }
      return new Response(null, { status: 204, headers });
    }

    if (request.method === "POST" && url.pathname === "/api/dispatch") {
      const origin = request.headers.get("Origin");
      if (origin && !isAllowedBrowserOrigin(request, env, origin)) {
        return jsonResponse(
          request,
          env,
          { error: "Origin not allowed (configure ALLOWED_ORIGINS in wrangler.toml)" },
          403,
        );
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return jsonResponse(request, env, { error: "Invalid JSON" }, 400);
      }

      const b = body as Record<string, unknown>;
      const idToken = typeof b.id_token === "string" ? b.id_token : "";
      if (!idToken) {
        return jsonResponse(request, env, { error: "Missing id_token" }, 401);
      }

      try {
        await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID);
      } catch {
        return jsonResponse(
          request,
          env,
          { error: "Invalid or expired Google sign-in" },
          401,
        );
      }

      const validated = validateBody(body);
      if (!validated.ok) {
        return jsonResponse(request, env, { error: validated.error }, 400);
      }

      if (!env.GITHUB_TOKEN?.trim()) {
        return jsonResponse(
          request,
          env,
          { error: "Server misconfiguration: GITHUB_TOKEN missing" },
          500,
        );
      }

      const gh = await dispatchGithubWorkflow(env, validated.inputs);
      if (!gh.ok) {
        return jsonResponse(
          request,
          env,
          {
            error: `GitHub API ${gh.status}: ${gh.message}`,
          },
          502,
        );
      }

      return jsonResponse(request, env, {
        ok: true,
        message:
          "Workflow dispatch accepted (204). Check GitHub Actions for the run and download artifacts when finished.",
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
