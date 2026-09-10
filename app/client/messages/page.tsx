"use client";

import ClientWorkspaceShell from "@/components/ClientWorkspaceShell";
import RequestInbox from "@/components/RequestInbox";

export default function ClientMessagesPage() {
  return (
    <ClientWorkspaceShell>
      <RequestInbox role="client" />
    </ClientWorkspaceShell>
  );
}
