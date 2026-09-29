"use client";

import { useEffect } from "react";
import { CLIENT_CONVERSATION_VIEW_EVENT, registerViewedClientConversation } from "@/lib/notification-reconciliation";

export function useViewedClientConversation(userId: string | null | undefined, requestId: string | null) {
  useEffect(() => {
    if (!userId || !requestId) return;
    const unregister = registerViewedClientConversation(userId, requestId);
    window.dispatchEvent(new Event(CLIENT_CONVERSATION_VIEW_EVENT));
    return unregister;
  }, [requestId, userId]);
}
