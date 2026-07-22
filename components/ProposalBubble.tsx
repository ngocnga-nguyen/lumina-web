"use client";

import { CalendarDays } from "lucide-react";

type ProposalBubbleProps = {
  date: string | null;
  time: string | null;
  price: number | null;
};

export default function ProposalBubble({
  date,
  time,
  price,
}: ProposalBubbleProps) {
  return (
    <div className="mt-3 max-w-[245px] rounded-[22px]
border border-neutral-200
bg-white
px-5 py-4 shadow-sm">
      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
        Artist Proposal
      </p>

      <div className="mt-3 flex items-start gap-3">
        <CalendarDays
          size={18}
          strokeWidth={1.8}
          className="mt-0.5 text-neutral-400"
        />

        <div>
          <p className="text-[15px] font-medium text-neutral-900">
            {date
              ? new Date(date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              : "Flexible date"}
          </p>

          <p className="mt-0.5 text-[13px] text-neutral-500">
            {time
              ? new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "Flexible time"}
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-neutral-100 pt-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          Estimate
        </p>

        <p className="mt-0.5 text-[16px] font-medium text-neutral-900">
          {price ? `$${price}` : "—"}
        </p>
      </div>
    </div>
  );
}