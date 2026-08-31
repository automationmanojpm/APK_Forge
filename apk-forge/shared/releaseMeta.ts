import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type ReleaseMeta = {
  version: string;
  changelog: string;
  /** Latest ## section body lines for a short UI preview */
  latestChanges: string[];
};

const apkForgeRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function parseLatestChanges(changelog: string): string[] {
  const lines = changelog.split(/\r?\n/);
  let inLatest = false;
  const items: string[] = [];
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (inLatest) {
        break;
      }
      inLatest = true;
      continue;
    }
    if (!inLatest) {
      continue;
    }
    const m = line.match(/^\s*[-*]\s+(.+)$/);
    if (m) {
      items.push(m[1].trim());
    }
  }
  return items;
}

export async function readReleaseMeta(): Promise<ReleaseMeta> {
  let version = "0.0.0";
  let changelog = "";
  try {
    version = (await fs.readFile(path.join(apkForgeRoot, "VERSION"), "utf8"))
      .trim()
      .split(/\r?\n/)[0]
      .trim() || version;
  } catch {
    /* missing VERSION */
  }
  try {
    changelog = await fs.readFile(
      path.join(apkForgeRoot, "CHANGELOG.md"),
      "utf8",
    );
  } catch {
    /* missing CHANGELOG */
  }
  return {
    version,
    changelog: changelog.trim(),
    latestChanges: parseLatestChanges(changelog),
  };
}
