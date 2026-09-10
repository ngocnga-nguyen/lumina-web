export function createRealtimeChannelTopic(baseTopic: string) {
  const instanceId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return `${baseTopic}-${instanceId}`;
}
