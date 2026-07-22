"use client";
import { useState } from "react";
import ProposalBubble from "./ProposalBubble";
import MessageBubble from "./MessageBubble";

type ClientRequest = {
  id: string;
  artist_name: string | null;
  artist_image_url: string | null;
  artist_category: string | null;
  status: string | null;
  client_status: string | null;
  proposed_date: string | null;
  proposed_time: string | null;
  proposed_price: number | null;
  image_url: string | null;
};

type RequestUpdate = {
  id: string;
  request_id: string;
  sender_type: string;
  message: string | null;
  status: string | null;
  proposed_date: string | null;
  proposed_time: string | null;
  proposed_price: number | null;
  image_url: string | null;
  created_at: string;
  is_deleted: boolean | null;
};

type ChatModalProps = {
  request: ClientRequest;
  updates: RequestUpdate[];
  draft: string;
  onDraftChange: (value: string) => void;
  selectedImage: File | null;
onImageChange: (file: File | null) => void;
  onSend: () => void;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onRequestDifferentTime: () => void;
  currentUserType?: "client" | "artist";
  onDeleteMessage: (messageId: string) => void;
};

export default function ChatModal({
  request,
  updates,
  draft,
  onDraftChange,
  onSend,
  selectedImage,
onImageChange,
  onClose,
  onAccept,
  onDecline,
  onDeleteMessage,
  onRequestDifferentTime,
currentUserType = "client",
}: ChatModalProps) {
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="flex h-[84vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-full bg-neutral-100">
              {request.artist_image_url && (
                <img
                  src={request.artist_image_url}
                  alt={request.artist_name || "Artist"}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div>
              <p className="text-[16px] font-medium">
                {request.artist_name || "Artist"}
              </p>
              <p className="text-[13px] text-neutral-500">
                {request.artist_category || "Beauty Professional"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-[20px] leading-none transition hover:bg-neutral-200"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto bg-[#fbf7f6] px-5 py-6">
  {updates.length === 0 ? (
  <div className="flex h-full items-center justify-center">
  <div className="text-center">
    <p className="text-[15px] font-medium text-neutral-700">
      No messages yet
    </p>

    <p className="mt-1 text-[13px] text-neutral-400">
      Start the conversation with this artist.
    </p>
  </div>
</div>
) : (
  (() => {
    let lastDate = "";

    return updates.map((update) => {
      const isMe = update.sender_type === currentUserType;
      const canDelete = isMe && !update.is_deleted;
      const hasMessage = !!update.message;
      const currentDate = new Date(update.created_at).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      );

      const showDate = currentDate !== lastDate;
      lastDate = currentDate;

      return (
        <div key={update.id}>
          {showDate && (
            <div className="my-2 flex justify-center">
              <span className="rounded-full bg-white px-3 py-1 text-[11px] text-neutral-400 shadow-sm">
                {currentDate}
              </span>
            </div>
          )}

          <div
            className={`flex ${
              isMe ? "justify-end" : "justify-start"
            } ${isMe ? "" : "items-end gap-3"}`}
          >
            {!isMe && hasMessage && (
              <div className="h-9 w-9 overflow-hidden rounded-full bg-neutral-200">
                {request.artist_image_url && (
                  <img
                    src={request.artist_image_url}
                    alt={request.artist_name || "Artist"}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            )}

            <div

  onClick={() => {
  if (canDelete) {
    setActiveMessageId(update.id);
  } else {
    setActiveMessageId(null);
  }
}}

  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
>
              {canDelete && activeMessageId === update.id && (
  <div className="mb-1 flex justify-end">
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDeleteMessage(update.id);
        setActiveMessageId(null);
      }}
      className="rounded-full bg-white px-3 py-1 text-[11px] text-red-500 shadow-sm transition hover:bg-red-50"
    >
      Delete for everyone
    </button>
  </div>
)}

{update.is_deleted ? (
  <div className="rounded-[18px] bg-neutral-100 px-4 py-3 text-[13px] italic text-neutral-500">
    {isMe ? "You deleted this message." : "This message was deleted."}
  </div>
) : (
  <MessageBubble
    isMe={isMe}
    message={update.message}
    imageUrl={update.image_url}
    createdAt={update.created_at}
  />
)}

              {(update.proposed_date ||
                update.proposed_time ||
                update.proposed_price) && (
                <ProposalBubble
                  date={update.proposed_date}
                  time={update.proposed_time}
                  price={update.proposed_price}
                />
              )}
            </div>
          </div>
        </div>
      );
    });
  })()
)}
</div>

        <div className="border-t border-neutral-100 bg-white p-4">
          <div className="flex items-end gap-3">
            {selectedImage && (
  <div className="mb-3 rounded-[18px] bg-[#faf6f5] p-3">
    <div className="mb-2 flex items-center justify-between">
      <p className="max-w-[75%] truncate text-[13px] text-neutral-600">
        {selectedImage.name}
      </p>

      <button
        onClick={() => onImageChange(null)}
        className="text-[13px] text-neutral-500 hover:text-black"
      >
        Remove
      </button>
    </div>

    <img
      src={URL.createObjectURL(selectedImage)}
      alt="Selected preview"
      className="max-h-[180px] rounded-[14px] object-cover"
    />
  </div>
)}
            <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-[18px] transition hover:bg-[#faf6f5]">
  +
  <input
    type="file"
    accept="image/*"
    className="hidden"
    onChange={(e) => {
      onImageChange(e.target.files?.[0] || null);
    }}
  />
</label>
            <textarea
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder="Type a message..."
              rows={1}
              className="min-h-[44px] flex-1 resize-none rounded-[20px] border border-neutral-200 px-4 py-3 text-[14px] outline-none focus:border-black"
            />

            <button
              onClick={onSend}
              className="rounded-full bg-black px-5 py-3 text-[13px] text-white transition hover:bg-neutral-800"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}