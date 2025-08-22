'use client';

import React, { useEffect, useRef, useState } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

/** 흰 배경 제거 (타입 안전 버전) */
function stripWhiteBackground(json: Record<string, unknown>): Record<string, unknown> {
  // 1) 최상단 배경 비우기
  if ('bg' in json) (json as { bg: string }).bg = '';

  const w = typeof (json as { w?: unknown }).w === 'number' ? (json as { w: number }).w : undefined;
  const h = typeof (json as { h?: unknown }).h === 'number' ? (json as { h: number }).h : undefined;

  const layers = Array.isArray((json as { layers?: unknown }).layers)
    ? (json as { layers: unknown[] }).layers
    : undefined;

  if (layers) {
    // 2) 컴포지션 전체 크기의 흰색 솔리드 레이어 제거
    const filtered = layers.filter((layer) => {
      const l = layer as Record<string, unknown>;
      const isSolid = l.ty === 1;
      const lw = typeof l.w === 'number' ? (l.w as number) : undefined;
      const lh = typeof l.h === 'number' ? (l.h as number) : undefined;
      const sc = l.sc;
      const whiteSolid = isSolid && typeof sc === 'string' && sc.toLowerCase() === '#ffffff';
      const sameSize = w !== undefined && h !== undefined && lw === w && lh === h;
      return !(whiteSolid && sameSize);
    });
    (json as { layers: unknown[] }).layers = filtered;

    // 3) shape 레이어의 흰색 fill 투명도 0 처리
    filtered.forEach((layer) => {
      const l = layer as Record<string, unknown>;
      if (l.ty === 4 && Array.isArray(l.shapes)) {
        (l.shapes as unknown[]).forEach((sObj) => {
          const s = sObj as Record<string, unknown>;
          if (s.ty === 'fl') {
            const c = s.c as Record<string, unknown> | undefined;
            const k = c?.k as unknown;
            if (Array.isArray(k) && k.length >= 3) {
              const [r, g, b] = k as unknown[];
              const isWhite = r === 1 && g === 1 && b === 1;
              if (isWhite) {
                if ('o' in s && s.o !== undefined) {
                  const o = s.o as Record<string, unknown>;
                  (o as { k?: number }).k = 0;
                } else {
                  s.o = { a: 0, k: 0 } as unknown as Record<string, unknown>;
                }
              }
            }
          }
        });
      }
    });
  }
  return json;
}

type HelloLottieProps = {
  /** 외부에서 애니메이션 데이터를 주면 fetch를 생략 */
  animationData?: Record<string, unknown>;
  /** 내부 fetch를 사용할 때 JSON 경로 (기본: /lottie/hello2.json) */
  src?: string;
  /** 렌더 폭 */
  width?: number;
  /** 반복 재생 여부 */
  loop?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onComplete?: () => void;
  /** 재생 속도 (기본 1) */
  speed?: number;
};

const HelloLottie: React.FC<HelloLottieProps> = ({
  animationData,
  src = "/lottie/hello4.json",
  width = 500,
  loop = false,
  className,
  onClick,
  onComplete,
  speed = 1,
}) => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(animationData ?? null);

  // animationData 미지정 시 내부 fetch
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (data || animationData) return; // 이미 있음
      try {
        const res = await fetch(src, { cache: "force-cache" });
        const json = (await res.json()) as Record<string, unknown>;
        if (!cancelled) setData(stripWhiteBackground(json));
      } catch {
        if (!cancelled) setData(null);
      }
    }
    load();
    return () => { cancelled = true; };
    // animationData/ src가 바뀌면 다시 고려
  }, [animationData, src, data]);

  // 속도 반영
  useEffect(() => {
    if (lottieRef.current) lottieRef.current.setSpeed(speed);
  }, [speed]);

  const payload = animationData ?? data;
  if (!payload) return null;

  return (
    <div onClick={onClick} className={className}>
      <Lottie
        lottieRef={lottieRef}
        animationData={payload}
        loop={loop}
        onComplete={onComplete}
        style={{ width }}
      />
    </div>
  );
};

export default HelloLottie;
