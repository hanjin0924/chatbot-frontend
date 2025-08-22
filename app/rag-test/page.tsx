// app/rag-test/page.tsx
'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';

type Ref = { label: string; title: string; url?: string; summary?: string };

export default function RagTestPage() {
  // 1) refs는 별도 상태로만 관리
  const [refs, setRefs] = useState<Ref[]>([]);

  // 2) isLoading까지 구조분해
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onFinish: (_message, extra: any) => {
      // 서버가 스트림 메타데이터로 보낸 references 꺼내기 (버전 호환)
      const incoming: Ref[] | null =
        extra?.references ?? extra?.data?.references ?? null;
      if (incoming) setRefs(incoming);
    },
  });

  // 3) 안전 렌더링 (암시적 any 제거)
  const renderText = (m: any) => {
    if (typeof m?.content === 'string') return m.content;
    if (Array.isArray(m?.content)) {
      return (m.content as Array<{ text?: string }>)
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .join('');
    }
    return '';
  };

  return (
    <div className="flex gap-6 p-4">
      {/* 본문 */}
      <main className="flex-1">
        <h1 className="text-xl font-semibold mb-3">RAG 참조 테스트</h1>

        <div className="space-y-3">
          {messages.map((m: any) => (
            <div
              key={m.id}
              className={
                m.role === 'user'
                  ? 'bg-slate-50 border rounded-2xl px-4 py-2'
                  : 'bg-white border rounded-2xl px-4 py-2'
              }
            >
              <div className="text-xs text-gray-500 mb-1">{m.role}</div>
              <div className="whitespace-pre-wrap break-words">
                {renderText(m)}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder="질문을 입력하세요"
            value={input}
            onChange={handleInputChange}
          />
          <button
            type="submit"
            className="border rounded-lg px-3 py-2"
            disabled={isLoading}
          >
            보내기
          </button>
        </form>
      </main>

      {/* 우측 참조 패널 */}
      {refs.length > 0 && (
        <aside className="w-80 shrink-0 border-l pl-4">
          <h3 className="font-semibold mb-2">참고 문서</h3>
          <ol className="space-y-3 list-decimal list-inside">
            {refs.map((r) => (
              <li key={r.label}>
                <div className="text-sm font-medium">
                  {r.label} · {r.title}
                </div>
                {r.summary && (
                  <div className="text-xs text-gray-600">{r.summary}</div>
                )}
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    className="text-xs underline"
                    rel="noreferrer"
                  >
                    원문 열기
                  </a>
                )}
              </li>
            ))}
          </ol>
        </aside>
      )}
    </div>
  );
}
