/** Shared request validation for APK Forge. */

export const APPLICATION_ID_RE =
  /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

/** Validates app.* fields used for builds and for saving gradle.properties. */
export function validateAppProperties(raw: unknown):
  | {
      ok: true;
      application_id: string;
      display_name: string;
      version_code: string;
      version_name: string;
    }
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

  return {
    ok: true,
    application_id,
    display_name,
    version_code,
    version_name,
  };
}

/** Optional; browser sends a new UUID per Start build for queue status polling. */
const CLIENT_BUILD_ID_RE = /^[\w-]{8,128}$/;

export function validateBody(raw: unknown):
  | {
      ok: true;
      inputs: Record<string, string>;
      client_build_id: string;
    }
  | { ok: false; error: string } {
  const app = validateAppProperties(raw);
  if (!app.ok) {
    return app;
  }
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Expected JSON object body" };
  }
  const o = raw as Record<string, unknown>;
  const artifact_type =
    typeof o.artifact_type === "string" ? o.artifact_type.trim() : "";
  const signing_mode =
    typeof o.signing_mode === "string" ? o.signing_mode.trim() : "";
  const build_variant =
    typeof o.build_variant === "string" ? o.build_variant.trim() : "";

  if (artifact_type !== "apk" && artifact_type !== "aab") {
    return { ok: false, error: "artifact_type must be apk or aab" };
  }
  if (signing_mode !== "default" && signing_mode !== "custom") {
    return { ok: false, error: "signing_mode must be default or custom" };
  }
  if (build_variant !== "release" && build_variant !== "debug") {
    return { ok: false, error: "build_variant must be release or debug" };
  }

  const client_build_id =
    typeof o.client_build_id === "string" ? o.client_build_id.trim() : "";
  if (!client_build_id || !CLIENT_BUILD_ID_RE.test(client_build_id)) {
    return {
      ok: false,
      error:
        "client_build_id is required: unique string per build, 8–128 chars (e.g. crypto.randomUUID())",
    };
  }

  return {
    ok: true,
    inputs: {
      application_id: app.application_id,
      display_name: app.display_name,
      version_code: app.version_code,
      version_name: app.version_name,
      artifact_type,
      signing_mode,
      build_variant,
    },
    client_build_id,
  };
}

