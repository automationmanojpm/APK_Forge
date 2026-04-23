/**
 * Shared HTTP handler for APK Forge (Node server on your VM).
 */
import { buildHtmlPage } from "./html.js";

export async function handleApkForgeRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return new Response("ok", {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  }

  if (request.method === "GET" && url.pathname === "/") {
    return new Response(buildHtmlPage(), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  return new Response("Not found", { status: 404 });
}
