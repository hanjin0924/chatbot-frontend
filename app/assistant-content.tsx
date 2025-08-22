// app/assistant-content.tsx
'use client';

import React, { useRef, DragEvent, ChangeEvent } from 'react';
//import { useComposerRuntime } from '@assistant-ui/react';
import { Thread } from '@/components/assistant-ui/thread';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Paperclip } from 'lucide-react';

interface AssistantContentProps {
  // runtime: ReturnType<typeof useChatRuntime>;
  onUploadStart: () => void;
  onUploadEnd: (blobName: string) => void;
}

export default function AssistantContent({
  // runtime,
  onUploadStart,
  onUploadEnd,
}: AssistantContentProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1) 파일 드롭 or 선택 시 업로드 API 호출
  // 업로드 함수: 파일 하나씩 업로드하고 완료 콜백 호출
  const upload = async (file: File) => {
    onUploadStart();

    {/* 내부 API 호출
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    const data = await res.json();
    
    // 필요하다면 data.url 사용
    //업로드 되면 사라지는 부분
    //onUploadEnd();
    */}

    // 변경 -> 외부 백엔드 호출
    const form = new FormData();
    form.append('file', file);

    //const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: form,
    });
    if(!res.ok) {
      // const err = await res.text();
      throw new Error('업로드 실패: $(err)');
    }
    //const data = await res.json();
    const { blobName } = await res.json();

    onUploadEnd(blobName);
  };

  // 드래그&드롭으로 파일 추가
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt?.files) return;
    Array.from(dt.files).forEach(upload);
  };

  // 📎 버튼 또는 파일선택창으로 파일 추가
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files;
    if (!fl) return;
    Array.from(fl).forEach(upload);
    e.target.value = '';
  };

  return (
    <SidebarInset
      className="flex flex-col flex-1"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* 상단바 */}
      <header className="flex z-10 h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#">
                GPT 4.1
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Public / Protected / Internal</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* 메시지 리스트 + 내장 Composer(input) */}
      <div className="flex-1 flex flex-col">
        <Thread />
      </div>

      {/* 📎 + 첨부파일 칩을 뷰포트 하단에 sticky footer로 배치 */}
      <div className="sticky bottom-0 bg-white z-10 border-t px-4 py-2 mt-3 flex items-center space-x-3">
        {/* 파일 첨부 버튼 */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-gray-500 hover:text-gray-700"
        >
          <Paperclip className="w-6 h-6" />
        </button>
          {/* 숨겨진 파일 input (📎 버튼과 연동) */}
          <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
          />
      </div>
    </SidebarInset>
  );
}
