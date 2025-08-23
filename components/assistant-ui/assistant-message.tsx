'use client';

import { MessagePrimitive } from '@assistant-ui/react';
import { SourcePill } from './source-pill';
// (선택) 마크다운 렌더러:
// import { MarkdownText } from '@assistant-ui/react-ui';

export function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="space-y-2">
      <MessagePrimitive.Parts
        components={{
          // Text: ({ text }) => <MarkdownText text={text} />,
          Source: SourcePill, // ← 'source' 파트를 우리가 만든 컴포넌트로 렌더
        }}
      />
    </MessagePrimitive.Root>
  );
}
