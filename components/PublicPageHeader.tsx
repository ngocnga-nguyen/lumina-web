import type { ReactNode } from "react";
import Link from "next/link";
import AccountMenu from "@/components/AccountMenu";

type PublicPageHeaderProps = {
  backHref: string;
  backLabel?: string;
  accountControl?: ReactNode;
  surface?: "soft" | "white";
};

export default function PublicPageHeader({
  backHref,
  backLabel = "Home",
  accountControl,
  surface = "soft",
}: PublicPageHeaderProps) {
  return (
    <header
      className={`border-b border-lumina-border ${
        surface === "white" ? "bg-lumina-surface" : "bg-lumina-bg-soft"
      }`}
    >
      <div className="grid h-[80px] w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-3 sm:px-4 lg:px-5 xl:px-6">
        <div className="min-w-0 justify-self-start">
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center whitespace-nowrap text-[14px] text-lumina-text-muted transition hover:text-lumina-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text"
          >
            <span aria-hidden="true">←</span>
            <span className="ml-1.5">{backLabel}</span>
          </Link>
        </div>

        <Link
          href="/"
          aria-label="Lumina home"
          className="justify-self-center text-[12px] font-medium uppercase tracking-[0.3em] text-lumina-text transition hover:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lumina-text"
        >
          Lumina
        </Link>

        <div className="min-w-0 justify-self-end">
          {accountControl ?? <AccountMenu />}
        </div>
      </div>
    </header>
  );
}
