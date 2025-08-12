'use client';
import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

function stripWhiteBackground(json: any) {
  // 1) 최상단 배경 키가 있으면 비우기
  if ('bg' in json) json.bg = '';

  // 2) 레이어 중 '흰색 솔리드 레이어(ty:1)'가 컴포지션 전체 크기면 제거
  const isWhiteHex = (hex?: string) =>
    typeof hex === 'string' && hex.toLowerCase() === '#ffffff';

  if (Array.isArray(json.layers)) {
    json.layers = json.layers.filter((layer: any) => {
      const isSolid = layer.ty === 1; // solid layer
      const sameSize = layer.w === json.w && layer.h === json.h;
      const whiteSolid = isSolid && isWhiteHex(layer.sc);
      return !(whiteSolid && sameSize);
    });

    // 3) shape 레이어 안에 흰색 fill(fl)이 있으면 투명도 0으로
    json.layers.forEach((layer: any) => {
      if (layer.ty === 4 && Array.isArray(layer.shapes)) {
        layer.shapes.forEach((s: any) => {
          if (s.ty === 'fl' && Array.isArray(s.c?.k)) {
            const [r, g, b] = s.c.k; // 0..1 범위
            const isWhite = r === 1 && g === 1 && b === 1;
            if (isWhite) {
              if (s.o) s.o.k = 0;        // opacity 0
              else s.o = { a: 0, k: 0 };
            }
          }
        });
      }
    });
  }
  return json;
}

export default function HelloLottie({
  width = 500,
  loop = false,
  className,
}: { width?: number; loop?: boolean; className?: string }) {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    fetch('/lottie/hello1.json')
      .then((r) => r.json())
      .then((json) => setData(stripWhiteBackground(json)))
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  return (
    <Lottie
      animationData={data}
      loop={loop}
      autoplay
      style={{ width }}
      className={className}
    />
  );
}
