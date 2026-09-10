"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, ExternalLink, MoreHorizontal, RotateCcw } from "lucide-react";

type ProfessionalClientRowMenuProps = {
  clientName: string;
  archived: boolean;
  changing: boolean;
  onOpen: () => void;
  onArchiveChange: (archived: boolean) => Promise<void>;
};

const MENU_WIDTH = 208;
const MENU_HEIGHT = 108;

export default function ProfessionalClientRowMenu({
  clientName,
  archived,
  changing,
  onOpen,
  onArchiveChange,
}: ProfessionalClientRowMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const closeForOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const closeForEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const closeForViewportChange = () => setOpen(false);

    document.addEventListener("pointerdown", closeForOutsidePress);
    document.addEventListener("keydown", closeForEscape);
    window.addEventListener("resize", closeForViewportChange);
    window.addEventListener("scroll", closeForViewportChange, true);

    const firstAction = menuRef.current?.querySelector<HTMLButtonElement>("button");
    firstAction?.focus();

    return () => {
      document.removeEventListener("pointerdown", closeForOutsidePress);
      document.removeEventListener("keydown", closeForEscape);
      window.removeEventListener("resize", closeForViewportChange);
      window.removeEventListener("scroll", closeForViewportChange, true);
    };
  }, [open]);

  const toggleMenu = () => {
    if (open) {
      setOpen(false);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const left = Math.min(
      Math.max(12, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - 12
    );
    const fitsBelow = rect.bottom + 8 + MENU_HEIGHT <= window.innerHeight - 12;
    const top = fitsBelow
      ? rect.bottom + 8
      : Math.max(12, rect.top - MENU_HEIGHT - 8);

    setPosition({ top, left });
    setOpen(true);
  };

  const runArchiveAction = async () => {
    setOpen(false);
    await onArchiveChange(!archived);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`More actions for ${clientName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggleMenu}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-lumina-text-muted transition hover:border-lumina-border hover:bg-lumina-surface-soft hover:text-lumina-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text-muted"
      >
        <MoreHorizontal aria-hidden="true" size={20} strokeWidth={1.8} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={`Actions for ${clientName}`}
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            className="fixed z-[80] rounded-[16px] border border-lumina-glass-border bg-lumina-glass p-1.5 text-lumina-text shadow-[0_12px_34px_rgba(17,17,17,0.1)] backdrop-blur-[14px]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpen();
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-[11px] px-3 text-left text-[13px] font-medium transition hover:bg-lumina-surface-soft focus-visible:bg-lumina-surface-soft focus-visible:outline-none"
            >
              <ExternalLink aria-hidden="true" size={16} strokeWidth={1.7} />
              Open client
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={changing}
              onClick={() => void runArchiveAction()}
              className="flex min-h-11 w-full items-center gap-3 rounded-[11px] px-3 text-left text-[13px] font-medium transition hover:bg-lumina-surface-soft focus-visible:bg-lumina-surface-soft focus-visible:outline-none disabled:cursor-wait disabled:opacity-55"
            >
              {archived ? (
                <RotateCcw aria-hidden="true" size={16} strokeWidth={1.7} />
              ) : (
                <Archive aria-hidden="true" size={16} strokeWidth={1.7} />
              )}
              {changing
                ? archived
                  ? "Restoring…"
                  : "Archiving…"
                : archived
                  ? "Restore client"
                  : "Archive client"}
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
