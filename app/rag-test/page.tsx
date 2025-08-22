// app/rag-test/page.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { DefaultChatTransport } from 'ai';

/** RAG 참조 패널용 타입 */
type Ref = { label: string; title: string; url?: string; summary?: string };

/** 메시지 파트 타입들 (최소한으로 사용) */
type TextPart = { type: 'text'; text: string };
type SourcePart = { type: 'source'; title?: string; url?: string; summary?: string };
type DataReferencesPart = { type: 'data-references'; data: Ref[] };
type AnyPart =
  | TextPart
  | SourcePart
  | DataReferencesPart
  | { type: string; [k: string]: unknown };

/** 메시지 형태(최소한) */
type Role = 'user' | 'assistant' | 'system' | 'tool';
type MessageLike = {
  id: string;
  role: Role;
  parts?: AnyPart[];
  // 일부 런타임/버전은 content를 씁니다. 호환을 위해 포함
  content?: string | Array<{ text?: string }>;
};

/** 타입 가드 */
const isTextPart = (p: AnyPart): p is TextPart =>
  (p as TextPart).type === 'text' && typeof (p as TextPart).text === 'string';

const isSourcePart = (p: AnyPart): p is SourcePart =>
  (p as SourcePart).type === 'source';

const isDataReferencesPart = (p: unknown): p is DataReferencesPart =>
  !!p && typeof p === 'object' && (p as { type?: string }).type === 'data-references';

export default function RagTestPage() {
  /** 입력값은 v5에서 직접 관리 */
  const [input, setInput] = useState('');
  /** 우측 패널에 표시할 RAG 참조 */
  const [refs, setRefs] = useState<Ref[]>([]);

  const { messages, sendMessage, status } = useChat({
    // v5에서는 커스텀 엔드포인트가 필요하면 transport를 쓰세요.
    // 기본값은 '/api/chat' 입니다.
    transport: new DefaultChatTransport({
    api: process.env.API_BASE_URL + '/api/chat',
    }),

    /** 서버가 커스텀 data 파트를 스트리밍할 경우 */
    onData: (part) => {
      if (isDataReferencesPart(part)) {
        setRefs(part.data);
      }
    },

    /** 스트림 종료 후 메시지의 source 파트를 모아 참조로 사용 */
    onFinish: ({ message }) => {
      const m = message as MessageLike;
      const parts = Array.isArray(m.parts) ? m.parts : [];
      const sources: Ref[] = parts
        .filter(isSourcePart)
        .map((p, i) => ({
          label: `RAG#${i + 1}`,
          title: p.title ?? '출처',
          url: p.url,
          summary: p.summary,
        }));
      if (sources.length) setRefs(sources);
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  /** 메시지에서 텍스트만 추출 (parts 우선, 없으면 content 폴백) */
  const renderMessageText = (m: MessageLike): string => {
    if (Array.isArray(m.parts)) {
      return m.parts.filter(isTextPart).map((p) => p.text).join('');
    }
    if (typeof m.content === 'string') return m.content;
    if (Array.isArray(m.content)) {
      return m.content.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('');
    }
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    // v5: sendMessage({ text })
    sendMessage({ text: q });
    setInput('');
  };

  return (
    <div className="flex gap-6 p-4">
      {/* 본문 */}
      <main className="flex-1">
        <h1 className="text-xl font-semibold mb-3">RAG 참조 테스트</h1>

        <div className="space-y-3">
          {(messages as MessageLike[]).map((m) => (
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
                {renderMessageText(m)}
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
