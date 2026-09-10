import PublicPageHeader from "@/components/PublicPageHeader";

export default function PrivacyPage() {
  return (
    <main data-lumina-public-page className="min-h-screen bg-lumina-surface text-lumina-text">
      <PublicPageHeader backHref="/" />

      <section className="mx-auto max-w-[820px] px-5 py-16 md:py-24">
        <p className="text-[12px] uppercase tracking-[0.14em] text-lumina-text-muted">
          Privacy Policy
        </p>

        <h1
          className="mt-4 text-[44px] leading-[1.02] font-semibold md:text-[68px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Your privacy matters
        </h1>

        <div className="mt-10 space-y-8 text-[16px] leading-[1.8] text-lumina-text">
          <div>
            <h2 className="text-[20px] font-semibold text-lumina-text">
              Information we collect
            </h2>

            <p className="mt-3">
              Lumina may collect account information such as names, email
              addresses, profile details, portfolio images, and professional
              business information.
            </p>
          </div>

          <div>
            <h2 className="text-[20px] font-semibold text-lumina-text">
              How information is used
            </h2>

            <p className="mt-3">
              Information is used to create profiles, improve the platform,
              support discovery features, and help clients connect with beauty
              professionals.
            </p>
          </div>

          <div>
            <h2 className="text-[20px] font-semibold text-lumina-text">
              Profile visibility
            </h2>

            <p className="mt-3">
              Beauty professionals can control whether their profile is publicly
              visible through their dashboard settings.
            </p>
          </div>

          <div>
            <h2 className="text-[20px] font-semibold text-lumina-text">
              Early beta notice
            </h2>

            <p className="mt-3">
              Lumina is currently in an early beta stage. Features and policies
              may continue evolving as the platform develops.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
