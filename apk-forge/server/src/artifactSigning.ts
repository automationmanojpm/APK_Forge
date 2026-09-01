import { spawn } from "node:child_process";

export type SigningCertificate = {
  sha256?: string;
  sha1?: string;
  md5?: string;
  subject?: string;
};

export type ArtifactSigningInfo = {
  certificate?: SigningCertificate;
  copyText: string;
};

function normalizeFingerprint(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

/** Parse `keytool -printcert -jarfile` output (first certificate block). */
export function parseKeytoolPrintCertOutput(output: string): SigningCertificate | null {
  const text = output.trim();
  if (!text) {
    return null;
  }

  const sha256Match = text.match(/SHA-?256:\s*([0-9A-Fa-f: \n]+)/i);
  const sha1Match = text.match(/SHA-?1:\s*([0-9A-Fa-f: \n]+)/i);
  const md5Match = text.match(/MD5:\s*([0-9A-Fa-f: \n]+)/i);
  const ownerMatch = text.match(/Owner:\s*(.+)/i);

  const cert: SigningCertificate = {};
  if (sha256Match?.[1]) {
    cert.sha256 = normalizeFingerprint(sha256Match[1]);
  }
  if (sha1Match?.[1]) {
    cert.sha1 = normalizeFingerprint(sha1Match[1]);
  }
  if (md5Match?.[1]) {
    cert.md5 = normalizeFingerprint(md5Match[1]);
  }
  if (ownerMatch?.[1]) {
    cert.subject = ownerMatch[1].trim();
  }

  return cert.sha256 || cert.sha1 || cert.md5 || cert.subject ? cert : null;
}

export function formatSigningCopyText(options: {
  profileLabel?: string;
  buildVariant?: string;
  certificate?: SigningCertificate;
}): string {
  const lines: string[] = [];
  if (options.profileLabel?.trim()) {
    lines.push(`Signature: ${options.profileLabel.trim()}`);
  } else if (options.buildVariant === "debug") {
    lines.push("Variant: debug");
  }
  if (options.certificate?.subject) {
    lines.push(`Subject: ${options.certificate.subject}`);
  }
  if (options.certificate?.sha256) {
    lines.push(`SHA-256: ${options.certificate.sha256}`);
  }
  if (options.certificate?.sha1) {
    lines.push(`SHA-1: ${options.certificate.sha1}`);
  }
  return lines.join("\n");
}

function runKeytoolPrintCert(artifactPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "keytool",
      ["-printcert", "-jarfile", artifactPath],
      {
        shell: false,
        windowsHide: true,
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(
        new Error(
          `keytool exited with code ${code}${stderr.trim() ? `: ${stderr.trim()}` : ""}`,
        ),
      );
    });
  });
}

export async function readArtifactSigningInfo(options: {
  artifactPath: string;
  profileLabel?: string;
  buildVariant?: string;
}): Promise<ArtifactSigningInfo | null> {
  let output: string;
  try {
    output = await runKeytoolPrintCert(options.artifactPath);
  } catch {
    return null;
  }

  const certificate = parseKeytoolPrintCertOutput(output) ?? undefined;
  const copyText = formatSigningCopyText({
    profileLabel: options.profileLabel,
    buildVariant: options.buildVariant,
    certificate,
  });
  if (!copyText.trim()) {
    return null;
  }
  return { certificate, copyText };
}
