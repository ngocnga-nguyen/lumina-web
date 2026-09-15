"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, History } from "lucide-react";
import ProfessionalClientRowMenu from "@/components/ProfessionalClientRowMenu";
import IdentityAvatar from "@/components/IdentityAvatar";
import {
  type ProfessionalClientSummary,
} from "@/lib/professional-client-list";

type ProfessionalClientsMobileListProps = {
  clients: ProfessionalClientSummary[];
  changingClientId: string | null;
  onOpen: (clientId: string) => void;
  onArchiveChange: (clientId: string, archived: boolean) => Promise<void>;
};

function formatMobileClientDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const sameYear = parsed.getFullYear() === new Date().getFullYear();
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" as const }),
  });
}

function getClientContext(client: ProfessionalClientSummary) {
  if (client.nextAppointment) {
    return {
      label: "Upcoming",
      service: client.nextAppointmentService || "Confirmed appointment",
      date: formatMobileClientDate(client.nextAppointment) || "Date pending",
      time: client.nextAppointmentTime,
      icon: CalendarDays,
    };
  }

  if (client.lastVisit) {
    return {
      label: "Most recent visit",
      service: client.lastService || "Completed service",
      date: formatMobileClientDate(client.lastVisit) || "Completed",
      time: null,
      icon: History,
    };
  }

  return {
    label: "Latest request",
    service: client.newestRequestService || "New client relationship",
    date: client.newestRequestTimestamp
      ? new Date(client.newestRequestTimestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "No service history yet",
    time: null,
    icon: CalendarDays,
  };
}

export default function ProfessionalClientsMobileList({
  clients,
  changingClientId,
  onOpen,
  onArchiveChange,
}: ProfessionalClientsMobileListProps) {
  return (
    <div className="divide-y divide-lumina-border/55 border-y border-lumina-border/55 lg:hidden">
      {clients.map((client) => {
        const context = getClientContext(client);
        const ContextIcon = context.icon;

        return (
          <article key={client.clientId} className="relative bg-lumina-surface">
            <Link
              href={`/dashboard/clients/${client.clientId}`}
              aria-label={`Open ${client.name}'s Client Card`}
              className="group flex min-h-[96px] items-center gap-3 py-3.5 pr-[78px] transition hover:bg-lumina-surface-soft/55 focus-visible:bg-lumina-blush/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lumina-text-muted"
            >
              <IdentityAvatar
                name={client.name}
                imageUrl={client.profileImageUrl}
                className="flex h-11 w-11 shrink-0 rounded-full bg-lumina-pearl/75 text-[13px] font-semibold tracking-[0.04em] text-lumina-text ring-1 ring-inset ring-lumina-border/55"
              />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-lumina-text">
                  {client.name}
                </span>
                <span className="mt-1 block truncate text-[13px] leading-[1.4] text-lumina-text">
                  {context.service}
                </span>
                <span className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-[1.35] text-lumina-text-muted">
                  <ContextIcon size={13} strokeWidth={1.7} aria-hidden="true" />
                  <span className="shrink-0 font-medium text-lumina-text-muted">
                    {context.label}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">
                    {context.date}{context.time ? ` · ${context.time}` : ""}
                  </span>
                </span>
              </span>

              <ChevronRight
                size={17}
                strokeWidth={1.6}
                aria-hidden="true"
                className="shrink-0 text-lumina-text-muted transition-transform group-hover:translate-x-0.5"
              />
            </Link>

            <div className="absolute right-7 top-3 z-[2]">
              <ProfessionalClientRowMenu
                clientName={client.name}
                archived={!!client.archivedAt}
                changing={changingClientId === client.clientId}
                onOpen={() => onOpen(client.clientId)}
                onArchiveChange={(archived) =>
                  onArchiveChange(client.clientId, archived)
                }
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
