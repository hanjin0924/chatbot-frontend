import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import { azure } from "@ai-sdk/azure";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { streamText, type CoreMessage } from "ai";

export const runtime = "edge";
export const maxDuration = 30;

const modelName = process.env.AZURE_MODEL_NAME;

// Azure AI Search 클라이언트 초기화
const searchClient = new SearchClient(
  process.env.AZURE_SEARCH_ENDPOINT!,
  process.env.AZURE_SEARCH_INDEX_NAME!,
  new AzureKeyCredential(process.env.AZURE_SEARCH_KEY!)
);

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();

  // 마지막 메시지에서 '문자열' 검색어 추출
  const lastMessage = messages[messages.length - 1];
  let searchQuery = "";

  // lastMessage가 존재하고, content 속성이 있는지 확인
  if (lastMessage && lastMessage.content) {
    // content가 단순 문자열인 경우, 그대로 사용
    if (typeof lastMessage.content === 'string') {
      searchQuery = lastMessage.content;
    } 
    // content가 복잡한 배열 형태일 경우 (Vercel AI SDK 표준)
    else if (Array.isArray(lastMessage.content)) {
      // 배열에서 type이 'text'인 부분의 내용만 추출하여 합치기
      searchQuery = lastMessage.content
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join(' ');
    }
  }

  let ragContent = "";
  // 검색어가 있는 경우에만 Azure AI Search를 실행
  if (searchQuery) {
    try {
      const searchResults = await searchClient.search(searchQuery, {
        select: ["content"],
        top: 3,
      });

      const documents = [];
      for await (const result of searchResults.results) {
      // 내용이 있는 경우에만 추가
        if (result.document.content) { 
          documents.push(result.document.content);
        }
      }
      
      if (documents.length > 0) {
        ragContent = documents.join("\n\n---\n\n");
      }
    } catch (e) {
        console.error("Azure AI Search Error:", e);
    }
  }

  // 검색된 내용으로 시스템 프롬프트 보강
  const augmentedSystemPrompt = `
    당신은 사용자에게 도움이 되는 답변을 제공하는 AI 어시스턴트입니다.
    아래에 제공된 '참고 정보'를 바탕으로 사용자의 질문에 답변해 주세요.
    만약 '참고 정보'에서 질문에 대한 답변을 찾을 수 없다면, 정보가 부족하여 답변할 수 없다고 솔직하게 말해야 합니다.

    [참고 정보]
    ---
    ${ragContent}
    ---
    
    [사용자가 요청한 기존 시스템 프롬프트]
    ${system ?? "특별한 요청 없음"}
  `.trim();

  const result = streamText({
    model: azure(modelName),
    messages,
    toolCallStreaming: true,
    system: augmentedSystemPrompt,
    tools: {
      ...frontendTools(tools),
    },
    onError: console.log,
  });

  return result.toDataStreamResponse();
}