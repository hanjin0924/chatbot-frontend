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

/** '완전 하단' 근접 여부(약간만 위여도 false) */
function isAtBottom(el: HTMLElement, epsilon = 2) {
  const gap = el.scrollHeight - el.clientHeight - el.scrollTop;
  return gap <= epsilon;
}

export const Thread: FC = () => {
  /** UI 노출용 오토스크롤 상태 */
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  /** 내부 상태 Ref */
  const autoScrollRef = useRef(true);           // shouldAutoScroll 최신값 미러
  const freezeRef = useRef(false);              // 사용자가 위로 올리면 true, 바닥 복귀/버튼 전까지 유지
  const programmaticScrollRef = useRef(false);  // 우리가 만든 스크롤 이벤트는 무시

  /** DOM Ref */
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesRootRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  /** viewport ref setter */
  const setViewportRef: RefCallback<HTMLDivElement> = (el) => {
    viewportRef.current = el;
  };

  /** 상태 ↔ ref 동기화 */
  useEffect(() => {
    autoScrollRef.current = shouldAutoScroll;
  }, [shouldAutoScroll]);

  /** 안전한 하단 이동(우리가 만든 스크롤임을 표시) */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const anchor = bottomRef.current;
    if (!anchor) return;
    programmaticScrollRef.current = true;
    try {
      anchor.scrollIntoView({ behavior, block: "end" });
    } finally {
      requestAnimationFrame(() => {
        programmaticScrollRef.current = false;
      });
    }
  }, []);

  /** 첫 진입 시 하단 정렬 */
  useEffect(() => {
    scrollToBottom("auto");
  }, [scrollToBottom]);

  /** 스크롤 이벤트: 바닥 이탈 시 즉시 freeze, 바닥 복귀 시 해제 */
  useEffect(() => {
    const root =
      viewportRef.current ?? (document.getElementById("thread-viewport") as HTMLElement | null);
    if (!root) return;

    const onScroll = () => {
      // 프로그래매틱 스크롤은 판정에서 제외
      if (programmaticScrollRef.current) return;

      const atBottom = isAtBottom(root);

      if (!atBottom) {
        // 바닥에서 벗어났다면 즉시 잠금 + 오토스크롤 OFF
        if (!freezeRef.current) freezeRef.current = true;
        if (autoScrollRef.current) {
          autoScrollRef.current = false;
          setShouldAutoScroll(false);
        }
        return;
      }

      // 바닥 복귀 → 잠금 해제 및 오토스크롤 ON
      if (freezeRef.current) {
        freezeRef.current = false;
      }
      if (!autoScrollRef.current) {
        autoScrollRef.current = true;
        setShouldAutoScroll(true);
      }
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, []);

  /** 새 메시지 추가/삭제 → 잠금 아닐 때만 하단 이동 */
  useEffect(() => {
    const list = messagesRootRef.current;
    const root =
      viewportRef.current ?? (document.getElementById("thread-viewport") as HTMLElement | null);
    if (!list || !root) return;

    const mo = new MutationObserver((muts) => {
      if (freezeRef.current || !autoScrollRef.current) return;
      if (!isAtBottom(root)) return;

      // 실제 DOM 변경이 있을 때만 수행
      let changed = false;
      for (const m of muts) {
        if (m.type === "childList" && (m.addedNodes.length || m.removedNodes.length)) {
          changed = true;
          break;
        }
      }
      if (!changed) return;

      scrollToBottom("smooth");
    });

    mo.observe(list, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [scrollToBottom]);

  /** 메시지 높이 변화(스트리밍 등) → 잠금 아닐 때만 미세 보정 */
  useEffect(() => {
    const list = messagesRootRef.current;
    const root =
      viewportRef.current ?? (document.getElementById("thread-viewport") as HTMLElement | null);
    if (!list || !root) return;

    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => {
      if (freezeRef.current || !autoScrollRef.current) return;
      if (!isAtBottom(root)) return;
      scrollToBottom("auto");
    });

    ro.observe(list);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  /** "맨 아래" 버튼: 잠금 해제 + 하단 이동 */
  const onJumpBottom = useCallback(() => {
    freezeRef.current = false;
    if (!autoScrollRef.current) {
      autoScrollRef.current = true;
      setShouldAutoScroll(true);
    }
    scrollToBottom("smooth");
  }, [scrollToBottom]);

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

        {/* 유일한 바닥 기준 앵커 */}
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
