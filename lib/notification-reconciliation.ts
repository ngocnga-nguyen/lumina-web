export type NotificationReadResult = {
  data?: Array<{ id: string }> | null;
  error: { message: string } | null;
};

// Recounts with unchanged rows must not repeatedly retrigger destination acknowledgement effects.
export function preserveNotificationSnapshot<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const unchanged = current.length === incoming.length && incoming.every((row, index) => {
    const previous = current[index];
    const keys = Object.keys(row) as Array<keyof T>;
    return keys.length === Object.keys(previous).length && keys.every((key) => row[key] === previous[key]);
  });
  return unchanged ? current : incoming;
}

// Never infer a successful read from a click. Failed writes reconcile with storage.
export async function confirmNotificationRead(
  persist: () => Promise<NotificationReadResult>,
  reload: () => Promise<void>,
): Promise<NotificationReadResult> {
  let result: NotificationReadResult;
  try {
    result = await persist();
  } catch (error) {
    result = { error: { message: error instanceof Error ? error.message : "Notifications could not be updated." } };
  }
  if (result.error) {
    try { await reload(); } catch { /* Keep the original write error available. */ }
  }
  return result;
}

const viewedConversations = new Map<symbol, { userId: string; requestId: string }>();
export const CLIENT_CONVERSATION_VIEW_EVENT = "lumina:client-conversation-viewed";

// Transient viewport context only; never an unread/read-state authority.
export function registerViewedClientConversation(userId: string, requestId: string) {
  const token = Symbol();
  viewedConversations.set(token, { userId, requestId });
  return () => { viewedConversations.delete(token); };
}

export function shouldAcknowledgeViewedMessage(
  notification: { user_id: string; request_id: string | null; title: string; is_read: boolean | null },
  userId: string,
  visible: boolean,
) {
  return visible && notification.user_id === userId && !notification.is_read &&
    notification.title === "New Message" && [...viewedConversations.values()].some(
      (view) => view.userId === userId && view.requestId === notification.request_id,
    );
}
