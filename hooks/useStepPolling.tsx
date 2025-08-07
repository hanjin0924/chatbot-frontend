// chatbot-aoai/hooks/useStepPolling.tsx
'use client';

import { useState, useEffect, useRef } from 'react';

export type StepStatus = '대기중' | '완료' | '실패';

export interface Step {
  key: string;    // upload | save-storage | di-process | save-storage-di | ...
  name: string;   // 사용자에게 표시할 단계명
  status: StepStatus;
  pct: number;    // 진행 퍼센트 (완료면 100)
}

interface Options {
  initialSteps: Step[];
  apiBaseUrl: string;      // ex) http://localhost:4000
  blobName: string | null; // 업로드 API에서 받은 blobName
  intervalMs?: number;     // 폴링 주기(ms)
}

export function useStepPolling({
  initialSteps,
  apiBaseUrl,
  blobName,
  intervalMs = 2000,  // 기본 2초마다 폴링
}: Options): Step[] {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const stepsRef = useRef<Step[]>(initialSteps);

  // 내부에서 사용할 현재 blob 이름
  const currentNameRef = useRef<string | null>(blobName);
  
  // prop이 바뀌면 반영
  useEffect(() => {
    currentNameRef.current = blobName;
  }, [blobName]);

  // 상태 변화시 ref에도 복사
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  useEffect(() => {
    if (!currentNameRef.current) return;  // blobName 없으면 아무 것도 안 함
    let timer: ReturnType<typeof setInterval>;

    // 한 단계만 체크
    async function check(idx: number) {
      const step = stepsRef.current[idx];
      const { key, name } = step;
      let done = false;
      let res, json: any;

      console.log(`[useStepPolling] '${name}' 체크 시작 (현재 blob='${currentNameRef.current}')`);

      try {
        switch (key) {
          case 'upload':
            // 프론트가 blobName을 받았으면 곧바로 완료
            done = true;
            break;

          case 'save-storage':
            // 1차 스토리지: 입력 컨테이너 업로드 확인
            res = await fetch(
              `${apiBaseUrl}/api/healthcheck/blob?name=${encodeURIComponent(currentNameRef.current!)}`
            );
            json = await res.json();
            console.log(`[useStepPolling] ${name} 응답`, json);
            done = json.inputExists;
            break;

          case 'di-process':
            // DI 프로세스 자체는 상태 체크 API가 없으므로, 
            // 바로 다음 단계인 save-storage-di 로 넘기기 위해 즉시 완료 처리
            // output container에 실제 올라간 파일명으로 가공
            const base = currentNameRef.current!.replace(/\.pdf$/i, '');
            const newName = `${base}_searchable.pdf`;
            currentNameRef.current = newName;
            console.log(`[useStepPolling] 가공된 blobName -> '${newName}`);
            done = true;
            break;

          case 'save-storage-di':
            // 2차 스토리지: 출력 컨테이너 업로드 확인
            res = await fetch(
              `${apiBaseUrl}/api/healthcheck/blob?name=${encodeURIComponent(currentNameRef.current!)}`
            );
            json = await res.json();
            console.log(`[useStepPolling] ${name} 응답`, json);
            done = json.outputExists;
            break;

          case 'create-datasource':
            res = await fetch(
              `${apiBaseUrl}/api/healthcheck/search/datasource`
            );
            json = await res.json();
            console.log(`[useStepPolling] ${name} 응답`, json);
            done = json.dataSourceExists;
            break;

          case 'create-index':
            res = await fetch(
              `${apiBaseUrl}/api/healthcheck/search/index`
            );
            json = await res.json();
            console.log(`[useStepPolling] ${name} 응답`, json);
            done = json.indexExists;
            break;

          case 'create-skillset':
            res = await fetch(
              `${apiBaseUrl}/api/healthcheck/search/skillset`
            );
            json = await res.json();
            console.log(`[useStepPolling] ${name} 응답`, json);
            done = json.skillsetExists;
            break;

          case 'create-indexer':
            res = await fetch(
              `${apiBaseUrl}/api/healthcheck/search/indexer`
            );
            json = await res.json();
            console.log(`[useStepPolling] ${name} 응답`, json);
            done = json.indexerExists;
            break;

          case 'indexing-complete':
            res = await fetch(
              `${apiBaseUrl}/api/healthcheck/search/indexer`
            );
            json = await res.json();
            console.log(`[useStepPolling] ${name} 응답`, json);
            done = json.indexerStatus === 'success';
            break;
        }

        // 상태 반영
        setSteps(prev => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            status: done ? '완료' : '대기중',
            pct: done ? 100 : 0,
          };
          return next;
        });
        return done;
      } catch (err) {
        console.error(`[useStepPolling] ${name} 에러`, err);
        setSteps(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], status: '실패', pct: 0 };
          return next;
        });
        return true;  // 에러라도 다음 단계 진행
      }
    }

    // 순차 폴링
    async function poll() {
      const list = stepsRef.current;
      for (let i = 0; i < list.length; i++) {
        if (i > 0 && list[i - 1].status !== '완료') break;
        if (list[i].status === '대기중') {
          const done = await check(i);
          if (!done) break;
        }
      }
    }

    // 즉시 한 번 실행 → intervalMs 마다 반복
    poll();
    timer = setInterval(poll, intervalMs);
    return () => clearInterval(timer);
  }, [apiBaseUrl, blobName, intervalMs]);

  return steps;
}
