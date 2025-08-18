{/*
import { azure } from "@ai-sdk/azure";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { streamText, type CoreMessage } from "ai";

export const runtime = "edge";
export const maxDuration = 30;

const modelName      = process.env.AZURE_MODEL_NAME!;
const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT!;
const indexName      = process.env.AZURE_SEARCH_INDEX_NAME!;
const apiKey         = process.env.AZURE_SEARCH_KEY!;
const semanticConfig = process.env.AZURE_SEARCH_SEMANTIC_CONFIG_NAME?.trim() || "default";

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();

  // 1) 마지막 메시지에서 검색어 추출
  const last = messages[messages.length - 1];
  let query = "";
  if (last.content) {
    query = typeof last.content === "string"
      ? last.content
      : last.content.filter(p => p.type === "text").map(p => p.text).join(" ");
  }

  let ragContent = "";
  if (query) {
    try {
      // 2) Semantic+Vector 검색 (REST)
      const url = `${searchEndpoint}/indexes/${encodeURIComponent(indexName)}/docs/search?api-version=2023-10-01-Preview`;
      const restBody = {
        search:                query,
        queryType:             "semantic",
        queryLanguage:         "en-us",
        semanticConfiguration: semanticConfig,
        captions:              "extractive",
        answers:               "extractive|count-3",
        vectorQueries: [
          {
            kind: "text",
            fields: "chunkVector",  // ← 배열이 아닌 문자열
            text: query,
            k: 5                    // ← kNearestNeighborsCount → k
          }
        ]
      };

      const res  = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body:    JSON.stringify(restBody)
      });
      const raw = await res.text();
      if (!res.ok) {
        console.error("🔍 Search REST error body:", raw);
        throw new Error(`Search failed: ${res.status}`);
      }
      const json = JSON.parse(raw);
      console.log(json)

      // 3) @search.answers 우선 사용
      const answers: { text: string }[] = json["@search.answers"] ?? [];
      if (answers.length) {
        ragContent = answers.map(a => a.text).join("\n\n---\n\n");
      } else {
        // 4) 없으면 JS SDK로 벡터 검색 폴백
        const { SearchClient, AzureKeyCredential, SearchOptions } = await import("@azure/search-documents");
        const searchClient = new SearchClient(searchEndpoint, indexName, new AzureKeyCredential(apiKey));
        const vectorOpts: SearchOptions = {
          select: ["content"],
          top:    5,
          vectorSearchOptions: {
            queries: [{
              kind: "text",
              fields: ["chunkVector"],
              text:   query,
              kNearestNeighborsCount: 5
            }]
          }
        };

        const docs: string[] = [];
        for await (const r of searchClient.search(query, vectorOpts).results) {
          if (r.document.content) docs.push(r.document.content);
        }
        ragContent = docs.join("\n\n---\n\n");
      }
    } catch (err) {
      console.error("Azure AI Search Error:", err);
    }
  }

  // 5) RAG용 시스템 프롬프트 보강
  const augmentedSystemPrompt = `
    당신은 사용자에게 도움이 되는 답변을 제공하는 AI 어시스턴트입니다.
    아래 '참고 정보'를 바탕으로 질문에 답변해 주세요.
    정보가 부족하면 솔직하게 말씀해 주세요.

    [참고 정보]
    ---
    ${ragContent}
    ---

    [원래 시스템 프롬프트]
    ${system ?? "없음"}
  `.trim();

  // 6) AOAI 스트리밍 응답
  return streamText({
    model:             azure(modelName),
    messages,
    toolCallStreaming: true,
    system:            augmentedSystemPrompt,
    tools:             { ...frontendTools(tools) },
    onError:           console.error,
  }).toDataStreamResponse();
}

// app/api/chat/route.ts
import { NextRequest } from "next/server";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const api = process.env.API_BASE_URL ?? "http://api:4000"; // K8s Service DNS
  const body = await req.json();
  const r = await fetch(`${api}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return new Response(await r.text(), {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") ?? "application/json" },
  });
}
*/}

// app/api/chat/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  const r = await fetch(`${process.env.API_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // 중요: 스트리밍을 끊지 않고 그대로 전달
    cache: "no-store",
  });
  return new Response(r.body, {
    status: r.status,
    headers: {
      // Data Stream Protocol 헤더 그대로 통과
      "Content-Type": r.headers.get("Content-Type") ?? "text/plain",
    },
  });
}
