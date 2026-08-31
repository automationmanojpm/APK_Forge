/**
 * One-shot: release APK with signing_mode=custom (CUSTOM_ANDROID_* base64 path).
 * Uses the default debug.keystore as the custom blob — same as env.example local test.
 */
import { mkdir } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runLocalBuild } from "../src/localBuild.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const androidProjectRoot = path.resolve(__dirname, "../../..");
const keystorePath = path.join(os.homedir(), ".android", "debug.keystore");

const b64 = (await readFile(keystorePath)).toString("base64");
process.env.CUSTOM_ANDROID_KEYSTORE_BASE64 = b64;
process.env.CUSTOM_ANDROID_KEYSTORE_PASSWORD = "android";
process.env.CUSTOM_ANDROID_KEY_ALIAS = "androiddebugkey";
process.env.CUSTOM_ANDROID_KEY_PASSWORD = "android";

// Avoid default path accidentally winning if shell inherited values
delete process.env.ANDROID_KEYSTORE_BASE64;
delete process.env.RELEASE_KEYSTORE_FILE;

const artifactsDir = path.join(__dirname, "../.tmp-custom-sign-test-artifacts");
await mkdir(artifactsDir, { recursive: true });

const result = await runLocalBuild({
  projectRoot: androidProjectRoot,
  artifactsDir,
  inputs: {
    application_id: "com.proqa.testapp",
    display_name: "ClientApp",
    version_code: "1",
    version_name: "1.0",
    artifact_type: "apk",
    signing_mode: "custom",
    build_variant: "release",
  },
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
