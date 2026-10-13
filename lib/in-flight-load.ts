// Share only pending work. A settled response must never cache an account/session.
export function createInFlightRead<T>(read: () => Promise<T>) {
  let pending: Promise<T> | undefined;
  const shared = () => {
    if (pending) return pending;
    const request = Promise.resolve().then(read);
    pending = request;
    const clear = () => { if (pending === request) pending = undefined; };
    void request.then(clear, clear);
    return request;
  };
  shared.invalidate = () => { pending = undefined; };
  return shared;
}

// Bound a route read even if an SDK promise never settles. Late work sees an aborted signal.
export async function withReadDeadline<T>(
  read: (signal: AbortSignal) => Promise<T>,
  controller: AbortController,
  timeoutMs = 15_000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: () => void = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    onAbort = () => reject(controller.signal.reason ?? new Error("Read cancelled"));
    controller.signal.addEventListener("abort", onAbort, { once: true });
    if (controller.signal.aborted) onAbort();
    else timer = setTimeout(() => controller.abort(new Error("Read timed out. Please retry.")), timeoutMs);
  });
  try { return await Promise.race([interrupted, Promise.resolve().then(() => { controller.signal.throwIfAborted(); return read(controller.signal); })]); }
  finally {
    clearTimeout(timer);
    controller.signal.removeEventListener("abort", onAbort);
  }
}

// Supabase may emit SIGNED_IN again on focus. Invalidate identity changes, not that repeat.
export function createSessionReadInvalidator(invalidate: () => void) {
  let accountId: string | null | undefined;
  return (event: string, nextId: string | null) => {
    if (event !== "INITIAL_SESSION" &&
      (event === "SIGNED_OUT" || event === "USER_UPDATED" || nextId !== accountId)) invalidate();
    accountId = nextId;
  };
}
