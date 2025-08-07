// components/app-sidebar.tsx
'use client';

import * as React from 'react';
import { useStepPolling, Step } from '@/hooks/useStepPolling';
import NextLink from 'next/link';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { ThreadList } from './assistant-ui/thread-list';
import FlowUI from './FlowUI';
import { Link as LinkIcon, MessagesSquare } from 'lucide-react';

interface AppSidebarProps {
  showFlow?: boolean;
  blobName: string | null;
}

export default function AppSidebar({ showFlow = false, blobName, }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NextLink href="https://assistant-ui.com" target="_blank" className='flex items-center space-x-2'>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <MessagesSquare className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">assistant-ui</span>
                </div>
              </NextLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="p-4 space-y-6">
        {/* + 새 채팅 기본 UI */}
        <div className="flex-1 overflow-y-auto">
          <ThreadList />
        </div>

        {/* 업로드 후 FlowUI 렌더 */}
        {showFlow && <FlowUI blobName={blobName} />}
      </SidebarContent>

      <SidebarFooter>
        {/* 필요시 푸터 */}
      </SidebarFooter>
    </Sidebar>
  );
}