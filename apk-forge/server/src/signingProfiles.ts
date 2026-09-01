import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  readSigningEnvFile,
  type SigningConfigRecord,
  type SigningEnvKey,
  SIGNING_ENV_KEYS,
} from "./signingEnv.js";

export const SIGNING_PROFILE_MODES = [
  "release_file",
  "android_base64",
  "custom_base64",
] as const;

export type SigningProfileMode = (typeof SIGNING_PROFILE_MODES)[number];

export type SigningProfile = {
  id: string;
  label: string;
  mode: SigningProfileMode;
} & Partial<Record<SigningEnvKey, string>>;

export type SigningProfilesFile = {
  default_profile_id: string;
  profiles: SigningProfile[];
};

/** Fixed signature slots shown in the UI dropdown (Signature 1 … Signature 5). */
export const BUILTIN_SIGNATURE_COUNT = 5;

const PROFILE_ID_RE = /^[a-z0-9_-]{1,32}$/;

export function builtinSignatureId(n: number): string {
  return `signature_${n}`;
}

export function isBuiltinSignatureId(id: string): boolean {
  const m = /^signature_([1-9]\d*)$/.exec(id.trim());
  if (!m) {
    return false;
  }
  const n = Number(m[1]);
  return n >= 1 && n <= BUILTIN_SIGNATURE_COUNT;
}

function emptyCredentialRecord(): Partial<Record<SigningEnvKey, string>> {
  const out: Partial<Record<SigningEnvKey, string>> = {};
  for (const k of SIGNING_ENV_KEYS) {
    out[k] = "";
  }
  return out;
}

function profileCredentials(
  profile: SigningProfile,
): Partial<Record<SigningEnvKey, string>> {
  const out = emptyCredentialRecord();
  for (const k of SIGNING_ENV_KEYS) {
    const v = profile[k];
    if (typeof v === "string") {
      out[k] = v;
    }
  }
  return out;
}

export function inferModeFromSigningConfig(
  cfg: SigningConfigRecord,
): SigningProfileMode {
  if (cfg.CUSTOM_ANDROID_KEYSTORE_BASE64?.trim()) {
    return "custom_base64";
  }
  if (cfg.ANDROID_KEYSTORE_BASE64?.trim()) {
    return "android_base64";
  }
  return "release_file";
}

export function profileFromSigningConfig(
  cfg: SigningConfigRecord,
  id: string,
  label: string,
): SigningProfile {
  return {
    id,
    label,
    mode: inferModeFromSigningConfig(cfg),
    ...cfg,
  };
}

/** Committed QA keystores under app/signing/ (one distinct key per slot). */
const BUILTIN_QA_KEYSTORES: Array<{
  file: string;
  alias: string;
  password: string;
}> = [
  {
    file: "app/signing/template-release.jks",
    alias: "template",
    password: "template",
  },
  {
    file: "app/signing/signature-2.jks",
    alias: "signature2",
    password: "signature2",
  },
  {
    file: "app/signing/signature-3.jks",
    alias: "signature3",
    password: "signature3",
  },
  {
    file: "app/signing/signature-4.jks",
    alias: "signature4",
    password: "signature4",
  },
  {
    file: "app/signing/signature-5.jks",
    alias: "signature5",
    password: "signature5",
  },
];

function qaReleaseProfile(n: number): SigningProfile {
  const slot = BUILTIN_QA_KEYSTORES[n - 1];
  if (!slot) {
    return emptyReleaseProfile(n);
  }
  return {
    id: builtinSignatureId(n),
    label: `Signature ${n}`,
    mode: "release_file",
    RELEASE_KEYSTORE_FILE: slot.file,
    RELEASE_STORE_PASSWORD: slot.password,
    RELEASE_KEY_ALIAS: slot.alias,
    RELEASE_KEY_PASSWORD: slot.password,
  };
}

function emptyReleaseProfile(n: number): SigningProfile {
  return {
    id: builtinSignatureId(n),
    label: `Signature ${n}`,
    mode: "release_file",
    RELEASE_KEYSTORE_FILE: "",
    RELEASE_STORE_PASSWORD: "",
    RELEASE_KEY_ALIAS: "",
    RELEASE_KEY_PASSWORD: "",
  };
}

function createBuiltinProfiles(firstCfg: SigningConfigRecord): SigningProfile[] {
  const profiles: SigningProfile[] = [];
  for (let n = 1; n <= BUILTIN_SIGNATURE_COUNT; n++) {
    if (n === 1) {
      const fromEnv = profileFromSigningConfig(
        firstCfg,
        builtinSignatureId(1),
        "Signature 1",
      );
      profiles.push(
        isSigningProfileConfigured(fromEnv) ? fromEnv : qaReleaseProfile(1),
      );
    } else {
      profiles.push(qaReleaseProfile(n));
    }
  }
  return profiles;
}

async function mergeBuiltinProfiles(
  store: SigningProfilesFile,
  cfg: SigningConfigRecord,
  profilesPath: string,
): Promise<SigningProfilesFile> {
  let changed = false;
  const byId = new Map<string, SigningProfile>();

  for (const raw of store.profiles) {
    let id = raw.id;
    if (id === "default_env") {
      id = builtinSignatureId(1);
      changed = true;
    }
    if (!isBuiltinSignatureId(id)) {
      changed = true;
      continue;
    }
    const n = signatureNumberFromId(id);
    const next: SigningProfile = {
      ...raw,
      id,
      label: `Signature ${n}`,
    };
    const existing = byId.get(id);
    if (!existing || profileCredentialScore(next) > profileCredentialScore(existing)) {
      byId.set(id, next);
      if (existing) {
        changed = true;
      }
    }
  }

  for (let n = 1; n <= BUILTIN_SIGNATURE_COUNT; n++) {
    const id = builtinSignatureId(n);
    if (!byId.has(id)) {
      byId.set(
        id,
        n === 1
          ? (() => {
              const fromEnv = profileFromSigningConfig(cfg, id, "Signature 1");
              return isSigningProfileConfigured(fromEnv)
                ? fromEnv
                : qaReleaseProfile(1);
            })()
          : qaReleaseProfile(n),
      );
      changed = true;
    }
  }

  for (let n = 1; n <= BUILTIN_SIGNATURE_COUNT; n++) {
    const id = builtinSignatureId(n);
    const current = byId.get(id);
    if (!current || isSigningProfileConfigured(current)) {
      continue;
    }
    if (n === 1) {
      const fromEnv = profileFromSigningConfig(cfg, id, "Signature 1");
      byId.set(
        id,
        isSigningProfileConfigured(fromEnv) ? fromEnv : qaReleaseProfile(1),
      );
    } else {
      byId.set(id, qaReleaseProfile(n));
    }
    changed = true;
  }

  store.profiles = [...byId.values()].sort(compareSignatureProfiles);

  if (
    !store.default_profile_id ||
    !isBuiltinSignatureId(store.default_profile_id)
  ) {
    store.default_profile_id = builtinSignatureId(1);
    changed = true;
  }

  if (changed) {
    await writeSigningProfilesFile(profilesPath, store);
  }
  return store;
}

/** Prefer the profile with more non-empty signing fields when merging duplicates. */
function profileCredentialScore(profile: SigningProfile): number {
  let score = 0;
  for (const k of SIGNING_ENV_KEYS) {
    if (profile[k]?.trim()) {
      score += 1;
    }
  }
  return score;
}

function signatureNumberFromId(id: string): number {
  const m = /^signature_(\d+)$/.exec(id.trim());
  if (!m) {
    return -1;
  }
  const n = Number(m[1]);
  return n >= 1 && n <= BUILTIN_SIGNATURE_COUNT ? n : -1;
}

function compareSignatureProfiles(a: SigningProfile, b: SigningProfile): number {
  const na = /^signature_(\d+)$/.exec(a.id)?.[1];
  const nb = /^signature_(\d+)$/.exec(b.id)?.[1];
  if (na && nb) {
    return Number(na) - Number(nb);
  }
  return a.id.localeCompare(b.id);
}

function resolveReleaseKeystorePath(raw: string, projectRoot: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (path.isAbsolute(trimmed)) {
    return path.normalize(trimmed);
  }
  const asPosix = trimmed.replace(/\\/g, "/");
  const segments = asPosix.split("/").filter(Boolean);
  if (segments[0] === ".android") {
    return path.normalize(path.join(os.homedir(), ...segments));
  }
  return path.normalize(path.resolve(projectRoot, trimmed));
}

export async function readSigningProfilesFile(
  filePath: string,
): Promise<SigningProfilesFile | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as SigningProfilesFile;
    if (!parsed || !Array.isArray(parsed.profiles)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeSigningProfilesFile(
  filePath: string,
  data: SigningProfilesFile,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function ensureSigningProfiles(
  profilesPath: string,
  envPath: string,
  defaultsPath: string,
  projectRoot: string,
): Promise<SigningProfilesFile> {
  const cfg = await readSigningEnvFile(envPath, defaultsPath);
  const existing = await readSigningProfilesFile(profilesPath);
  if (existing && existing.profiles.length > 0) {
    return mergeBuiltinProfiles(existing, cfg, profilesPath);
  }

  const profiles = createBuiltinProfiles(cfg);
  const data: SigningProfilesFile = {
    default_profile_id: builtinSignatureId(1),
    profiles,
  };
  await writeSigningProfilesFile(profilesPath, data);
  const first = profiles[0];
  if (first.mode === "release_file") {
    const kf = first.RELEASE_KEYSTORE_FILE?.trim();
    if (kf) {
      const resolved = resolveReleaseKeystorePath(kf, projectRoot);
      try {
        await fs.access(resolved);
      } catch {
        /* bootstrap profile may reference missing path; user can fix in UI */
      }
    }
  }
  return data;
}

export async function listSigningProfiles(
  profilesPath: string,
  envPath: string,
  defaultsPath: string,
  projectRoot: string,
): Promise<SigningProfilesFile> {
  const store = await ensureSigningProfiles(
    profilesPath,
    envPath,
    defaultsPath,
    projectRoot,
  );
  store.profiles.sort(compareSignatureProfiles);
  return store;
}

export function getSigningProfileById(
  store: SigningProfilesFile,
  id: string,
): SigningProfile | undefined {
  return store.profiles.find((p) => p.id === id);
}

export function isSigningProfileConfigured(profile: SigningProfile): boolean {
  const creds = profileCredentials(profile);
  if (profile.mode === "custom_base64") {
    return !!(
      creds.CUSTOM_ANDROID_KEYSTORE_BASE64?.trim() &&
      creds.CUSTOM_ANDROID_KEYSTORE_PASSWORD?.trim() &&
      creds.CUSTOM_ANDROID_KEY_ALIAS?.trim() &&
      creds.CUSTOM_ANDROID_KEY_PASSWORD?.trim()
    );
  }
  if (profile.mode === "android_base64") {
    return !!(
      creds.ANDROID_KEYSTORE_BASE64?.trim() &&
      creds.ANDROID_KEYSTORE_PASSWORD?.trim() &&
      creds.ANDROID_KEY_ALIAS?.trim() &&
      creds.ANDROID_KEY_PASSWORD?.trim()
    );
  }
  return !!(
    creds.RELEASE_KEYSTORE_FILE?.trim() &&
    creds.RELEASE_STORE_PASSWORD?.trim() &&
    creds.RELEASE_KEY_ALIAS?.trim() &&
    creds.RELEASE_KEY_PASSWORD?.trim()
  );
}

export async function assertSigningProfileReadyForBuild(
  profile: SigningProfile,
  projectRoot: string,
): Promise<void> {
  if (!isSigningProfileConfigured(profile)) {
    throw new Error(
      `${profile.label} is not configured. In the Signing sidebar, select ${profile.label}, enter keystore credentials, and click Save profile.`,
    );
  }
  if (profile.mode === "release_file") {
    const kf = profile.RELEASE_KEYSTORE_FILE?.trim() ?? "";
    const resolved = resolveReleaseKeystorePath(kf, projectRoot);
    try {
      await fs.access(resolved);
    } catch {
      throw new Error(
        `${profile.label}: RELEASE_KEYSTORE_FILE not found: ${resolved}`,
      );
    }
  }
}

export function summarizeProfiles(store: SigningProfilesFile): {
  default_profile_id: string;
  profiles: Array<{
    id: string;
    label: string;
    mode: SigningProfileMode;
    configured: boolean;
  }>;
} {
  return {
    default_profile_id: store.default_profile_id,
    profiles: store.profiles.map((p) => ({
      id: p.id,
      label: p.label,
      mode: p.mode,
      configured: isSigningProfileConfigured(p),
    })),
  };
}

function normalizeBase64Field(value: string): string {
  return value.replace(/\s+/g, "");
}

export async function validateSigningProfileBody(
  raw: unknown,
  projectRoot: string,
  options?: { requireId?: boolean; existingId?: string },
):
  Promise<
    | { ok: true; profile: SigningProfile; setDefault?: boolean }
    | { ok: false; error: string }
  > {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Expected JSON object body" };
  }
  const o = raw as Record<string, unknown>;
  const idRaw =
    typeof o.id === "string" ? o.id.trim() : options?.existingId ?? "";
  const label = typeof o.label === "string" ? o.label.trim() : "";
  const modeRaw = typeof o.mode === "string" ? o.mode.trim() : "";

  if (options?.requireId !== false && !idRaw) {
    return { ok: false, error: "id is required" };
  }
  if (idRaw && !PROFILE_ID_RE.test(idRaw)) {
    return {
      ok: false,
      error: "id must be 1–32 chars: lowercase letters, digits, _ or -",
    };
  }
  if (idRaw && !isBuiltinSignatureId(idRaw)) {
    return {
      ok: false,
      error: `id must be signature_1 through signature_${BUILTIN_SIGNATURE_COUNT}`,
    };
  }
  if (!label || label.length > 80) {
    return { ok: false, error: "label must be 1–80 characters" };
  }
  if (!SIGNING_PROFILE_MODES.includes(modeRaw as SigningProfileMode)) {
    return {
      ok: false,
      error: "mode must be release_file, android_base64, or custom_base64",
    };
  }
  const mode = modeRaw as SigningProfileMode;

  const creds = emptyCredentialRecord();
  for (const k of SIGNING_ENV_KEYS) {
    const v = o[k];
    if (v === undefined) {
      continue;
    }
    if (typeof v !== "string") {
      return { ok: false, error: `Field ${k} must be a string` };
    }
    creds[k] = k.includes("BASE64") ? normalizeBase64Field(v) : v;
  }

  if (mode === "release_file") {
    const kf = creds.RELEASE_KEYSTORE_FILE?.trim() ?? "";
    const sp = creds.RELEASE_STORE_PASSWORD?.trim() ?? "";
    const al = creds.RELEASE_KEY_ALIAS?.trim() ?? "";
    const kp = creds.RELEASE_KEY_PASSWORD?.trim() ?? "";
    if (!kf || !sp || !al || !kp) {
      return {
        ok: false,
        error:
          "release_file requires RELEASE_KEYSTORE_FILE, RELEASE_STORE_PASSWORD, RELEASE_KEY_ALIAS, RELEASE_KEY_PASSWORD",
      };
    }
    const resolved = resolveReleaseKeystorePath(kf, projectRoot);
    try {
      await fs.access(resolved);
    } catch {
      return {
        ok: false,
        error: `RELEASE_KEYSTORE_FILE not found: ${resolved}`,
      };
    }
  }

  if (mode === "android_base64") {
    const b64 = creds.ANDROID_KEYSTORE_BASE64?.trim() ?? "";
    const sp = creds.ANDROID_KEYSTORE_PASSWORD?.trim() ?? "";
    const al = creds.ANDROID_KEY_ALIAS?.trim() ?? "";
    const kp = creds.ANDROID_KEY_PASSWORD?.trim() ?? "";
    if (!b64 || !sp || !al || !kp) {
      return {
        ok: false,
        error:
          "android_base64 requires ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD",
      };
    }
  }

  if (mode === "custom_base64") {
    const b64 = creds.CUSTOM_ANDROID_KEYSTORE_BASE64?.trim() ?? "";
    const sp = creds.CUSTOM_ANDROID_KEYSTORE_PASSWORD?.trim() ?? "";
    const al = creds.CUSTOM_ANDROID_KEY_ALIAS?.trim() ?? "";
    const kp = creds.CUSTOM_ANDROID_KEY_PASSWORD?.trim() ?? "";
    if (!b64 || !sp || !al || !kp) {
      return {
        ok: false,
        error:
          "custom_base64 requires CUSTOM_ANDROID_KEYSTORE_BASE64 and related CUSTOM_ANDROID_* fields",
      };
    }
  }

  return {
    ok: true,
    profile: { id: idRaw, label, mode, ...creds },
    setDefault: o.set_default === true,
  };
}

export async function upsertSigningProfile(
  profilesPath: string,
  envPath: string,
  defaultsPath: string,
  projectRoot: string,
  profile: SigningProfile,
  setDefault?: boolean,
): Promise<SigningProfilesFile> {
  const store = await ensureSigningProfiles(
    profilesPath,
    envPath,
    defaultsPath,
    projectRoot,
  );
  const idx = store.profiles.findIndex((p) => p.id === profile.id);
  const nextProfile: SigningProfile = {
    ...profile,
    ...profileCredentials(profile),
  };
  if (idx >= 0) {
    store.profiles[idx] = nextProfile;
  } else if (isBuiltinSignatureId(profile.id)) {
    store.profiles.push(nextProfile);
    store.profiles.sort(compareSignatureProfiles);
  }
  if (setDefault || !store.default_profile_id) {
    store.default_profile_id = profile.id;
  }
  await writeSigningProfilesFile(profilesPath, store);
  return store;
}

export async function deleteSigningProfile(
  profilesPath: string,
  envPath: string,
  defaultsPath: string,
  projectRoot: string,
  id: string,
): Promise<SigningProfilesFile | { error: string }> {
  const store = await ensureSigningProfiles(
    profilesPath,
    envPath,
    defaultsPath,
    projectRoot,
  );
  if (isBuiltinSignatureId(id)) {
    return {
      error: `${id.replace(/_/g, " ")} is built-in and cannot be deleted`,
    };
  }
  if (store.profiles.length <= 1) {
    return { error: "Cannot delete the last signing profile" };
  }
  const nextProfiles = store.profiles.filter((p) => p.id !== id);
  if (nextProfiles.length === store.profiles.length) {
    return { error: "Signing profile not found" };
  }
  store.profiles = nextProfiles;
  if (store.default_profile_id === id) {
    store.default_profile_id = nextProfiles[0].id;
  }
  await writeSigningProfilesFile(profilesPath, store);
  return store;
}

export function signingModeToProfileMode(
  signingMode: string,
  credentialSource: "release" | "android",
): SigningProfileMode {
  if (signingMode === "custom") {
    return "custom_base64";
  }
  return credentialSource === "android" ? "android_base64" : "release_file";
}

export { profileCredentials, resolveReleaseKeystorePath };
