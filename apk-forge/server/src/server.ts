import { config as loadDotEnv } from "dotenv";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { handleApkForgeRequest } from "../../shared/handler.js";
import {
  validateAppProperties,
  validateBody,
} from "../../shared/validation.js";
import {
  readAppGradleProperties,
  writeAppGradleProperties,
} from "./gradleConfig.js";
import { getQueueSnapshot, runSerializedBuild } from "./buildQueue.js";
import { isSafeArtifactFilename, runLocalBuild } from "./localBuild.js";
import {
  applySigningToProcessEnv,
  readSigningEnvFile,
  type SigningEnvKey,
  validateSigningConfigBody,
  writeSigningEnvKeys,
} from "./signingEnv.js";
import {
  isSigningEditorConfigured,
  issueSigningSaveToken,
  parseBearerToken,
  verifySigningEditorLogin,
  verifySigningSaveToken,
} from "./signingAuth.js";

const envPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".env",
);
loadDotEnv({ path: envPath, quiet: true });

const bootSigningCfg = await readSigningEnvFile(envPath);
applySigningToProcessEnv(bootSigningCfg);

function resolveAndroidProjectRoot(): string {
  const fromEnv = process.env.ANDROID_PROJECT_ROOT?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  const inferred = path.resolve(process.cwd(), "..", "..");
  const gradleName =
    process.platform === "win32" ? "gradlew.bat" : "gradlew";
  if (existsSync(path.join(inferred, gradleName))) {
    console.warn(
      `ANDROID_PROJECT_ROOT not set; using inferred repo root: ${inferred}`,
    );
    return inferred;
  }

  throw new Error(
    `Set ANDROID_PROJECT_ROOT in apk-forge/server/.env to the directory that contains ${gradleName} (copy env.example to .env).`,
  );
}

function loadEnv(): { ANDROID_PROJECT_ROOT: string } {
  return {
    ANDROID_PROJECT_ROOT: resolveAndroidProjectRoot(),
  };
}

/** Comma-separated list from APK_FORGE_CORS_ORIGINS (for static UI on another origin). */
function parseCorsOrigins(): string[] {
  const raw = process.env.APK_FORGE_CORS_ORIGINS?.trim();
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

const env = loadEnv();
const artifactsDir = path.join(process.cwd(), ".artifacts");

const app = new Hono();

const apkForgeCorsOrigins = parseCorsOrigins();
if (apkForgeCorsOrigins.length > 0) {
  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) return undefined;
        return apkForgeCorsOrigins.includes(origin) ? origin : undefined;
      },
      allowMethods: ["GET", "HEAD", "POST", "PUT", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type"],
      maxAge: 86400,
    }),
  );
}

app.use("*", async (c, next) => {
  const t = Date.now();
  await next();
  const ms = Date.now() - t;
  const status = c.res.status;
  console.log(`${c.req.method} ${c.req.path} ${status} ${ms}ms`);
});

app.get("/api/config", async () => {
  const cfg = await readAppGradleProperties(env.ANDROID_PROJECT_ROOT);
  return json(cfg);
});

app.get("/api/signing-config", async () => {
  const cfg = await readSigningEnvFile(envPath);
  applySigningToProcessEnv(cfg);
  return json(cfg);
});

app.get("/api/signing-auth/status", (c) => {
  if (!isSigningEditorConfigured()) {
    return json(
      {
        ok: true,
        signing_save_enabled: false,
        signed_in: false,
        note: "Signing editor not configured (set SIGNING_EDITOR_EMAIL and SIGNING_EDITOR_PASSWORD in server .env).",
      },
      200,
    );
  }
  const token = parseBearerToken(c.req.header("authorization"));
  const email = verifySigningSaveToken(token);
  return json({
    ok: true,
    signing_save_enabled: true,
    signed_in: Boolean(email),
    email: email || undefined,
  });
});

app.post("/api/signing-auth", async (c) => {
  if (!isSigningEditorConfigured()) {
    return json(
      {
        error:
          "Signing save is not configured. Set SIGNING_EDITOR_EMAIL and SIGNING_EDITOR_PASSWORD in apk-forge/server/.env.",
      },
      503,
    );
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (typeof body !== "object" || body === null) {
    return json({ error: "Expected JSON object" }, 400);
  }
  const o = body as Record<string, unknown>;
  const email = typeof o.email === "string" ? o.email.trim() : "";
  const password = typeof o.password === "string" ? o.password : "";
  if (!email || !password) {
    return json({ error: "email and password are required" }, 400);
  }
  if (!verifySigningEditorLogin(email, password)) {
    return json({ error: "Invalid email or password" }, 401);
  }
  const token = issueSigningSaveToken(email);
  return json({
    ok: true,
    token,
    expires_in_hours: 8,
    message:
      "Signed in. Locked saves (gradle.properties and signing .env) are enabled for this browser session.",
  });
});

app.put("/api/signing-config", async (c) => {
  if (!isSigningEditorConfigured()) {
    return json(
      {
        error:
          "Signing save is disabled (configure SIGNING_EDITOR_EMAIL and SIGNING_EDITOR_PASSWORD in server .env).",
      },
      503,
    );
  }
  const token = parseBearerToken(c.req.header("authorization"));
  const authedEmail = verifySigningSaveToken(token);
  if (!authedEmail) {
    return json(
      {
        error:
          "Unauthorized. Use Save again and sign in through the dialog (editor email and password).",
      },
      401,
    );
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const validated = validateSigningConfigBody(body);
  if (!validated.ok) {
    return json({ error: validated.error }, 400);
  }
  const normalized: Partial<Record<SigningEnvKey, string>> = {};
  for (const [k, val] of Object.entries(validated.updates)) {
    const key = k as SigningEnvKey;
    normalized[key] = key.includes("BASE64")
      ? val.replace(/\s+/g, "")
      : val;
  }
  try {
    await writeSigningEnvKeys(envPath, normalized);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: `Could not write .env: ${msg}` }, 500);
  }
  const merged = await readSigningEnvFile(envPath);
  applySigningToProcessEnv(merged);
  return json({
    ok: true,
    message:
      "Signing saved to apk-forge/server/.env and applied to this server process (no restart needed).",
  });
});

app.put("/api/config", async (c) => {
  if (isSigningEditorConfigured()) {
    const token = parseBearerToken(c.req.header("authorization"));
    if (!verifySigningSaveToken(token)) {
      return json(
        {
          error:
            "Unauthorized. Sign in from the Save dialog (same editor account as signing .env).",
        },
        401,
      );
    }
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const validated = validateAppProperties(body);
  if (!validated.ok) {
    return json({ error: validated.error }, 400);
  }
  try {
    await writeAppGradleProperties(env.ANDROID_PROJECT_ROOT, {
      application_id: validated.application_id,
      display_name: validated.display_name,
      version_code: validated.version_code,
      version_name: validated.version_name,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: `Could not write gradle.properties: ${msg}` }, 500);
  }
  return json({
    ok: true,
    message: "Saved app.* values to gradle.properties in the Android project root.",
  });
});

app.get("/api/build-queue", (c) => {
  const clientId = c.req.query("client_build_id") ?? undefined;
  return json(getQueueSnapshot(clientId));
});

app.post("/api/build", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const validated = validateBody(body);
  if (!validated.ok) {
    return json({ error: validated.error }, 400);
  }

  const { result, waitedBehind } = await runSerializedBuild(
    validated.client_build_id,
    () =>
      runLocalBuild({
        projectRoot: env.ANDROID_PROJECT_ROOT,
        artifactsDir,
        inputs: validated.inputs,
        signingEnvPath: envPath,
      }),
  );
  if (waitedBehind > 0) {
    console.log(
      `Build finished (was ${waitedBehind} deep in queue when this job was enqueued).`,
    );
  }

  if (!result.ok) {
    return json(
      {
        error: result.error,
        client_build_id: validated.client_build_id,
        queue: { waited_behind: waitedBehind, mode: "serialized" },
      },
      500,
    );
  }

  return json({
    ok: true,
    message:
      "Build finished. Download the artifact from the link below (same host).",
    download_path: result.relativeDownloadPath,
    artifact: result.artifactName,
    client_build_id: validated.client_build_id,
    queue: {
      waited_behind: waitedBehind,
      mode: "serialized",
    },
  });
});

app.get("/api/artifacts/:name", async (c) => {
  const name = c.req.param("name") ?? "";
  if (!isSafeArtifactFilename(name)) {
    return c.text("Not found", 404);
  }
  const filePath = path.join(artifactsDir, name);
  const resolved = path.resolve(filePath);
  const base = path.resolve(artifactsDir);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    return c.text("Not found", 404);
  }
  try {
    const st = await stat(resolved);
    if (!st.isFile()) {
      return c.text("Not found", 404);
    }
  } catch {
    return c.text("Not found", 404);
  }
  const nodeStream = createReadStream(resolved);
  const webStream = Readable.toWeb(nodeStream);
  const ext = name.toLowerCase().endsWith(".aab") ? ".aab" : ".apk";
  const mime =
    ext === ".aab"
      ? "application/octet-stream"
      : "application/vnd.android.package-archive";
  return new Response(webStream, {
    headers: {
      "content-type": mime,
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
});

app.all("*", (c) => handleApkForgeRequest(c.req.raw));

const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOST ?? "0.0.0.0";

serve(
  {
    fetch: app.fetch,
    port,
    hostname,
  },
  (info) => {
    console.log(
      `APK Forge server listening on http://${info.address}:${info.port}`,
    );
    console.log(`ANDROID_PROJECT_ROOT=${env.ANDROID_PROJECT_ROOT}`);
  },
);
