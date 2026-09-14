"use client";

import { Suspense } from "react";
import ClientReviewsWorkspace from "@/components/ClientReviewsWorkspace";
import ClientWorkspaceShell from "@/components/ClientWorkspaceShell";

export default function ClientReviewsPage() {
  return (
    <ClientWorkspaceShell>
      <Suspense fallback={<div className="min-h-[40vh] bg-lumina-bg" />}>
        <ClientReviewsWorkspace />
      </Suspense>
    </ClientWorkspaceShell>
  );
}
