'use client'

import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import type { FC, RefCallback } from "react";
import {
  ArrowDownIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  SendHorizontalIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { ToolFallback } from "./tool-fallback";
import HelloLottie from "../HelloLottie";
import { SourcePill } from "@/components/assistant-ui/source-pill";
import { useCallback, useEffect, useRef, useState } from "react";

/** 바닥 판정: '완전 하단'에서만 true (조금만 올려도 false) */
function isAtBottom(el: HTMLElement, epsilon = 2) {
  const gap = el.scrollHeight - el.clientHeight - el.scrollTop;
  return gap <= epsilon;
}

export const Thread: FC = () => {
  // 오토스크롤 on/off (UI 표시용)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // 최신 상태/락/의도 유지용 ref들
  const autoScrollRef = useRef(true);             // shouldAutoScroll의 최신값
  const freezeRef = useRef(false);                // 사용자가 위로 올린 뒤 해제 전까지 true
  const userIntentRef = useRef(false);            // 직전 스크롤이 사용자 의도였는지
  const intentTimerRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);

  // 앵커/컨테이너 refs
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesRootRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const setViewportRef: RefCallback<HTMLDivElement> = (el) => {
    viewportRef.current = el;
  };

  // 상태 ↔ ref 동기화
  useEffect(() => {
    autoScrollRef.current = shouldAutoScroll;
  }, [shouldAutoScroll]);

  // 사용자 의도 플래그 ON (800ms 후 자동 해제)
  const armUserIntent = useCallback(() => {
    userIntentRef.current = true;
    if (intentTimerRef.current) window.clearTimeout(intentTimerRef.current);
    intentTimerRef.current = window.setTimeout(() => {
      userIntentRef.current = false;
      intentTimerRef.current = null;
    }, 800);
  }, []);

  // 스크롤 컨테이너에서 사용자 입력 이벤트로 의도 플래그 set
  useEffect(() => {
    const root =
      viewportRef.current ?? (document.getElementById("thread-viewport") as HTMLElement | null);
    if (!root) return;

    const onPointer = () => armUserIntent();
    root.addEventListener("wheel", onPointer, { passive: true });
    root.addEventListener("touchstart", onPointer, { passive: true });
    root.addEventListener("pointerdown", onPointer, { passive: true });

    return () => {
      root.removeEventListener("wheel", onPointer);
      root.removeEventListener("touchstart", onPointer);
      root.removeEventListener("pointerdown", onPointer);
    };
  }, [armUserIntent]);

  // ✅ 스크롤 이벤트: 사용자 의도일 때만 바닥/락 상태를 갱신
  useEffect(() => {
    const root =
      viewportRef.current ?? (document.getElementById("thread-viewport") as HTMLElement | null);
    if (!root) return;

    const onScroll = () => {
      if (!userIntentRef.current) {
        // 프로그램틱 스크롤(예: 포커스 이동, 프레임워크 내부 스크롤)은 무시
        return;
      }

      const now = root.scrollTop;
      const prev = lastScrollTopRef.current;
      lastScrollTopRef.current = now;

      const goingUp = now < prev;

      if (goingUp) {
        // 위로 올리면 즉시 락 + 오토스크롤 OFF
        if (!freezeRef.current) {
          freezeRef.current = true;
        }
        if (autoScrollRef.current) {
          autoScrollRef.current = false;
          setShouldAutoScroll(false);
        }
        return;
      }

      // 아래로 내려가는 중: '완전 하단' 도달했을 때만 락 해제 + 오토스크롤 ON
      if (isAtBottom(root)) {
        if (freezeRef.current) freezeRef.current = false;
        if (!autoScrollRef.current) {
          autoScrollRef.current = true;
          setShouldAutoScroll(true);
        }
      }
    };

    root.addEventListener("scroll", onScroll, { passive: true });

    // 초기 상태: 새 세션에선 바닥으로 맞춤
    lastScrollTopRef.current = root.scrollTop;
    try {
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    } catch {}

    return () => root.removeEventListener("scroll", onScroll);
  }, []);

  // ✅ 새 메시지 추가/삭제 시: 락이 해제되어 있고 + 오토스크롤 ON일 때만 하단 이동
  useEffect(() => {
    const list = messagesRootRef.current;
    const bottom = bottomRef.current;
    const root =
      viewportRef.current ?? (document.getElementById("thread-viewport") as HTMLElement | null);
    if (!list || !bottom || !root) return;

    const mo = new MutationObserver((muts) => {
      if (freezeRef.current || !autoScrollRef.current) return; // 잠겨있으면 무시
      if (!isAtBottom(root)) return;                           // 현재 바닥이 아니면 무시

      let scheduled = false;
      for (const m of muts) {
        if (m.type === "childList" && (m.addedNodes.length || m.removedNodes.length)) {
          if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(() => {
              try {
                bottom.scrollIntoView({ behavior: "smooth", block: "end" });
              } catch {}
              scheduled = false;
            });
          }
          break;
        }
      }
    });

    mo.observe(list, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  // ✅ 메시지 높이 변화(스트리밍 등) 시: 락 해제 + 바닥일 때만 미세 조정
  useEffect(() => {
    const list = messagesRootRef.current;
    const bottom = bottomRef.current;
    const root =
      viewportRef.current ?? (document.getElementById("thread-viewport") as HTMLElement | null);
    if (!list || !bottom || !root) return;

    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => {
      if (freezeRef.current || !autoScrollRef.current) return;
      if (!isAtBottom(root)) return;
      try {
        bottom.scrollIntoView({ behavior: "auto", block: "end" });
      } catch {}
    });

    ro.observe(list);
    return () => ro.disconnect();
  }, []);

  // ✅ 사용자가 명시적으로 "맨 아래" 버튼 클릭 → 락 해제 + 오토스크롤 ON + 하단 이동
  const onJumpBottom = useCallback(() => {
    freezeRef.current = false;
    autoScrollRef.current = true;
    setShouldAutoScroll(true);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  return (
    <ThreadPrimitive.Root
      className="bg-background box-border flex h-full flex-col overflow-hidden"
      style={{ ["--thread-max-width" as string]: "42rem" }}
    >
      <ThreadPrimitive.Viewport
        ref={setViewportRef}
        id="thread-viewport"
        className="flex h-full flex-col items-center overflow-y-scroll scroll-smooth bg-inherit px-4 pt-8"
      >
        <div aria-hidden className="fixed inset-0 -z-0 bg-cover bg-center bg-no-repeat" />
        <ThreadWelcome />

        {/* 메시지 목록 컨테이너 */}
        <div ref={messagesRootRef} className="w-full flex flex-col items-center">
          <ThreadPrimitive.Messages
            components={{
              UserMessage: UserMessage,
              EditComposer: EditComposer,
              AssistantMessage: AssistantMessage,
            }}
          />
        </div>

        <ThreadPrimitive.If empty={false}>
          <div className="min-h-8 flex-grow" />
        </ThreadPrimitive.If>

        {/* 하단 앵커 (유일한 바닥 기준) */}
        <div ref={bottomRef} id="chat-bottom-anchor" aria-hidden className="h-px" />

        <div className="sticky z-10 bottom-0 mt-3 flex w-full max-w-[var(--thread-max-width)] flex-col items-center justify-end rounded-t-lg bg-inherit pb-0">
          <ThreadScrollToBottom onJumpBottom={onJumpBottom} />
          <Composer />
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadScrollToBottom: FC<{ onJumpBottom: () => void }> = ({ onJumpBottom }) => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        onClick={onJumpBottom}
        tooltip="Scroll to bottom"
        variant="outline"
        className="absolute -top-8 rounded-full disabled:invisible"
        aria-label="Scroll to bottom"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <ThreadPrimitive.Empty>
      <div className="flex z-10 w-full max-w-[var(--thread-max-width)] flex-grow flex-col">
        <div className="flex w-full flex-grow flex-col items-center justify-center">
          <HelloLottie width={700} className="mb-15" />
        </div>
        <ThreadWelcomeSuggestions />
      </div>
    </ThreadPrimitive.Empty>
  );
};

const ThreadWelcomeSuggestions: FC = () => {
  return (
    <div className="mt-3 z-10 flex w-full items-stretch justify-center gap-4">
      <ThreadPrimitive.Suggestion
        className="bg-white hover:bg-muted/80 flex max-w-sm grow basis-0 flex-col items-center justify-center rounded-lg border p-3 transition-colors ease-in"
        prompt="Azure Managed ID 개념에 대해 설명해줘"
        method="replace"
        autoSend
      >
        <span className="line-clamp-2 text-ellipsis text-sm font-semibold">
          Azure Managed ID 개념에 대해 설명해줘
        </span>
      </ThreadPrimitive.Suggestion>
      <ThreadPrimitive.Suggestion
        className="hover:bg-muted/80 flex max-w-sm grow basis-0 flex-col items-center justify-center rounded-lg border bg-white p-3 transition-colors ease-in"
        prompt="챗봇 사용 방법 알려줘"
        method="replace"
        autoSend
      >
        <span className="line-clamp-2 text-ellipsis text-sm font-semibold">
          챗봇 사용 방법 알려줘
        </span>
      </ThreadPrimitive.Suggestion>
    </div>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="z-10 focus-within:border-ring/20 flex w-full flex-wrap items-end rounded-lg border bg-white bg-inherit px-2.5 shadow-sm transition-colors ease-in">
      <ComposerPrimitive.Input
        rows={1}
        autoFocus
        placeholder="무엇을 도와드릴까요?"
        className="placeholder:text-muted-foreground max-h-40 flex-grow resize-none border-none bg-transparent px-2 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
      />
      <ComposerAction />
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC = () => {
  return (
    <>
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send"
            variant="default"
            className="my-2.5 size-8 p-2 transition-opacity ease-in"
          >
            <SendHorizontalIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <TooltipIconButton
            tooltip="Cancel"
            variant="default"
            className="my-2.5 size-8 p-2 transition-opacity ease-in"
          >
            <CircleStopIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="z-10 grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 [&:where(>*)]:col-start-2 w-full max-w-[var(--thread-max-width)] py-4">
      <UserActionBar />
      <div className="bg-white text-foreground max-w-[calc(var(--thread-max-width)*0.8)] break-words rounded-3xl px-5 py-2.5 col-start-2 row-start-2">
        <MessagePrimitive.Content />
      </div>
      <BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="z-10 flex flex-col items-end col-start-1 row-start-2 mr-3 mt-2.5"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="bg-muted my-4 flex w-full max-w-[var(--thread-max-width)] flex-col gap-2 rounded-xl">
      <ComposerPrimitive.Input className="text-foreground flex h-8 w-full resize-none bg-transparent p-4 pb-0 outline-none" />
      <div className="mx-3 mb-3 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel asChild>
          <Button variant="ghost">Cancel</Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button>Send</Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] relative w-full max-w-[var(--thread-max-width)] py-4">
      <div className="text-foreground max-w-[calc(var(--thread-max-width)*0.8)] break-words leading-7 col-span-2 col-start-2 row-start-1 my-1.5">
        <MessagePrimitive.Content
          components={{
            Text: MarkdownText,
            tools: { Fallback: ToolFallback },
            Source: SourcePill,
          }}
        />
      </div>
      <AssistantActionBar />
      <BranchPicker className="col-start-2 row-start-2 -ml-2 mr-2" />
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="text-muted-foreground flex gap-1 col-start-3 row-start-2 -ml-1 data-[floating]:bg-background data-[floating]:absolute data-[floating]:rounded-md data-[floating]:border data-[floating]:p-1 data-[floating]:shadow-sm"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <MessagePrimitive.If copied>
            <CheckIcon />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn("text-muted-foreground inline-flex items-center text-xs", className)}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const CircleStopIcon = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <rect width="10" height="10" x="3" y="3" rx="2" />
    </svg>
  );
};
