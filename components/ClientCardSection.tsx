"use client";

import { ChevronDown } from "lucide-react";

type ClientCardSectionProps = {
  id: string;
  title: string;
  icon: React.ReactNode;
  description?: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  variant?: "default" | "mobile";
};

export default function ClientCardSection({
  id,
  title,
  icon,
  description,
  collapsed,
  onToggle,
  children,
  variant = "default",
}: ClientCardSectionProps) {
  const contentId = `${id}-content`;

  return (
    <section className={`${variant === "mobile" ? "overflow-hidden border-y border-lumina-border/55 bg-lumina-surface" : "overflow-hidden rounded-[18px] border border-lumina-border/65 bg-lumina-surface/78 shadow-[0_8px_24px_rgba(39,36,40,0.025)] backdrop-blur-[10px]"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls={contentId}
        className={`flex w-full items-center justify-between gap-4 text-left transition hover:bg-lumina-surface-soft/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lumina-text ${variant === "mobile" ? "px-1 py-3" : "px-5 py-3.5"}`}
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center text-lumina-text ${variant === "mobile" ? "rounded-full bg-lumina-blush/35" : "rounded-[10px] border border-lumina-glass-border bg-lumina-blush/35"}`}>
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block text-[16px] font-semibold text-lumina-text">{title}</span>
            {description && (
              <span className="mt-0.5 block text-[11px] leading-[1.5] text-lumina-text-muted">
                {description}
              </span>
            )}
          </span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`shrink-0 text-lumina-text-muted transition-transform ${
            collapsed ? "-rotate-90" : "rotate-0"
          }`}
        />
      </button>
      {!collapsed && (
        <div id={contentId} className={`${variant === "mobile" ? "border-t border-lumina-border/35 px-1 py-4" : "border-t border-lumina-border/45 px-5 py-4 md:py-5"}`}>
          {children}
        </div>
      )}
    </section>
  );
}
