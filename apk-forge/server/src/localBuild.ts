import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applySigningToProcessEnv,
  readSigningEnvFile,
} from "./signingEnv.js";

function stripBase64Whitespace(b64: string): string {
  return b64.replace(/\s/g, "");
}

/**
 * Absolute paths are used as-is.
 * Paths starting with `.android/` (or exactly `.android/...`) resolve under the
 * user home directory (same as Android Studio / Gradle for the debug keystore),
 * not under ANDROID_PROJECT_ROOT.
 * Any other relative path resolves against ANDROID_PROJECT_ROOT (e.g. `app/release.jks`).
 */
function resolveReleaseKeystorePath(
  raw: string,
  projectRoot: string,
): string {
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

async function prepareSigning(
  signing_mode: string,
  projectRoot: string,
): Promise<{ childEnv: NodeJS.ProcessEnv; cleanup: () => Promise<void> }> {
  const created: string[] = [];
  const childEnv: NodeJS.ProcessEnv = { ...process.env };

  const pushTempKeystore = async (
    b64: string,
    store: string,
    alias: string,
    keyPw: string,
  ): Promise<void> => {
    const tmp = path.join(
      os.tmpdir(),
      `apk-forge-${crypto.randomBytes(8).toString("hex")}.jks`,
    );
    await fs.writeFile(tmp, Buffer.from(stripBase64Whitespace(b64), "base64"));
    created.push(tmp);
    childEnv.RELEASE_KEYSTORE_FILE = tmp;
    childEnv.RELEASE_STORE_PASSWORD = store;
    childEnv.RELEASE_KEY_ALIAS = alias;
    childEnv.RELEASE_KEY_PASSWORD = keyPw;
  };

  if (signing_mode === "custom") {
    const b64 = process.env.CUSTOM_ANDROID_KEYSTORE_BASE64?.trim();
    const store = process.env.CUSTOM_ANDROID_KEYSTORE_PASSWORD?.trim();
    const alias = process.env.CUSTOM_ANDROID_KEY_ALIAS?.trim();
    const keyPw = process.env.CUSTOM_ANDROID_KEY_PASSWORD?.trim();
    if (!b64) {
      throw new Error(
        "signing_mode=custom requires CUSTOM_ANDROID_KEYSTORE_BASE64 and related CUSTOM_ANDROID_* password/alias env vars",
      );
    }
    if (!store || !alias || !keyPw) {
      throw new Error(
        "Missing CUSTOM_ANDROID_KEYSTORE_PASSWORD, CUSTOM_ANDROID_KEY_ALIAS, or CUSTOM_ANDROID_KEY_PASSWORD",
      );
    }
    await pushTempKeystore(b64, store, alias, keyPw);
    return {
      childEnv,
      cleanup: async () => {
        for (const p of created) {
          await fs.unlink(p).catch(() => {});
        }
      },
    };
  }

  const defaultB64 = process.env.ANDROID_KEYSTORE_BASE64?.trim();
  if (defaultB64) {
    const store = process.env.ANDROID_KEYSTORE_PASSWORD?.trim();
    const alias = process.env.ANDROID_KEY_ALIAS?.trim();
    const keyPw = process.env.ANDROID_KEY_PASSWORD?.trim();
    if (!store || !alias || !keyPw) {
      throw new Error(
        "Missing ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, or ANDROID_KEY_PASSWORD",
      );
    }
    await pushTempKeystore(defaultB64, store, alias, keyPw);
    return {
      childEnv,
      cleanup: async () => {
        for (const p of created) {
          await fs.unlink(p).catch(() => {});
        }
      },
    };
  }

  const kf = process.env.RELEASE_KEYSTORE_FILE?.trim();
  const sp = process.env.RELEASE_STORE_PASSWORD?.trim();
  const al = process.env.RELEASE_KEY_ALIAS?.trim();
  const kp = process.env.RELEASE_KEY_PASSWORD?.trim();
  if (kf && sp && al && kp) {
    const resolvedKf = resolveReleaseKeystorePath(kf, projectRoot);
    try {
      await fs.access(resolvedKf);
    } catch {
      throw new Error(
        `RELEASE_KEYSTORE_FILE not found: ${resolvedKf}` +
          (resolvedKf !== kf ? ` (from .env: ${kf})` : ""),
      );
    }
    childEnv.RELEASE_KEYSTORE_FILE = resolvedKf;
    return { childEnv, cleanup: async () => {} };
  }

  throw new Error(
    "Signing not configured: set ANDROID_KEYSTORE_BASE64 + ANDROID_KEYSTORE_PASSWORD + ANDROID_KEY_ALIAS + ANDROID_KEY_PASSWORD, or RELEASE_KEYSTORE_FILE + RELEASE_STORE_PASSWORD + RELEASE_KEY_ALIAS + RELEASE_KEY_PASSWORD, or (custom) CUSTOM_ANDROID_* base64 group",
  );
}

/**
 * Quote a token for `cmd.exe /c …` only when needed.
 * Always quoting (e.g. `":app:assembleRelease"`) can leave a leading `"` in the
 * task name Gradle sees (`project '"' not found`).
 */
function quoteForCmdExe(arg: string): string {
  if (!/[\s"&<>|^%()+;,!'`]/.test(arg)) {
    return arg;
  }
  return `"${arg.replace(/"/g, '""')}"`;
}

function runGradle(
  projectRoot: string,
  childEnv: NodeJS.ProcessEnv,
  inputs: Record<string, string>,
): Promise<void> {
  const rel = inputs.build_variant === "debug" ? "Debug" : "Release";
  const task =
    inputs.artifact_type === "aab"
      ? `:app:bundle${rel}`
      : `:app:assemble${rel}`;
  const props = [
    `-Papp.applicationId=${inputs.application_id}`,
    `-Papp.displayName=${inputs.display_name}`,
    `-Papp.versionCode=${inputs.version_code}`,
    `-Papp.versionName=${inputs.version_name}`,
  ];
  const isWin = process.platform === "win32";
  const gradleArgs = [task, "--no-daemon", "--console=plain", ...props];

  const { file, argv, options } = isWin
    ? (() => {
        const line = [
          "call",
          "gradlew.bat",
          ...gradleArgs.map(quoteForCmdExe),
        ].join(" ");
        return {
          file: process.env.ComSpec || "cmd.exe",
          argv: ["/d", "/s", "/c", line],
          options: {
            cwd: projectRoot,
            env: childEnv,
            shell: false as const,
            windowsHide: true as const,
          },
        };
      })()
    : {
        file: path.join(projectRoot, "gradlew"),
        argv: gradleArgs,
        options: {
          cwd: projectRoot,
          env: childEnv,
          shell: false as const,
          windowsHide: true as const,
        },
      };

  return new Promise((resolve, reject) => {
    const child = spawn(file, argv, options);
    let log = "";
    const append = (chunk: Buffer) => {
      log += chunk.toString();
      if (log.length > 250_000) {
        log = log.slice(-120_000);
      }
    };
    child.stdout?.on("data", append);
    child.stderr?.on("data", append);
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Gradle exited with code ${code}\n\n${log.slice(-14_000)}`,
          ),
        );
      }
    });
  });
}

async function newestMatchingFile(
  dir: string,
  ext: string,
): Promise<string | null> {
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return null;
  }
  const matches = names.filter((n) => n.toLowerCase().endsWith(ext));
  if (matches.length === 0) {
    return null;
  }
  let best: { name: string; m: number } | null = null;
  for (const name of matches) {
    const full = path.join(dir, name);
    const st = await fs.stat(full);
    if (!st.isFile()) {
      continue;
    }
    if (!best || st.mtimeMs > best.m) {
      best = { name, m: st.mtimeMs };
    }
  }
  return best ? path.join(dir, best.name) : null;
}

async function pickBuiltArtifact(
  projectRoot: string,
  artifact_type: string,
  build_variant: string,
): Promise<string | null> {
  const kind = build_variant === "debug" ? "debug" : "release";
  if (artifact_type === "aab") {
    return newestMatchingFile(
      path.join(
        projectRoot,
        "app",
        "build",
        "outputs",
        "bundle",
        kind,
      ),
      ".aab",
    );
  }
  return newestMatchingFile(
    path.join(projectRoot, "app", "build", "outputs", "apk", kind),
    ".apk",
  );
}

/** Gradle output names may include spaces in versionName; reject path tricks only. */
export function isSafeArtifactFilename(name: string): boolean {
  if (!name || name.includes("..") || /[/\\]/.test(name)) {
    return false;
  }
  return /\.(apk|aab)$/i.test(name) && name.length <= 240;
}

export async function runLocalBuild(options: {
  projectRoot: string;
  artifactsDir: string;
  inputs: Record<string, string>;
  /** When set, signing keys are re-read from this .env before each release build (keeps process.env in sync with disk). */
  signingEnvPath?: string;
}): Promise<
  | { ok: true; artifactName: string; relativeDownloadPath: string }
  | { ok: false; error: string }
> {
  const { projectRoot, artifactsDir, inputs, signingEnvPath } = options;
  const root = path.resolve(projectRoot);
  const gradlewName = process.platform === "win32" ? "gradlew.bat" : "gradlew";
  try {
    await fs.access(path.join(root, gradlewName));
  } catch {
    return {
      ok: false,
      error: `ANDROID_PROJECT_ROOT has no ${gradlewName}: ${root}`,
    };
  }

  let cleanup: (() => Promise<void>) | undefined;
  try {
    if (signingEnvPath) {
      const cfg = await readSigningEnvFile(signingEnvPath);
      applySigningToProcessEnv(cfg);
    }
    const isRelease = inputs.build_variant === "release";
    const signing = isRelease
      ? await prepareSigning(inputs.signing_mode, root)
      : { childEnv: { ...process.env }, cleanup: async () => {} };
    cleanup = signing.cleanup;
    await fs.mkdir(options.artifactsDir, { recursive: true });
    await runGradle(root, signing.childEnv, inputs);
    const built = await pickBuiltArtifact(
      root,
      inputs.artifact_type,
      inputs.build_variant,
    );
    if (!built) {
      return {
        ok: false,
        error: `Gradle finished but no ${inputs.build_variant} APK/AAB was found under app/build/outputs`,
      };
    }
    const artifactName = path.basename(built);
    const dest = path.join(options.artifactsDir, artifactName);
    await fs.copyFile(built, dest);
    return {
      ok: true,
      artifactName,
      relativeDownloadPath: `/api/artifacts/${artifactName}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  } finally {
    if (cleanup) {
      await cleanup();
    }
  }
}
