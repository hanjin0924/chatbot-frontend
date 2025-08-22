// components/app-sidebar.tsx
'use client';

import * as React from 'react';
import NextLink from 'next/link';
import Image from 'next/image';

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
              <NextLink href="https://assistant-ui.com" target="_blank" className='flex items-center space-x-2 space-y+3'>
                <div className="flex aspect-square size-15 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                  {/*<MessagesSquare className="size-8 shrink-0" />*/}
                  <Image src="/character.png" alt='assistant-ui' width={200} height={200}
                    className='size-30 shrink-0 rounded-md object-contain'
                    priority
                  />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-2xl">AskiI</span>
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