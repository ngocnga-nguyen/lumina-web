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

  return (
    <Image
      src={isPrimary ? "/brand/lumina-primary.png" : "/brand/lumina-wordmark.png"}
      alt="Lumina"
      width={isPrimary ? 930 : 890}
      height={isPrimary ? 915 : 170}
      priority={priority}
      className={className}
    />
  );
}
