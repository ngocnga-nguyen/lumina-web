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
      className={`inline-block w-fit rounded-[20px] px-3.5 py-2.5 text-[14px] leading-[1.45] md:rounded-[22px] md:px-4 lg:max-w-[320px] ${
        isMe
          ? "max-w-[min(78vw,300px)] rounded-br-[6px] bg-lumina-black text-white md:max-w-[320px]"
          : "max-w-[min(74vw,286px)] rounded-bl-[6px] bg-lumina-surface text-lumina-text shadow-sm md:max-w-[300px]"
      }`}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Message attachment"
          className="mb-2 h-auto max-h-[min(42dvh,260px)] w-auto max-w-full rounded-[14px] object-contain md:rounded-[16px] md:object-cover"
        />
      )}

      {message && <p className="whitespace-pre-wrap break-words">{message}</p>}
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
