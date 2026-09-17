"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

type Props = {
  title: string;
  detail?: string;
  onClick?: () => void;
  href?: string;
  trailing?: ReactNode;
  disabled?: boolean;
};

export default function MobileSettingsRow({ title, detail, onClick, href, trailing, disabled }: Props) {
  const content = (
    <>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[14px] font-medium text-lumina-text">{title}</span>
        {detail && <span className="mt-0.5 block truncate text-[12px] text-lumina-text-muted">{detail}</span>}
      </span>
      {trailing || <ChevronRight size={16} className="shrink-0 text-lumina-text-muted/70" aria-hidden="true" />}
    </>
  );
  const className = "flex min-h-14 w-full items-center gap-3 border-b border-lumina-border/70 py-2.5 text-left transition last:border-b-0 hover:bg-lumina-surface-soft/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text-muted disabled:opacity-50";
  if (href) return <a href={href} className={className}>{content}</a>;
  return <button type="button" onClick={onClick} disabled={disabled} className={className}>{content}</button>;
}
