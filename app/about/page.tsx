import PublicPageHeader from "@/components/PublicPageHeader";

export default function AboutPage() {
  return (
    <main data-lumina-public-page className="min-h-screen bg-lumina-surface text-lumina-text">
      <PublicPageHeader backHref="/" />

      <section className="mx-auto max-w-[900px] px-5 py-16 md:py-24">
        <p className="text-[12px] uppercase tracking-[0.14em] text-lumina-text-muted">
          About Lumina
        </p>

        <h1
          className="mt-4 text-[48px] leading-[1.02] font-semibold md:text-[76px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Beauty discovery
          <br />
          built around trust
        </h1>

        <p className="mt-8 max-w-[720px] text-[20px] leading-[1.7] text-lumina-text">
          Lumina is a beauty discovery platform designed to help clients
          explore beauty professionals with more clarity before booking.
        </p>

        <p className="mt-6 max-w-[720px] text-[17px] leading-[1.8] text-lumina-text-muted">
          Instead of relying only on social media, Lumina focuses on cleaner
          professional profiles, portfolio work, pricing transparency,
          availability, and trust signals that help clients feel more confident
          about who they choose.
        </p>

        <p className="mt-6 max-w-[720px] text-[17px] leading-[1.8] text-lumina-text-muted">
          Our goal is to create a platform where beauty professionals can grow
          their visibility while clients can compare artists more clearly and
          discover professionals that truly match their style and needs.
        </p>
      </section>
    </main>
  );
}
