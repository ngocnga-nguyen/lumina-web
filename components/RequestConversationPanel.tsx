"use client";

import Link from "next/link";
import IdentityAvatar from "@/components/IdentityAvatar";
import { ArrowLeft, ExternalLink, ImagePlus, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import MessageBubble from "@/components/MessageBubble";
import ProposalBubble from "@/components/ProposalBubble";
import type {
  RequestConversationRole,
  RequestConversationUpdate,
} from "@/lib/request-conversations";

export type RequestConversationContext = {
  requestId: string;
  participantName: string;
  participantImageUrl: string | null;
  participantSubtitle: string;
  services: string[];
  requestDate?: string | null;
  stateLabel?: string | null;
  relatedRequestHref?: string | null;
};

type RequestConversationPanelProps = {
  context: RequestConversationContext;
  updates: RequestConversationUpdate[];
  currentUserType: RequestConversationRole;
  draft: string;
  selectedImage: File | null;
  onDraftChange: (value: string) => void;
  onImageChange: (file: File | null) => void;
  onSend: () => void | Promise<void>;
  onDeleteMessage: (messageId: string) => void | Promise<void>;
  onBack?: () => void;
  onClose?: () => void;
};

function formatRequestDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RequestConversationPanel({
  context,
  updates,
  currentUserType,
  draft,
  selectedImage,
  onDraftChange,
  onImageChange,
  onSend,
  onDeleteMessage,
  onBack,
  onClose,
}: RequestConversationPanelProps) {
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const historyViewportRef = useRef<HTMLDivElement | null>(null);
  const historyEndRef = useRef<HTMLDivElement | null>(null);
  const shouldFollowLatestRef = useRef(true);
  const canSend = Boolean(draft.trim() || selectedImage) && !isSending;
  const requestDate = formatRequestDate(context.requestDate);
  const imagePreviewUrl = useMemo(
    () => (selectedImage ? URL.createObjectURL(selectedImage) : null),
    [selectedImage]
  );

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      historyEndRef.current?.scrollIntoView({ block: "end", behavior });
    },
    []
  );

  useEffect(() => {
    shouldFollowLatestRef.current = true;
    const frame = window.requestAnimationFrame(() => scrollToLatest());
    return () => window.cancelAnimationFrame(frame);
  }, [context.requestId, scrollToLatest]);

  useEffect(() => {
    if (!shouldFollowLatestRef.current) return;
    const frame = window.requestAnimationFrame(() => scrollToLatest());
    return () => window.cancelAnimationFrame(frame);
  }, [scrollToLatest, updates.length]);

  useEffect(() => {
    if (!shouldFollowLatestRef.current) return;
    const frame = window.requestAnimationFrame(() => scrollToLatest());
    return () => window.cancelAnimationFrame(frame);
  }, [scrollToLatest, selectedImage]);

  useLayoutEffect(() => {
    const input = messageInputRef.current;
    if (!input) return;

    input.style.height = "auto";
    const maxHeight = 116;
    const nextHeight = Math.min(input.scrollHeight, maxHeight);
    input.style.height = `${nextHeight}px`;
    input.style.overflowY = input.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [draft]);

  const handleSend = async () => {
    if (!canSend) return;
    shouldFollowLatestRef.current = true;
    setIsSending(true);
    try {
      await onSend();
    } finally {
      setIsSending(false);
      requestAnimationFrame(() => messageInputRef.current?.focus());
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-lumina-surface">
      <header className="z-10 shrink-0 border-b border-lumina-border/80 bg-lumina-surface/95 px-3.5 py-2.5 backdrop-blur md:px-5 md:py-3 lg:border-lumina-border lg:py-4">
        <div className="flex items-start justify-between gap-2.5 lg:gap-3">
          <div className="flex min-w-0 items-start gap-2.5 lg:gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lumina-text transition hover:bg-lumina-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text lg:hidden"
                aria-label="Back to conversations"
              >
                <ArrowLeft size={18} strokeWidth={1.7} />
              </button>
            )}
            <IdentityAvatar
              name={context.participantName}
              imageUrl={context.participantImageUrl}
              className="flex h-10 w-10 shrink-0 rounded-full bg-lumina-pearl text-[11px] font-semibold text-lumina-text md:h-11 md:w-11 md:text-[12px]"
            />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-lumina-text">
                {context.participantName}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-lumina-text-muted">
                {context.services.length > 0
                  ? context.services.join(" · ")
                  : context.participantSubtitle}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-lumina-text-muted md:mt-1.5 md:text-[11px] lg:mt-2 lg:gap-x-3">
                {requestDate && (
                  <span className="hidden sm:inline">Requested {requestDate}</span>
                )}
                {context.stateLabel && (
                  <span className="rounded-full border border-lumina-border/80 bg-lumina-surface-soft px-2 py-0.5 text-lumina-text">
                    {context.stateLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {context.relatedRequestHref && (
              <Link
                href={context.relatedRequestHref}
                className="hidden items-center gap-1.5 rounded-full border border-lumina-border bg-lumina-surface px-3 py-2 text-[11px] font-medium text-lumina-text transition hover:bg-lumina-surface-soft sm:flex"
              >
                View request
                <ExternalLink size={13} strokeWidth={1.6} />
              </Link>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-lumina-pearl text-lumina-text-muted transition hover:bg-lumina-surface-soft hover:text-lumina-text"
                aria-label="Close conversation"
              >
                <X size={18} strokeWidth={1.7} />
              </button>
            )}
          </div>
        </div>
        {context.relatedRequestHref && (
          <Link
            href={context.relatedRequestHref}
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-normal text-lumina-text-muted transition hover:text-lumina-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text sm:hidden"
          >
            View related request
            <ExternalLink size={13} strokeWidth={1.6} />
          </Link>
        )}
      </header>

      <div
        ref={historyViewportRef}
        onScroll={() => {
          const viewport = historyViewportRef.current;
          if (!viewport) return;
          const distanceFromBottom =
            viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
          shouldFollowLatestRef.current = distanceFromBottom < 96;
        }}
        className="min-h-0 flex-1 space-y-4 overscroll-contain overflow-y-auto bg-lumina-bg-soft px-3.5 py-4 [scrollbar-gutter:stable] md:space-y-5 md:px-5 md:py-6"
      >
        {updates.length === 0 ? (
          <div className="flex min-h-full items-center justify-center py-10">
            <div className="max-w-[280px] text-center">
              <p className="text-[15px] font-medium text-lumina-text">
                No messages yet
              </p>
              <p className="mt-1 text-[13px] leading-[1.5] text-lumina-text-muted">
                Start a request-linked conversation with {context.participantName}.
              </p>
            </div>
          </div>
        ) : (
          (() => {
            let lastDate = "";
            return updates.map((update) => {
              const isMe = update.sender_type === currentUserType;
              const canDelete = isMe && !update.is_deleted;
              const hasMessage = !!update.message || !!update.image_url;
              const currentDate = new Date(update.created_at).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", year: "numeric" }
              );
              const showDate = currentDate !== lastDate;
              lastDate = currentDate;

              return (
                <div key={update.id}>
                  {showDate && (
                    <div className="my-2 flex justify-center">
                      <span className="rounded-full border border-lumina-border/70 bg-lumina-surface/90 px-3 py-1 text-[11px] text-lumina-text-muted">
                        {currentDate}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex ${
                      isMe ? "justify-end" : "items-end justify-start gap-2"
                    }`}
                  >
                    {!isMe && hasMessage && (
                      <IdentityAvatar
                        name={context.participantName}
                        imageUrl={context.participantImageUrl}
                        className="flex h-7 w-7 shrink-0 rounded-full bg-lumina-pearl text-[9px] font-semibold text-lumina-text md:h-8 md:w-8 md:text-[10px]"
                      />
                    )}

                    <div
                      className={`flex flex-col ${
                        isMe ? "items-end" : "items-start"
                      }`}
                      onClick={() =>
                        setActiveMessageId(canDelete ? update.id : null)
                      }
                    >
                      {canDelete && activeMessageId === update.id && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void onDeleteMessage(update.id);
                            setActiveMessageId(null);
                          }}
                          className="mb-1 rounded-full bg-lumina-surface px-3 py-1 text-[11px] text-lumina-attention shadow-sm transition hover:bg-lumina-attention-soft"
                        >
                          Delete for everyone
                        </button>
                      )}

                      {update.is_deleted ? (
                        <div className="rounded-[18px] bg-lumina-pearl px-4 py-3 text-[13px] italic text-lumina-text-muted">
                          {isMe
                            ? "You deleted this message."
                            : "This message was deleted."}
                        </div>
                      ) : hasMessage ? (
                        <MessageBubble
                          isMe={isMe}
                          message={update.message}
                          imageUrl={update.image_url}
                          createdAt={update.created_at}
                          otherParticipantLabel={context.participantName}
                        />
                      ) : null}

                      {(update.proposed_date ||
                        update.proposed_time ||
                        update.proposed_price != null) && (
                        <ProposalBubble
                          date={update.proposed_date}
                          time={update.proposed_time}
                          price={update.proposed_price}
                          services={context.services}
                          expectedEndAt={update.expected_end_at}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            });
          })()
        )}
        <div ref={historyEndRef} />
      </div>

      <footer className="shrink-0 border-t border-lumina-border/80 bg-lumina-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-4 md:pb-[max(1rem,env(safe-area-inset-bottom))] md:pt-4 lg:border-lumina-border lg:p-4">
        {selectedImage && imagePreviewUrl && (
          <div className="mb-3 max-w-[260px] rounded-[16px] border border-lumina-border bg-lumina-surface-soft p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="truncate text-[12px] text-lumina-text-muted">
                {selectedImage.name}
              </p>
              <button
                type="button"
                onClick={() => onImageChange(null)}
                className="text-[12px] text-lumina-text-muted hover:text-lumina-black"
              >
                Remove
              </button>
            </div>
            <img
              src={imagePreviewUrl}
              alt="Selected message attachment"
              className="max-h-[140px] rounded-[12px] object-cover"
            />
          </div>
        )}
        <div className="flex items-end gap-2 md:gap-3">
          <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-lumina-border bg-lumina-surface text-lumina-text transition hover:bg-lumina-surface-soft focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-lumina-text">
            <ImagePlus size={18} strokeWidth={1.6} />
            <span className="sr-only">Add an image</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) =>
                onImageChange(event.target.files?.[0] || null)
              }
            />
          </label>
          <div className="min-w-0 flex-1">
            <textarea
              ref={messageInputRef}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing &&
                  !isTouchDevice
                ) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              onFocus={() => {
                if (!shouldFollowLatestRef.current) return;
                window.setTimeout(() => scrollToLatest(), 120);
              }}
              placeholder="Type a message…"
              rows={1}
              className="block min-h-11 max-h-[116px] w-full resize-none rounded-[20px] border border-lumina-border bg-lumina-surface px-3.5 py-[11px] text-[14px] leading-[20px] text-lumina-text outline-none placeholder:text-lumina-text-muted focus:border-lumina-black md:px-4"
            />
            <p className="hidden pl-2 pt-1 text-[11px] text-lumina-text-muted lg:block">
              Enter to send · Shift + Enter for a new line
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className="min-h-11 rounded-full bg-lumina-black px-4 py-2.5 text-[13px] font-medium text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:bg-lumina-pearl disabled:text-lumina-text-muted md:px-5"
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        </div>
      </footer>
    </section>
  );
}
