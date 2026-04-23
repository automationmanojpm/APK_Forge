import { promises as fs } from "node:fs";

/** Keys APK Forge may read/write in `apk-forge/server/.env` for Gradle signing. */
export const SIGNING_ENV_KEYS = [
  "RELEASE_KEYSTORE_FILE",
  "RELEASE_STORE_PASSWORD",
  "RELEASE_KEY_ALIAS",
  "RELEASE_KEY_PASSWORD",
  "ANDROID_KEYSTORE_BASE64",
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD",
  "CUSTOM_ANDROID_KEYSTORE_BASE64",
  "CUSTOM_ANDROID_KEYSTORE_PASSWORD",
  "CUSTOM_ANDROID_KEY_ALIAS",
  "CUSTOM_ANDROID_KEY_PASSWORD",
] as const;

export type SigningEnvKey = (typeof SIGNING_ENV_KEYS)[number];

export type SigningConfigRecord = Record<SigningEnvKey, string>;

function parseDotEnvLine(line: string): { key: string; value: string } | null {
  const t = line.trim();
  if (!t || t.startsWith("#")) {
    return null;
  }
  const eq = t.indexOf("=");
  if (eq <= 0) {
    return null;
  }
  const key = t.slice(0, eq).trim();
  let value = t.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const q = value[0];
    value = value.slice(1, -1);
    if (q === '"') {
      value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\"/g, '"');
    }
  }
  return { key, value };
}

function upsertEnvLine(lines: string[], key: string, value: string): string[] {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^\\s*${esc}\\s*=`);
  let found = false;
  const formatted = formatDotEnvValue(value);
  const next = lines.map((line) => {
    if (re.test(line)) {
      found = true;
      return `${key}=${formatted}`;
    }
    return line;
  });
  if (!found) {
    next.push(`${key}=${formatted}`);
  }
  return next;
}

function formatDotEnvValue(value: string): string {
  if (value === "") {
    return "";
  }
  if (/[\n\r"#]/.test(value) || /^\s|\s$/.test(value) || value.includes("=")) {
    return (
      '"' +
      value
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n") +
      '"'
    );
  }
  return value;
}

export async function readSigningEnvFile(
  envFilePath: string,
): Promise<SigningConfigRecord> {
  let content = "";
  try {
    content = await fs.readFile(envFilePath, "utf8");
  } catch {
    /* missing .env */
  }
  const map = new Map<string, string>();
  for (const line of content.split(/\r?\n/)) {
    const p = parseDotEnvLine(line);
    if (p) {
      map.set(p.key, p.value);
    }
  }
  const out = {} as SigningConfigRecord;
  for (const k of SIGNING_ENV_KEYS) {
    out[k] = map.get(k) ?? "";
  }
  return out;
}

export async function writeSigningEnvKeys(
  envFilePath: string,
  updates: Partial<Record<SigningEnvKey, string>>,
): Promise<void> {
  let lines: string[];
  try {
    const content = await fs.readFile(envFilePath, "utf8");
    lines = content.split(/\r?\n/);
  } catch {
    lines = [""];
  }
  let out = lines;
  for (const k of SIGNING_ENV_KEYS) {
    if (Object.prototype.hasOwnProperty.call(updates, k)) {
      const v = updates[k];
      if (v !== undefined) {
        out = upsertEnvLine(out, k, v.replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
      }
    }
  }
  await fs.writeFile(envFilePath, out.join("\n"), "utf8");
}

/** Apply saved signing vars to this Node process (no restart needed for new builds). */
export function applySigningToProcessEnv(cfg: SigningConfigRecord): void {
  for (const k of SIGNING_ENV_KEYS) {
    process.env[k] = cfg[k];
  }
}

export function validateSigningConfigBody(raw: unknown):
  | { ok: true; updates: Partial<Record<SigningEnvKey, string>> }
  | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Expected JSON object body" };
  }
  const o = raw as Record<string, unknown>;
  const updates: Partial<Record<SigningEnvKey, string>> = {};
  const allowed = new Set<string>(SIGNING_ENV_KEYS);
  for (const [k, v] of Object.entries(o)) {
    if (!allowed.has(k)) {
      return { ok: false, error: `Unknown field: ${k}` };
    }
    if (typeof v !== "string") {
      return { ok: false, error: `Field ${k} must be a string` };
    }
    (updates as Record<string, string>)[k] = v;
  }
  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "Provide at least one signing field" };
  }
  return { ok: true, updates };
}
