export type MessageUnreadRole = "client" | "artist";

export type MessageUnreadRow = {
  sender_type: string;
  is_read_by_client: boolean | null;
  is_read_by_artist: boolean | null;
  is_deleted: boolean | null;
};

export function isIncomingUnreadMessage(
  update: MessageUnreadRow,
  role: MessageUnreadRole
) {
  const readColumn =
    role === "client" ? "is_read_by_client" : "is_read_by_artist";

  return (
    !update.is_deleted &&
    update.sender_type !== role &&
    update[readColumn] === false
  );
}

export function getIncomingUnreadMessageCount(
  updates: MessageUnreadRow[],
  role: MessageUnreadRole
) {
  return updates.filter((update) => isIncomingUnreadMessage(update, role)).length;
}

export function applyDatabaseConfirmedReadCount(
  currentCount: number,
  markedReadCount: number
) {
  return Math.max(0, currentCount - Math.max(0, markedReadCount));
}
