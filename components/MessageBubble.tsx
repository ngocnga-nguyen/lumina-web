"use client";

type MessageBubbleProps = {
  isMe: boolean;
  message: string | null;
  imageUrl?: string | null;
  createdAt: string;
  otherParticipantLabel?: string;
};

export default function MessageBubble({
  isMe,
message,
imageUrl,
createdAt,
otherParticipantLabel = "Professional",
}: MessageBubbleProps) {

  return (
    <div
      className={`inline-block max-w-[320px] rounded-[22px] px-4 py-2.5 text-[14px] leading-[1.45] ${
        isMe
          ? "rounded-br-[6px] bg-lumina-black text-white"
          : "rounded-bl-[6px] bg-lumina-surface text-lumina-text shadow-sm"
      }`}
    >
{imageUrl && (
  <img
    src={imageUrl}
    alt="Message attachment"
    className="mb-2 max-h-[260px] rounded-[16px] object-cover"
  />
)}

{message && (
  <p className="whitespace-pre-wrap break-words">{message}</p>
)}
      <p
        className={`mt-2 text-[11px] ${
          isMe ? "text-white/50" : "text-lumina-text-muted"
        }`}
      >
        {isMe ? "You" : otherParticipantLabel} ·{" "}
        {new Date(createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
