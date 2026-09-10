"use client";

import { useCallback, useEffect, useState } from "react";

const WORKSPACE_SIDEBAR_STORAGE_KEY =
  "lumina:workspace-sidebar-collapsed";

type SidebarPreferenceSetter = (
  value: boolean | ((current: boolean) => boolean)
) => void;

export function useWorkspaceSidebarPreference(): [
  boolean,
  SidebarPreferenceSetter,
] {
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    try {
      const storedPreference = window.localStorage.getItem(
        WORKSPACE_SIDEBAR_STORAGE_KEY
      );

      if (storedPreference === "true" || storedPreference === "false") {
        setCollapsedState(storedPreference === "true");
      }
    } catch {
      // Local persistence is optional; the workspace remains usable without it.
    }
  }, []);

  const setCollapsed = useCallback<SidebarPreferenceSetter>((value) => {
    setCollapsedState((current) => {
      const next = typeof value === "function" ? value(current) : value;

      try {
        window.localStorage.setItem(
          WORKSPACE_SIDEBAR_STORAGE_KEY,
          String(next)
        );
      } catch {
        // Local persistence is optional; retain the in-memory preference.
      }

      return next;
    });
  }, []);

  return [collapsed, setCollapsed];
}
