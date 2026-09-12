"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ProfessionalWorkspaceProfile = {
  id: string;
  name: string;
  category: string;
  profile_image_url: string | null;
};

type ProfessionalWorkspaceValue = {
  professional: ProfessionalWorkspaceProfile;
  requestActionCount: number;
  requestIssueCount: number;
  messageUnreadCount: number;
};

const ProfessionalWorkspaceContext =
  createContext<ProfessionalWorkspaceValue | null>(null);

export function ProfessionalWorkspaceProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ProfessionalWorkspaceValue;
}) {
  return (
    <ProfessionalWorkspaceContext.Provider value={value}>
      {children}
    </ProfessionalWorkspaceContext.Provider>
  );
}

export function useProfessionalWorkspace() {
  const value = useContext(ProfessionalWorkspaceContext);

  if (!value) {
    throw new Error(
      "useProfessionalWorkspace must be used inside ProfessionalDashboardShell."
    );
  }

  return value;
}
