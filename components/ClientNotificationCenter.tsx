"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getClientNotificationDestination,
  type ClientNotification,
  type ClientNotificationReadKind,
  type ClientNotificationRequest,
} from "@/lib/client-notifications";

type ClientNotificationCenterProps = {
  notifications: ClientNotification[];
  requestsById: Record<string, ClientNotificationRequest>;
  unreadCount: number;
  error: string | null;
  onAcknowledge: (input: {
    notificationId?: string;
    requestId?: string;
    kind?: ClientNotificationReadKind;
  }) => Promise<{ error: { message: string } | null }>;
  onClearAll: () => Promise<void>;
};

export default function ClientNotificationCenter({
  notifications,
  requestsById,
  unreadCount,
  error,
  onAcknowledge,
  onClearAll,
}: ClientNotificationCenterProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const openNotification = async (notification: ClientNotification) => {
    const request = notification.request_id
      ? requestsById[notification.request_id]
      : undefined;
    const destination = getClientNotificationDestination(notification, request);

    if (!notification.is_read) {
      await onAcknowledge({ notificationId: notification.id });
    }

    setOpen(false);
    router.push(destination);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface transition hover:bg-lumina-blush/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
      >
        <Bell size={18} strokeWidth={1.7} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-lumina-black px-1 text-[10px] text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          className="absolute right-0 top-12 z-50 w-[min(320px,calc(100vw-24px))] rounded-[22px] border border-lumina-border bg-lumina-surface p-4 shadow-xl"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-[15px] font-medium">Notifications</p>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Clear all notifications?")) {
                    void onClearAll();
                  }
                }}
                className="text-[12px] text-lumina-text-muted transition hover:text-lumina-black"
              >
                Clear all
              </button>
            )}
          </div>

          {error && (
            <p className="mt-3 text-[11px] text-lumina-attention" role="status">
              {error}
            </p>
          )}

          <div className="mt-4 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <p className="py-2 text-[13px] text-lumina-text-muted">
                No notifications yet.
              </p>
            ) : (
              notifications.map((notification) => {
                const request = notification.request_id
                  ? requestsById[notification.request_id]
                  : undefined;
                const artistName = request?.artist_name || "Your professional";
                const artistImage = request?.artist_image_url;
                const message =
                  notification.title === "New Message"
                    ? `${artistName} sent you a message.`
                    : notification.title === "New Proposal"
                      ? `${artistName} sent you a proposal.`
                      : notification.title === "Proposal Updated"
                        ? `${artistName} updated your proposal.`
                        : notification.title === "Appointment Completed"
                          ? `Your service with ${artistName} is ready for a verified review.`
                          : notification.message;

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void openNotification(notification)}
                    className={`flex w-full gap-3 rounded-[16px] p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black ${
                      notification.is_read
                        ? "bg-lumina-surface text-lumina-text-muted hover:bg-lumina-surface-soft"
                        : "bg-lumina-blush/60 text-lumina-text hover:bg-lumina-blush/75"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lumina-pearl text-[12px] font-medium">
                      {artistImage ? (
                        <img
                          src={artistImage}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        artistName.charAt(0).toUpperCase()
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium">
                        {artistName}
                      </span>
                      <span className="mt-0.5 block text-[13px] font-medium text-lumina-text">
                        {notification.title}
                      </span>
                      {message && (
                        <span className="mt-1 block text-[12px] leading-[1.45]">
                          {message}
                        </span>
                      )}
                      <span className="mt-1.5 block text-[10px]">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}
