import PublicPageHeader from "@/components/PublicPageHeader";

export default function ContactPage() {
  return (
    <main data-lumina-public-page className="min-h-screen bg-lumina-surface text-lumina-text">
      <PublicPageHeader backHref="/" />

      <section className="mx-auto max-w-[760px] px-5 py-16 md:py-24">
        <p className="text-[12px] uppercase tracking-[0.14em] text-lumina-text-muted">
          Contact
        </p>

        <h1
          className="mt-4 text-[48px] leading-[1.02] font-semibold md:text-[72px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Get in touch
        </h1>

        <p className="mt-8 text-[18px] leading-[1.7] text-lumina-text">
          Questions, feedback, partnerships, or support requests can be sent to:
        </p>

        <div className="mt-10 rounded-[24px] bg-lumina-surface-soft p-6">
          <p className="text-[14px] uppercase tracking-[0.12em] text-lumina-text-muted">
            Email
          </p>

          <p className="mt-3 text-[22px] font-medium">
            hello@joinlumina.co
          </p>
        </div>

        <p className="mt-8 text-[15px] text-lumina-text-muted">
          Response times may vary during early beta testing.
        </p>
      </section>
    </main>
  );
}
