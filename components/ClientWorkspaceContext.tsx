"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  isClientActionNotification,
  type ClientNotification,
  type ClientNotificationReadKind,
} from "@/lib/client-notifications";

type ClientWorkspaceValue = {
  requestActionCount: number;
  requestIssueCount: number;
  reviewReadyCount: number;
  messageUnreadCount: number;
  notifications: ClientNotification[];
  acknowledgeNotifications: (input: {
    notificationId?: string;
    requestId?: string;
    kind?: ClientNotificationReadKind;
  }) => Promise<{ error: { message: string } | null }>;
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

export function hasUnreadClientActionNotification(
  notifications: ClientNotification[],
  requestId: string
) {
  return notifications.some(
    (notification) =>
      notification.request_id === requestId &&
      !notification.is_read &&
      isClientActionNotification(notification)
  );
}
