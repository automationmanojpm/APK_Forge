/**
 * Shared HTTP handler for APK Forge (Node server on your VM).
 */
import { buildHtmlPage } from "./html.js";

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
      return new Response(buildHtmlPage({ apiBase }), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }
  }

  return new Response("Not found", { status: 404 });
}
