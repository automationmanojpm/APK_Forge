import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const MAX_ICON_BYTES = 2 * 1024 * 1024;
const TOKEN_RE = /^[a-f0-9]{32}$/;
const ICON_TTL_MS = 60 * 60 * 1000;

type IconEntry = {
  filePath: string;
  ext: ".png" | ".webp";
  createdAt: number;
};

type BackupEntry =
  | { kind: "moved"; originalPath: string; backupPath: string }
  | { kind: "created"; path: string };

const iconStore = new Map<string, IconEntry>();

/** Active in-place icon swaps for the current Gradle build (restored in cleanup). */
let activeIconBackups: BackupEntry[] = [];

function iconTempDir(): string {
  return path.join(os.tmpdir(), "apk-forge-icons");
}

/** Backups must live outside app/src/main/res so AAPT ignores them. */
function iconBackupRoot(projectRoot: string): string {
  return path.join(projectRoot, "app", "src", "forgeOverlay", "icon-backup");
}

export function isValidIconToken(token: string): boolean {
  return TOKEN_RE.test(token);
}

function sniffImageExt(buf: Buffer): ".png" | ".webp" | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return ".png";
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return ".webp";
  }
  return null;
}

async function pruneExpiredIcons(): Promise<void> {
  const now = Date.now();
  for (const [token, entry] of iconStore) {
    if (now - entry.createdAt > ICON_TTL_MS) {
      iconStore.delete(token);
      await fs.unlink(entry.filePath).catch(() => {});
    }
  }
}

/**
 * Store an uploaded launcher/logo image; returns a one-time icon_token for /api/build.
 */
export async function storeBuildIcon(
  bytes: Buffer,
): Promise<{ ok: true; icon_token: string } | { ok: false; error: string }> {
  await pruneExpiredIcons();
  if (!bytes.length) {
    return { ok: false, error: "Empty icon file" };
  }
  if (bytes.length > MAX_ICON_BYTES) {
    return { ok: false, error: "Icon must be 2 MB or smaller" };
  }
  const ext = sniffImageExt(bytes);
  if (!ext) {
    return { ok: false, error: "Icon must be a PNG or WebP image" };
  }
  const token = crypto.randomBytes(16).toString("hex");
  const dir = iconTempDir();
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${token}${ext}`);
  await fs.writeFile(filePath, bytes);
  iconStore.set(token, { filePath, ext, createdAt: Date.now() });
  return { ok: true, icon_token: token };
}

export async function consumeIconToken(
  token: string,
): Promise<{ filePath: string; ext: ".png" | ".webp" } | null> {
  await pruneExpiredIcons();
  const entry = iconStore.get(token);
  if (!entry) {
    return null;
  }
  iconStore.delete(token);
  try {
    await fs.access(entry.filePath);
  } catch {
    return null;
  }
  return { filePath: entry.filePath, ext: entry.ext };
}

export function forgeOverlayResDir(projectRoot: string): string {
  return path.join(projectRoot, "app", "src", "forgeOverlay", "res");
}

async function rmDirContents(dir: string): Promise<void> {
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const full = path.join(dir, name);
    await fs.rm(full, { recursive: true, force: true }).catch(() => {});
  }
}

/** Wipe leftover forgeOverlay/res (unused by Gradle). */
export async function clearForgeOverlay(projectRoot: string): Promise<void> {
  await rmDirContents(forgeOverlayResDir(projectRoot));
}

/** Remove any `.apk-forge-bak` debris under res/ (AAPT rejects those names). */
export async function scrubResBackupDebris(projectRoot: string): Promise<void> {
  const resRoot = path.join(projectRoot, "app", "src", "main", "res");
  async function walk(dir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = path.join(dir, name);
      const st = await fs.stat(full).catch(() => null);
      if (!st) continue;
      if (st.isDirectory()) {
        await walk(full);
      } else if (name.includes(".apk-forge-bak")) {
        await fs.rm(full, { force: true }).catch(() => {});
      }
    }
  }
  await walk(resRoot);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function moveAside(
  filePath: string,
  backupRoot: string,
  backups: BackupEntry[],
): Promise<void> {
  if (!(await pathExists(filePath))) {
    return;
  }
  const bak = path.join(
    backupRoot,
    `${path.basename(filePath)}.${crypto.randomBytes(4).toString("hex")}`,
  );
  await fs.mkdir(backupRoot, { recursive: true });
  await fs.rename(filePath, bak);
  backups.push({ kind: "moved", originalPath: filePath, backupPath: bak });
}

async function writeNew(
  filePath: string,
  bytes: Buffer,
  backups: BackupEntry[],
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, bytes);
  backups.push({ kind: "created", path: filePath });
}

/**
 * Replace launcher/logo assets in app/src/main/res for one build.
 * Originals are moved under forgeOverlay/icon-backup (outside res/).
 */
export async function materializeForgeOverlay(
  projectRoot: string,
  iconFile: { filePath: string; ext: ".png" | ".webp" },
): Promise<void> {
  await restoreForgeIconBackups();
  await scrubResBackupDebris(projectRoot);
  await clearForgeOverlay(projectRoot);

  const resRoot = path.join(projectRoot, "app", "src", "main", "res");
  const backupRoot = iconBackupRoot(projectRoot);
  await fs.mkdir(backupRoot, { recursive: true });
  await rmDirContents(backupRoot);

  const bytes = await fs.readFile(iconFile.filePath);
  // Prefer .png for MDM / Play consoles that extract launcher bitmaps (not adaptive XML).
  const nameExt: ".png" | ".webp" = iconFile.ext === ".webp" ? ".webp" : ".png";
  const backups: BackupEntry[] = [];

  // Drop adaptive-icon XML so density mipmaps are what devices and MDMs use.
  const anydpi = path.join(resRoot, "mipmap-anydpi-v26");
  for (const base of ["ic_launcher", "ic_launcher_round"]) {
    for (const ext of [".xml", ".png", ".webp"]) {
      await moveAside(path.join(anydpi, `${base}${ext}`), backupRoot, backups);
    }
  }

  for (const p of [
    path.join(resRoot, "drawable-v24", "ic_launcher_foreground.xml"),
    path.join(resRoot, "drawable-v24", "ic_launcher_foreground.png"),
    path.join(resRoot, "drawable-v24", "ic_launcher_foreground.webp"),
    path.join(resRoot, "drawable", "ic_launcher_foreground.png"),
    path.join(resRoot, "drawable", "ic_launcher_foreground.webp"),
    path.join(resRoot, "drawable", "ic_launcher_foreground.xml"),
  ]) {
    await moveAside(p, backupRoot, backups);
  }
  await writeNew(
    path.join(resRoot, "drawable-v24", `ic_launcher_foreground${nameExt}`),
    bytes,
    backups,
  );
  // Also expose under drawable/ for in-app logo @drawable/ic_launcher_foreground.
  await writeNew(
    path.join(resRoot, "drawable", `ic_launcher_foreground${nameExt}`),
    bytes,
    backups,
  );

  let names: string[] = [];
  try {
    names = await fs.readdir(resRoot);
  } catch {
    names = [];
  }
  for (const dirName of names) {
    if (!dirName.startsWith("mipmap-") || dirName.includes("anydpi")) {
      continue;
    }
    const dir = path.join(resRoot, dirName);
    for (const base of ["ic_launcher", "ic_launcher_round"]) {
      for (const ext of [".webp", ".png", ".xml"]) {
        await moveAside(path.join(dir, `${base}${ext}`), backupRoot, backups);
      }
      await writeNew(path.join(dir, `${base}${nameExt}`), bytes, backups);
    }
  }

  activeIconBackups = backups;
}

/** Restore main/res files moved aside for a custom-icon build. */
export async function restoreForgeIconBackups(): Promise<void> {
  const backups = activeIconBackups.slice().reverse();
  activeIconBackups = [];
  for (const b of backups) {
    if (b.kind === "created") {
      await fs.rm(b.path, { force: true }).catch(() => {});
    } else {
      await fs.rm(b.originalPath, { force: true }).catch(() => {});
      await fs.mkdir(path.dirname(b.originalPath), { recursive: true });
      await fs.rename(b.backupPath, b.originalPath).catch(async () => {
        try {
          await fs.copyFile(b.backupPath, b.originalPath);
          await fs.rm(b.backupPath, { force: true });
        } catch {
          /* ignore */
        }
      });
    }
  }
}

export async function discardIconFile(filePath: string): Promise<void> {
  await fs.unlink(filePath).catch(() => {});
}
