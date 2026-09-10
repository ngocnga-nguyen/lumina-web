"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const historyEndRef = useRef<HTMLDivElement | null>(null);
  const canSend = Boolean(draft.trim() || selectedImage) && !isSending;
  const requestDate = formatRequestDate(context.requestDate);
  const initials = context.participantName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const imagePreviewUrl = useMemo(
    () => (selectedImage ? URL.createObjectURL(selectedImage) : null),
    [selectedImage]
  );

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ block: "end" });
  }, [context.requestId, updates.length]);

  const handleSend = async () => {
    if (!canSend) return;
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
      <header className="border-b border-lumina-border bg-lumina-surface/95 px-4 py-4 backdrop-blur md:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lumina-border text-lumina-text transition hover:bg-lumina-surface-soft lg:hidden"
                aria-label="Back to conversations"
              >
                <ArrowLeft size={18} strokeWidth={1.7} />
              </button>
            )}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lumina-pearl text-[12px] font-semibold text-lumina-text">
              {context.participantImageUrl ? (
                <img
                  src={context.participantImageUrl}
                  alt={context.participantName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials || "L"
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-lumina-text">
                {context.participantName}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-lumina-text-muted">
                {context.services.length > 0
                  ? context.services.join(" · ")
                  : context.participantSubtitle}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-lumina-text-muted">
                {requestDate && <span>Requested {requestDate}</span>}
                {context.stateLabel && (
                  <span className="rounded-full border border-lumina-border bg-lumina-surface-soft px-2 py-0.5 text-lumina-text">
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
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-lumina-text underline decoration-lumina-border underline-offset-4 sm:hidden"
          >
            View related request
            <ExternalLink size={13} strokeWidth={1.6} />
          </Link>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-lumina-bg-soft px-4 py-5 md:px-5 md:py-6">
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
                      isMe ? "justify-end" : "items-end justify-start gap-2.5"
                    }`}
                  >
                    {!isMe && hasMessage && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lumina-pearl text-[10px] font-semibold text-lumina-text">
                        {context.participantImageUrl ? (
                          <img
                            src={context.participantImageUrl}
                            alt={context.participantName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials || "L"
                        )}
                      </div>
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

      <footer className="border-t border-lumina-border bg-lumina-surface p-3 md:p-4">
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
        <div className="flex items-end gap-2.5 md:gap-3">
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
              placeholder="Type a message…"
              rows={1}
              className="min-h-11 w-full resize-none rounded-[20px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none placeholder:text-lumina-text-muted focus:border-lumina-black"
            />
            <p className="hidden pl-2 pt-1 text-[11px] text-lumina-text-muted md:block">
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
