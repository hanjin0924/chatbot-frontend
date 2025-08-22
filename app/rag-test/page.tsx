// app/rag-test/page.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

type Ref = { label: string; title: string; url?: string; summary?: string };

export default function RagTestPage() {
  // 입력은 이제 직접 상태로 관리
  const [input, setInput] = useState('');
  // RAG 참조(우측 패널) 상태
  const [refs, setRefs] = useState<Ref[]>([]);

  const { messages, sendMessage, status } = useChat({
    // v5: 서버가 스트림으로 보내는 커스텀 데이터는 onData에서 받습니다.
    // (서버가 'source' 또는 'data-references' 같은 파트를 보낸다고 가정)
    onData: (part) => {
      if (part.type === 'data-references') {
        // 서버가 writer.write({ type: 'data-references', data: [...] })로 보냈을 때
        setRefs(part.data as Ref[]);
      }
    },

    // 스트리밍 종료 후, message.parts에서 'source' 파트를 추출해도 됩니다.
    onFinish: ({ message }) => {
      const sources =
        (message.parts || [])
          .filter((p: any) => p.type === 'source')
          .map((p: any, i: number) => ({
            label: `RAG#${i + 1}`,
            title: p.title ?? '출처',
            url: p.url,
            summary: p.summary,
          })) ?? [];
      if (sources.length) setRefs(sources);
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // v5: message.parts에서 text만 모아 렌더링
  const renderMessage = (m: any) =>
    (m.parts || [])
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    // v5: sendMessage({ text }) 형태로 전송
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="flex gap-6 p-4">
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
                {renderMessage(m)}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder="질문을 입력하세요"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="border rounded-lg px-3 py-2" disabled={isLoading}>
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
                {r.summary && <div className="text-xs text-gray-600">{r.summary}</div>}
                {r.url && (
                  <a href={r.url} target="_blank" className="text-xs underline" rel="noreferrer">
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
