"use client";

import { CalendarDays } from "lucide-react";
import { formatDurationMinutes } from "@/lib/request-services";

type ProposalBubbleProps = {
  date: string | null;
  time: string | null;
  price: number | null;
  services: string[];
  expectedEndAt?: string | null;
};

export default function ProposalBubble({
  date,
  time,
  price,
  services,
  expectedEndAt,
}: ProposalBubbleProps) {
  const proposedStart =
    date && time ? new Date(`${date.slice(0, 10)}T${time}`) : null;
  const expectedEnd = expectedEndAt ? new Date(expectedEndAt) : null;
  const durationMinutes =
    proposedStart &&
    expectedEnd &&
    !Number.isNaN(proposedStart.getTime()) &&
    !Number.isNaN(expectedEnd.getTime())
      ? Math.round((expectedEnd.getTime() - proposedStart.getTime()) / 60_000)
      : null;
  return (
    <div className="mt-3 max-w-[245px] rounded-[22px]
border border-lumina-border
bg-lumina-surface
px-5 py-4 shadow-sm">
      <p className="text-[10px] uppercase tracking-[0.18em] text-lumina-text-muted">
        Artist Proposal
      </p>

      {services.length > 0 && (
        <div className="mt-3 border-b border-lumina-border pb-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-lumina-text-muted">
            Services
          </p>
          <div className="mt-1.5 space-y-1">
            {services.map((serviceName) => (
              <p key={serviceName} className="text-[12px] leading-[1.4] text-lumina-text">
                {serviceName}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-start gap-3">
        <CalendarDays
          size={18}
          strokeWidth={1.8}
          className="mt-0.5 text-lumina-text-muted"
        />

        <div>
          <p className="text-[15px] font-medium text-lumina-text">
            {date
              ? new Date(date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              : "Flexible date"}
          </p>

          <p className="mt-0.5 text-[13px] text-lumina-text-muted">
            {time
              ? new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "Flexible time"}
          </p>
          {expectedEnd && !Number.isNaN(expectedEnd.getTime()) && (
            <p className="mt-1 text-[12px] leading-[1.45] text-lumina-text-muted">
              {formatDurationMinutes(durationMinutes) || "Estimated duration"}
              {" · Ends "}
              {expectedEnd.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-lumina-border pt-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-lumina-text-muted">
          Final proposed total
        </p>

        <p className="mt-0.5 text-[16px] font-medium text-lumina-text">
          {price ? `$${price}` : "—"}
        </p>
      </div>
    </div>
  );
}
