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
