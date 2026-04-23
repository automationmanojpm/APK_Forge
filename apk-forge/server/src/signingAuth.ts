import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

function signingEditorEmail(): string {
  return (process.env.SIGNING_EDITOR_EMAIL || "").trim().toLowerCase();
}

function signingEditorPassword(): string {
  return process.env.SIGNING_EDITOR_PASSWORD || "";
}

function sessionSecret(): string {
  const fromEnv = (process.env.APK_FORGE_SESSION_SECRET || "").trim();
  if (fromEnv.length >= 24) {
    return fromEnv;
  }
  const email = signingEditorEmail();
  const pw = signingEditorPassword();
  return createHmac("sha256", "apk-forge-signing-auth-fallback-v1")
    .update(`${email}\n${pw}`)
    .digest("hex");
}

export function isSigningEditorConfigured(): boolean {
  return Boolean(signingEditorEmail() && signingEditorPassword());
}

export function verifySigningEditorLogin(
  email: string,
  password: string,
): boolean {
  if (!isSigningEditorConfigured()) {
    return false;
  }
  const wantE = signingEditorEmail();
  const wantP = signingEditorPassword();
  const gotE = email.trim().toLowerCase();
  if (gotE !== wantE) {
    return false;
  }
  const a = Buffer.from(password, "utf8");
  const b = Buffer.from(wantP, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function issueSigningSaveToken(email: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const e = email.trim().toLowerCase();
  const payload = `${exp}|${e}`;
  const sig = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  const inner = JSON.stringify({ exp, e, sig });
  return Buffer.from(inner, "utf8").toString("base64url");
}

/** Returns authorized email if token is valid and not expired; otherwise null. */
export function verifySigningSaveToken(
  token: string | undefined | null,
): string | null {
  if (!token || !isSigningEditorConfigured()) {
    return null;
  }
  let parsed: { exp?: number; e?: string; sig?: string };
  try {
    parsed = JSON.parse(
      Buffer.from(token.trim(), "base64url").toString("utf8"),
    ) as { exp?: number; e?: string; sig?: string };
  } catch {
    return null;
  }
  if (
    typeof parsed.exp !== "number" ||
    typeof parsed.e !== "string" ||
    typeof parsed.sig !== "string"
  ) {
    return null;
  }
  if (Date.now() > parsed.exp) {
    return null;
  }
  const wantE = signingEditorEmail();
  if (parsed.e !== wantE) {
    return null;
  }
  const payload = `${parsed.exp}|${parsed.e}`;
  const expectSig = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(expectSig, "utf8");
  const b = Buffer.from(parsed.sig, "utf8");
  if (a.length !== b.length) {
    return null;
  }
  if (!timingSafeEqual(a, b)) {
    return null;
  }
  return parsed.e;
}

export function parseBearerToken(
  authorizationHeader: string | undefined,
): string | null {
  if (!authorizationHeader) {
    return null;
  }
  const m = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  return m ? m[1] : null;
}
