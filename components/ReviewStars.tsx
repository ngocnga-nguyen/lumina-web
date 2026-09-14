"use client";

type ReviewStarsProps = {
  value: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
  size?: "compact" | "editor";
};

export default function ReviewStars({
  value,
  interactive = false,
  onChange,
  size = "compact",
}: ReviewStarsProps) {
  const stars = [1, 2, 3, 4, 5];

  if (interactive) {
    return (
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => onChange?.(star)}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-[25px] leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black ${
              star <= value ? "text-lumina-attention" : "text-lumina-border"
            }`}
          >
            ★
          </button>
        ))}
      </div>
    );
  }

  return (
    <span
      className={size === "editor" ? "text-[18px]" : "text-[13px]"}
      aria-label={`${value} out of 5 stars`}
    >
      <span className="text-lumina-attention">{"★".repeat(value)}</span>
      <span className="text-lumina-border">{"★".repeat(5 - value)}</span>
    </span>
  );
}
