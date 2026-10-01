"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { professionalActionEvent } from "@/lib/professional-action-targets";

export default function ProfessionalActionLink({ href, className, children }: {
  href: string; className?: string; children: ReactNode;
}) {
  const router = useRouter();
  return <Link href={href} scroll={href.includes("focus=") ? false : undefined} className={className} onClick={(event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const destination = new URL(href, window.location.origin);
    if (!destination.searchParams.has("focus")) return;
    if (destination.origin !== window.location.origin || destination.pathname !== window.location.pathname) return;
    // Next can preserve the page for same-page navigation, including the exact same URL.
    event.preventDefault();
    router.push(href, { scroll: false });
    window.dispatchEvent(new CustomEvent(professionalActionEvent, { detail: destination.search }));
  }}>{children}</Link>;
}
