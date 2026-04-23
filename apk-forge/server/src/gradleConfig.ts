import { promises as fs } from "node:fs";
import path from "node:path";

export type AppConfigResponse = {
  application_id: string;
  display_name: string;
  version_code: string;
  version_name: string;
};

function parsePropsFile(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) {
      continue;
    }
    const eq = t.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    map.set(k, v);
  }
  return map;
}

export async function readAppGradleProperties(
  projectRoot: string,
): Promise<AppConfigResponse> {
  const filePath = path.join(projectRoot, "gradle.properties");
  let content = "";
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch {
    return {
      application_id: "",
      display_name: "",
      version_code: "",
      version_name: "",
    };
  }
  const map = parsePropsFile(content);
  return {
    application_id: map.get("app.applicationId") ?? "",
    display_name: map.get("app.displayName") ?? "",
    version_code: map.get("app.versionCode") ?? "",
    version_name: map.get("app.versionName") ?? "",
  };
}

function upsertPropertyLine(
  lines: string[],
  key: string,
  value: string,
): string[] {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^\\s*${esc}\\s*=`);
  let found = false;
  const out = lines.map((line) => {
    if (re.test(line)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) {
    out.push(`${key}=${value}`);
  }
  return out;
}

export async function writeAppGradleProperties(
  projectRoot: string,
  data: AppConfigResponse,
): Promise<void> {
  const filePath = path.join(projectRoot, "gradle.properties");
  let lines: string[];
  try {
    const content = await fs.readFile(filePath, "utf8");
    lines = content.split(/\r?\n/);
  } catch {
    lines = [""];
  }
  const updates: [string, string][] = [
    ["app.applicationId", data.application_id],
    ["app.displayName", data.display_name],
    ["app.versionCode", data.version_code],
    ["app.versionName", data.version_name],
  ];
  let out = lines;
  for (const [key, value] of updates) {
    out = upsertPropertyLine(out, key, value);
  }
  await fs.writeFile(filePath, out.join("\n"), "utf8");
}
