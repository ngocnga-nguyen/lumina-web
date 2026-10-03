// A mutation invalidates both reads already in flight and reads attempted during the write.
// This extends the sequence-ref pattern used by the notification hooks.
export function createRefreshGeneration() {
  let generation = 0;
  let mutations = 0;
  return {
    beginRead: () => mutations ? null : ++generation,
    isCurrent: (ticket: number | null) => ticket !== null && !mutations && ticket === generation,
    invalidate: () => { generation++; },
    beginMutation: () => {
      generation++; mutations++;
      let finished = false;
      return () => {
        if (finished) return;
        finished = true; mutations--; generation++;
      };
    },
  };
}
export async function mutateAndRefresh<T>(
  generation: ReturnType<typeof createRefreshGeneration>,
  mutate: () => Promise<T>,
  refresh: () => Promise<void>,
): Promise<T> {
  const finish = generation.beginMutation();
  try { return await mutate(); }
  finally { finish(); await refresh(); }
}
