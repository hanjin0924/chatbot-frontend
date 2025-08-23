'use client';

import { useMessagePartSource } from '@assistant-ui/react';

export function SourcePill() {
  const src = useMessagePartSource(); // 해당 source 파트 정보
  return (
    <a
      href={src.url ?? '#'}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs opacity-80 hover:opacity-100"
      title={src.title ?? src.url ?? src.id}
    >
      <span className="font-semibold">{src.id}</span>
      <span className="line-clamp-1">{src.title ?? src.url ?? ''}</span>
    </a>
  );
}
