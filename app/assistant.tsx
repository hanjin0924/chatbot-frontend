// app/assistant.tsx
'use client';

import React, { useState } from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';
import AppSidebar from '@/components/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import AssistantContent from './assistant-content';

export const Assistant = () => {
  const runtime = useChatRuntime({ api: '/api/chat' });

  // FlowUI 표시 여부
  const [showFlow, setShowFlow] = useState(false);
  const [blobName, setBlobName] = useState<string|null>(null);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* ← 여기서 한번만 SidebarProvider 래핑 */}
      <SidebarProvider>
        {/* 사이드바에 플래그 전달 */}
        <AppSidebar showFlow={showFlow} blobName={blobName} />
        <AssistantContent 
          runtime={runtime}
          onUploadStart={() => setShowFlow(true)}
          onUploadEnd={(name) => {
            setBlobName(name);
            //setShowFlow(false);
          }}
        />
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
