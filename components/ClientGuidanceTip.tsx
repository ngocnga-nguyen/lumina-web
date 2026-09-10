"use client";

type ClientGuidanceTipProps = {
  title: string;
  children: React.ReactNode;
  onDismiss: () => void | Promise<unknown>;
  tone?: "default" | "review-ready";
  icon?: React.ReactNode;
};

export default function ClientGuidanceTip({
  title,
  children,
  onDismiss,
  tone = "default",
  icon,
}: ClientGuidanceTipProps) {
  return (
    <aside
      className={`flex flex-col gap-3 rounded-[18px] border px-4 py-3.5 text-lumina-text backdrop-blur-[10px] sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
        tone === "review-ready"
          ? "border-lumina-border bg-lumina-surface/85"
          : "border-lumina-glass-border bg-lumina-glass"
      }`}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 shrink-0 text-lumina-text-muted" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-lumina-text">{title}</p>
          <div className="mt-1 text-[12px] leading-[1.55] text-lumina-text-muted">
            {children}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void onDismiss()}
        className="shrink-0 self-start rounded-full border border-lumina-border bg-lumina-surface/70 px-3.5 py-2 text-[11px] text-lumina-text-muted transition hover:border-lumina-text-muted hover:text-lumina-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text sm:self-auto"
        aria-label={`Dismiss ${title}`}
      >
        Got it
      </button>
    </aside>
  );
}
