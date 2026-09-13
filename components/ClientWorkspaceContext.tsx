"use client";

import { createContext, useContext, type ReactNode } from "react";

type ClientWorkspaceValue = {
  requestActionCount: number;
  requestIssueCount: number;
  reviewReadyCount: number;
  messageUnreadCount: number;
};

const ClientWorkspaceContext = createContext<ClientWorkspaceValue | null>(null);

export function ClientWorkspaceProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ClientWorkspaceValue;
}) {
  return (
    <ClientWorkspaceContext.Provider value={value}>
      {children}
    </ClientWorkspaceContext.Provider>
  );
}

export function useClientWorkspace() {
  const value = useContext(ClientWorkspaceContext);

  if (!value) {
    throw new Error(
      "useClientWorkspace must be used inside ClientWorkspaceShell."
    );
  }

  return value;
}
