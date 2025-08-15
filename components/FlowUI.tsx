'use client'

import React from 'react'
import { useStepPolling, Step as PollStep } from '@/hooks/useStepPolling'

interface FlowUIProps {
  blobName: string | null
}

export default function FlowUI({ blobName }: FlowUIProps) {
  // 1~9단계 초기 상태
  const initialSteps: PollStep[] = [
    { key: 'upload',            name: '1. 업로드',           status: '대기중', pct: 0 },
    { key: 'save-storage',      name: '2. 스토리지 저장',   status: '대기중', pct: 0 },
    { key: 'di-process',        name: '3. DI 처리',         status: '대기중', pct: 0 },
    { key: 'save-storage-di',   name: '4. DI 결과 저장',   status: '대기중', pct: 0 },
    { key: 'create-datasource', name: '5. 데이터 소스 생성', status: '대기중', pct: 0 },
    { key: 'create-index',      name: '6. 인덱스 생성',      status: '대기중', pct: 0 },
    { key: 'create-skillset',   name: '7. 스킬셋 생성',      status: '대기중', pct: 0 },
    { key: 'create-indexer',    name: '8. 인덱서 생성',      status: '대기중', pct: 0 },
    { key: 'indexing-complete', name: '9. 인덱싱 완료',      status: '대기중', pct: 0 },
  ]

  // useStepPolling 훅 호출 — 내부에 console.log가 모두 들어있습니다.
  const steps = useStepPolling({
    initialSteps,
    //apiBaseUrl: process.env.NEXT_PUBLIC_API_URL!,
    apiBaseUrl: "",
    blobName,
    intervalMs: 3000,
  })

  return (
    <div className="mt-6 px-4">
      <h6 className="text-gray-500 mb-2">진행 과정</h6>
      <ul className="space-y-3">
        {steps.map((s, i) => (
          <li key={i}>
            <div className="flex justify-between text-sm">
              <span>{s.name}</span>
              <span
                className={
                  s.status === '완료'
                    ? 'text-green-600'
                    : s.status === '실패'
                    ? 'text-red-600'
                    : 'text-gray-400'
                }
              >
                {s.status}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-lg h-3 mt-1">
              <div
                className="bg-green-500 h-3 rounded-lg flex items-center justify-center text-xs text-white"
                style={{ width: `${s.pct}%` }}
              >
                {s.pct}%
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
