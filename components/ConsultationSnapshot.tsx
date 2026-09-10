import {
  getConsultationMaintenanceLabel,
  parseConsultationSnapshot,
} from "@/lib/consultation-snapshot";

type ConsultationSnapshotProps = {
  snapshot: unknown;
  imageUrls?: string[];
  compact?: boolean;
};

export default function ConsultationSnapshot({
  snapshot: snapshotValue,
  imageUrls = [],
  compact = false,
}: ConsultationSnapshotProps) {
  const snapshot = parseConsultationSnapshot(snapshotValue);
  if (!snapshot) return null;

  return (
    <section
      className={`mt-5 bg-lumina-surface ${
        compact
          ? "border-t border-lumina-border/80 pt-4"
          : "rounded-[20px] border border-lumina-border p-5"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[16px] font-medium text-lumina-text">
          Consultation Snapshot
        </h3>
        <p className="text-[11px] text-lumina-text-muted">
          Submitted with the original request
        </p>
      </div>

      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${
          compact ? "mt-3 gap-4" : "mt-4 gap-5"
        }`}
      >
        {snapshot.goal && (
          <div className="md:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">
              Client is looking for
            </p>
            <p className="mt-1.5 whitespace-pre-line text-[14px] leading-[1.6] text-lumina-text">
              {snapshot.goal}
            </p>
          </div>
        )}

        {imageUrls.length > 0 && (
          <div className="md:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">
              Inspiration
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {imageUrls.map((url, index) => (
                <img
                  key={url}
                  src={url}
                  alt={`Consultation inspiration ${index + 1}`}
                  className="aspect-[4/3] w-full rounded-[14px] border border-lumina-border object-cover"
                />
              ))}
            </div>
          </div>
        )}

        {snapshot.avoid && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">
              Wants to avoid
            </p>
            <p className="mt-1.5 whitespace-pre-line text-[14px] leading-[1.6] text-lumina-text">
              {snapshot.avoid}
            </p>
          </div>
        )}

        {snapshot.maintenance && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">
              Maintenance
            </p>
            <p className="mt-1.5 text-[14px] text-lumina-text">
              {getConsultationMaintenanceLabel(snapshot.maintenance)}
            </p>
          </div>
        )}

        {snapshot.budget && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">
              Budget
            </p>
            <p className="mt-1.5 text-[14px] text-lumina-text">
              {snapshot.budget}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
