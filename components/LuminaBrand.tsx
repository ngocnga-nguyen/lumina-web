import Image from "next/image";

type LuminaBrandProps = {
  variant?: "wordmark" | "primary";
  className?: string;
  priority?: boolean;
};

export default function LuminaBrand({
  variant = "wordmark",
  className = "",
  priority = false,
}: LuminaBrandProps) {
  const isPrimary = variant === "primary";

  // Canonical full wordmark: matches the client/professional sidebar exactly.
  // Keep intrinsic glyph proportions; compact/collapsed shells retain their L.
  if (!isPrimary) return <span data-lumina-wordmark="full" className={className} style={{
    display: "inline-block", whiteSpace: "nowrap", fontFamily: "Georgia, Times New Roman, serif",
    fontSize: "18px", fontWeight: 600, letterSpacing: "0.12em", lineHeight: 1.5,
    color: "var(--lumina-text)",
  }}>LUMINA</span>;

  return (
    <Image
      src="/brand/lumina-primary.png"
      alt="Lumina"
      width={930}
      height={915}
      priority={priority}
      className={className}
    />
  );
}
