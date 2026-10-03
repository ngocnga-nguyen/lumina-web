"use client";
import { useEffect, useState } from "react";

// Kept outside the Today feature flag so historical notification links stay explicit.
export default function ReminderNotificationNotice() {
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setUnavailable(new URLSearchParams(window.location.search).get("reminder") === "unavailable"), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return unavailable ? <p role="status" className="my-4 text-[13px]">That reminder is no longer available. You can find your private notes in Clients.</p> : null;
}
