"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  professionalVerificationStatusLabels,
  type ProfessionalLicenseVerificationStatus,
} from "@/lib/professional-license-verification";

type VerificationQueueItem = {
  artist_id: string;
  professional_name: string;
  legal_professional_name: string;
  business_name: string | null;
  license_number: string;
  license_jurisdiction: string;
  license_type: string;
  status: ProfessionalLicenseVerificationStatus;
  submitted_at: string;
  updated_at: string;
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  decision_message: string | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusClasses(status: ProfessionalLicenseVerificationStatus) {
  if (status === "verified") {
    return "border-lumina-success/25 bg-lumina-success-soft text-lumina-success";
  }
  if (status === "rejected") {
    return "border-lumina-attention/35 bg-lumina-attention-soft text-lumina-attention";
  }
  return "border-lumina-border bg-lumina-surface-soft text-lumina-text-muted";
}

export default function LicenseVerificationAdminPage() {
  const router = useRouter();
  const [items, setItems] = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [workingArtistId, setWorkingArtistId] = useState<string | null>(null);
  const [correctionArtistId, setCorrectionArtistId] = useState<string | null>(null);
  const [correctionMessage, setCorrectionMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadQueue = async () => {
    const { data, error } = await supabase.rpc(
      "get_professional_license_verification_queue"
    );

    if (error) {
      setErrorMessage(error.message || "The verification queue could not be loaded.");
      return;
    }

    setItems(Array.isArray(data) ? (data as VerificationQueueItem[]) : []);
  };

  useEffect(() => {
    const authorizeAndLoad = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: isAdmin, error } = await supabase.rpc("is_lumina_admin");

      if (error || !isAdmin) {
        router.replace("/");
        return;
      }

      setAuthorized(true);
      await loadQueue();
      setLoading(false);
    };

    void authorizeAndLoad();
  }, [router]);

  const saveDecision = async (
    item: VerificationQueueItem,
    decision: "verify" | "reject"
  ) => {
    const correction = correctionMessage.trim();

    if (decision === "reject" && !correction) {
      setErrorMessage("Add a correction message before marking Needs correction.");
      return;
    }

    if (
      decision === "verify" &&
      !window.confirm(
        `Verify the submitted professional license details for ${item.professional_name}?`
      )
    ) {
      return;
    }

    setWorkingArtistId(item.artist_id);
    setErrorMessage("");
    const { error } = await supabase.rpc(
      "moderate_professional_license_verification",
      {
        p_artist_id: item.artist_id,
        p_decision: decision,
        p_correction_message: decision === "reject" ? correction : null,
      }
    );

    if (error) {
      setErrorMessage(error.message || "The verification decision could not be saved.");
      setWorkingArtistId(null);
      return;
    }

    setCorrectionArtistId(null);
    setCorrectionMessage("");
    await loadQueue();
    setWorkingArtistId(null);
  };

  const visibleItems = items.filter(
    (item) => filter === "all" || item.status === "pending"
  );

  if (loading || !authorized) {
    return (
      <main className="min-h-screen bg-lumina-bg px-5 py-12 text-lumina-text">
        <p className="mx-auto max-w-[1280px] text-[14px] text-lumina-text-muted">
          Checking verification access…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-lumina-bg text-lumina-text">
      <header className="border-b border-lumina-border bg-lumina-glass px-5 py-4 backdrop-blur-[10px] md:px-8">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-5">
          <Link href="/" className="text-[13px] text-lumina-text-muted transition hover:text-lumina-text">
            ← Lumina
          </Link>
          <nav className="flex items-center gap-4 text-[12px] text-lumina-text-muted" aria-label="Admin moderation">
            <Link href="/admin/reviews" className="transition hover:text-lumina-text">
              Reviews
            </Link>
            <Link href="/admin/verifications" className="font-medium text-lumina-text">
              <span className="hidden sm:inline">License verification</span>
              <span className="sm:hidden">Licenses</span>
            </Link>
          </nav>
          <button
            type="button"
            onClick={() => void loadQueue()}
            className="text-[13px] text-lumina-text-muted transition hover:text-lumina-text"
          >
            Refresh
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-[1280px] px-5 py-10 md:px-8 md:py-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-lumina-text-muted">
              Professional trust
            </p>
            <h1
              className="mt-3 text-[38px] leading-[1.05] md:text-[50px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              License verification
            </h1>
            <p className="mt-3 max-w-[700px] text-[14px] leading-[1.7] text-lumina-text-muted">
              Review submitted professional-license details manually. Verification
              makes no identity, insurance, background, or quality claim.
            </p>
          </div>

          <div className="flex w-fit rounded-full border border-lumina-border bg-lumina-surface p-1">
            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`rounded-full px-4 py-2 text-[12px] transition ${
                filter === "pending" ? "bg-lumina-black text-white" : "text-lumina-text-muted"
              }`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full px-4 py-2 text-[12px] transition ${
                filter === "all" ? "bg-lumina-black text-white" : "text-lumina-text-muted"
              }`}
            >
              All submissions
            </button>
          </div>
        </div>

        {errorMessage && (
          <p role="alert" className="mt-6 rounded-[16px] border border-lumina-attention/30 bg-lumina-attention-soft px-4 py-3 text-[13px] text-lumina-attention">
            {errorMessage}
          </p>
        )}

        {visibleItems.length === 0 ? (
          <div className="mt-8 rounded-[22px] border border-lumina-border bg-lumina-surface p-7">
            <p className="text-[15px] text-lumina-text">No verification submissions here.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {visibleItems.map((item) => (
              <article
                key={item.artist_id}
                className="rounded-[24px] border border-lumina-border bg-lumina-surface p-5 md:p-7"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-[20px] font-medium">{item.professional_name}</h2>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${statusClasses(item.status)}`}>
                        {professionalVerificationStatusLabels[item.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-lumina-text-muted">
                      Submitted {formatDateTime(item.submitted_at)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void saveDecision(item, "verify")}
                      disabled={workingArtistId === item.artist_id}
                      className="rounded-full bg-lumina-black px-5 py-2.5 text-[12px] text-white transition hover:bg-lumina-text disabled:opacity-50"
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCorrectionArtistId(item.artist_id);
                        setCorrectionMessage(item.decision_message || "");
                        setErrorMessage("");
                      }}
                      disabled={workingArtistId === item.artist_id}
                      className="rounded-full border border-lumina-text-muted/35 bg-lumina-surface px-5 py-2.5 text-[12px] text-lumina-text transition hover:border-lumina-text-muted disabled:opacity-50"
                    >
                      Needs correction
                    </button>
                  </div>
                </div>

                <dl className="mt-6 grid grid-cols-1 gap-5 border-t border-lumina-border pt-6 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-lumina-text-muted">Submitted professional name</dt>
                    <dd className="mt-1 text-lumina-text">{item.legal_professional_name}</dd>
                  </div>
                  <div>
                    <dt className="text-lumina-text-muted">Business name</dt>
                    <dd className="mt-1 text-lumina-text">{item.business_name || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt className="text-lumina-text-muted">License number</dt>
                    <dd className="mt-1 break-words font-medium text-lumina-text">{item.license_number}</dd>
                  </div>
                  <div>
                    <dt className="text-lumina-text-muted">Jurisdiction / state</dt>
                    <dd className="mt-1 text-lumina-text">{item.license_jurisdiction}</dd>
                  </div>
                  <div>
                    <dt className="text-lumina-text-muted">License type</dt>
                    <dd className="mt-1 text-lumina-text">{item.license_type}</dd>
                  </div>
                  <div>
                    <dt className="text-lumina-text-muted">Last reviewed</dt>
                    <dd className="mt-1 text-lumina-text">{formatDateTime(item.last_reviewed_at)}</dd>
                  </div>
                </dl>

                {correctionArtistId === item.artist_id && (
                  <div className="mt-6 rounded-[18px] border border-lumina-attention/30 bg-lumina-attention-soft p-4">
                    <label>
                      <span className="text-[12px] font-medium text-lumina-attention">
                        Correction message
                      </span>
                      <textarea
                        value={correctionMessage}
                        onChange={(event) => setCorrectionMessage(event.target.value)}
                        maxLength={1000}
                        rows={4}
                        placeholder="Explain what the professional needs to correct before resubmitting."
                        className="mt-3 w-full resize-none rounded-[14px] border border-lumina-attention/35 bg-lumina-surface px-4 py-3 text-[13px] leading-[1.6] outline-none focus:border-lumina-text-muted"
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setCorrectionArtistId(null);
                          setCorrectionMessage("");
                        }}
                        className="rounded-full border border-lumina-text-muted/35 bg-lumina-surface px-4 py-2 text-[12px] text-lumina-text-muted"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveDecision(item, "reject")}
                        disabled={workingArtistId === item.artist_id || !correctionMessage.trim()}
                        className="rounded-full bg-lumina-black px-5 py-2 text-[12px] text-white disabled:opacity-50"
                      >
                        Save Needs correction
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
