{/*
// chatbot-aoai/app/api/chat/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = (process.env.API_BASE_URL || "http://api:4000").replace(/\/+$/, "");

export async function POST(req: NextRequest) {
  // 스트리밍 안정성을 위해 문자열로 전달
  const bodyText = await req.text();
  const upstream = `${API_BASE}/api/chat`;

  const r = await fetch(upstream, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: bodyText,
    cache: "no-store",
  });

  if (!r.body) {
    const t = await r.text().catch(() => "");
    return new Response(t || "upstream has no body", {
      status: r.status || 502,
      headers: { "content-type": r.headers.get("content-type") ?? "text/plain; charset=utf-8" },
    });
  }

  const headers = new Headers();
  headers.set("content-type", r.headers.get("content-type") ?? "text/plain; charset=utf-8");
  const ds = r.headers.get("x-vercel-ai-data-stream");
  if (ds) headers.set("x-vercel-ai-data-stream", ds);

  return new Response(r.body, { status: r.status, headers });
}
*/}

// chatbot-aoai/app/api/chat/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const apiBase = (process.env.API_BASE_URL || "http://api:4000").replace(/\/+$/, "");
  const upstream = `${apiBase}/api/chat`;

  try {
    const bodyText = await req.text();
    console.log("[proxy:/api/chat] upstream =>", upstream);

    const r = await fetch(upstream, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: bodyText,
      cache: "no-store",
    });

    // 실패면 본문을 읽어서 그대로 전달(디버깅 편의)
    if (!r.ok) {
      const errorBody = await r.text().catch(() => "");
      console.error("[proxy:/api/chat] upstream error:", r.status, errorBody?.slice(0, 500));
      return new Response(errorBody || JSON.stringify({ error: "upstream_error" }), {
        status: r.status,
        headers: { "content-type": r.headers.get("content-type") ?? "text/plain; charset=utf-8" },
      });
    }

    // 성공이면 스트림 그대로 pass-through
    const headers = new Headers();
    headers.set("content-type", r.headers.get("content-type") ?? "text/plain; charset=utf-8");
    const ds = r.headers.get("x-vercel-ai-data-stream");
    if (ds) headers.set("x-vercel-ai-data-stream", ds);

    if (!r.body) {
      // 이례적: ok인데 body가 없음
      return new Response("", { status: 200, headers });
    }
    return new Response(r.body, { status: 200, headers });
  } catch (e: any) {
    console.error("[proxy:/api/chat] fetch failed:", e?.message || e);
    return new Response(JSON.stringify({ error: "proxy_error", message: String(e?.message || e) }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}

