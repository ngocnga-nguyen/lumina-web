"use client";

import { useEffect, useEffectEvent } from "react";
import { getProfessionalActionTarget, professionalActionEvent, type ProfessionalActionSurface, type ProfessionalActionTarget } from "./professional-action-targets";
import styles from "./professional-action-focus.module.css";

// Only presentation: open existing editors, then focus a whitelisted rendered control.
export function useProfessionalActionTarget(surface: ProfessionalActionSurface, ready: boolean, onOpen: (target: ProfessionalActionTarget) => void) {
  const open = useEffectEvent(onOpen);
  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    let timer = 0;
    let highlighted: HTMLElement | null = null;
    const clear = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      highlighted?.classList.remove(styles.highlight);
      highlighted?.removeAttribute("data-action-highlight");
    };
    const arrive = (event?: Event) => {
      const search = event instanceof CustomEvent && typeof event.detail === "string" ? event.detail : window.location.search;
      const target = getProfessionalActionTarget(search, surface);
      clear();
      if (!target) return;
      open(target);
      const deadline = performance.now() + 1500;
      const focus = () => {
        const control = Array.from(document.querySelectorAll<HTMLElement>(`[data-professional-focus="${target}"]`)).find((element) => {
          // Exclude the other responsive editor, even when its details are collapsed.
          for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
            if (getComputedStyle(parent).display === "none" || parent.hidden) return false;
          }
          return true;
        });
        if (!control) {
          if (performance.now() < deadline) frame = requestAnimationFrame(focus);
          return;
        }
        for (let parent = control.parentElement; parent; parent = parent.parentElement) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
        }
        control.classList.add(styles.target);
        control.focus({ preventScroll: true });
        control.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
        // Restart a repeated same-page arrival without moving or replacing the control.
        void control.offsetWidth;
        control.classList.add(styles.highlight);
        control.setAttribute("data-action-highlight", "true");
        highlighted = control;
        timer = window.setTimeout(clear, 1800);
      };
      frame = requestAnimationFrame(focus);
    };
    arrive();
    window.addEventListener(professionalActionEvent, arrive);
    window.addEventListener("popstate", arrive);
    return () => {
      clear();
      window.removeEventListener(professionalActionEvent, arrive);
      window.removeEventListener("popstate", arrive);
    };
  }, [ready, surface]);
}
