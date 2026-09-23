import type { ReactNode } from "react";

export default function DesktopSettingsSection({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen || undefined} className="group border-b border-lumina-border/70 py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lumina-text [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-[15px] font-medium">{title}</span>
          <span className="mt-1 block truncate text-[12px] text-lumina-text-muted">{summary}</span>
        </span>
        <span className="shrink-0 text-[12px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4"><span className="group-open:hidden">Edit</span><span className="hidden group-open:inline">Close</span></span>
      </summary>
      <div className="mt-5 max-w-[760px] space-y-4 pb-2">{children}</div>
    </details>
  );
}
