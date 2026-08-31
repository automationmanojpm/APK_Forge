/**
 * Shared HTTP handler for APK Forge (Node server on your VM).
 */
import { buildHtmlPage } from "./html.js";
import { FAVICON_SVG } from "./favicon.js";
import { readReleaseMeta } from "./releaseMeta.js";

/** Canonical browser path for the APK Forge UI (root redirects here). */
const APK_FORGE_UI_PATH = "/apk-forge";

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

export async function handleApkForgeRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const p = normalizePathname(url.pathname);

  if (method === "GET" && url.pathname === "/health") {
    return new Response("ok", {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  }

  if (
    (method === "GET" || method === "HEAD") &&
    (p === "/favicon.svg" || p === "/favicon.ico")
  ) {
    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: {
          "content-type": "image/svg+xml; charset=utf-8",
          "cache-control": "public, max-age=86400",
        },
      });
    }
    return new Response(FAVICON_SVG, {
      status: 200,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=86400",
      },
    });
  }

  const redirectMethods = method === "GET" || method === "HEAD";

  if (redirectMethods && p === "/") {
    const loc = `${APK_FORGE_UI_PATH}${url.search}`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: loc,
        "cache-control": "no-store",
      },
    });
  }

  if (redirectMethods && p === "/apk_forge") {
    const loc = `${APK_FORGE_UI_PATH}${url.search}`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: loc,
        "cache-control": "no-store",
      },
    });
  }

  if (p === APK_FORGE_UI_PATH) {
    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }
    if (method === "GET") {
      const apiBase = process.env.APK_FORGE_API_BASE?.trim() ?? "";
      const meta = await readReleaseMeta();
      return new Response(
        buildHtmlPage({
          apiBase,
          version: meta.version,
          latestChanges: meta.latestChanges,
          changelog: meta.changelog,
        }),
        {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          },
        },
      );
    }
  }

  return new Response("Not found", { status: 404 });
}
