import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-5 py-5">
        <Link href="/" className="font-medium">
          Lumina
        </Link>

        <Link href="/" className="text-sm hover:opacity-70">
          Back Home
        </Link>
      </header>

      <section className="mx-auto max-w-[760px] px-5 py-16 md:py-24">
        <p className="text-[12px] uppercase tracking-[0.14em] text-neutral-400">
          Contact
        </p>

        <h1
          className="mt-4 text-[48px] leading-[1.02] font-semibold md:text-[72px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Get in touch
        </h1>

        <p className="mt-8 text-[18px] leading-[1.7] text-neutral-700">
          Questions, feedback, partnerships, or support requests can be sent to:
        </p>

        <div className="mt-10 rounded-[24px] bg-[#faf6f5] p-6">
          <p className="text-[14px] uppercase tracking-[0.12em] text-neutral-400">
            Email
          </p>

          <p className="mt-3 text-[22px] font-medium">
            hello@joinlumina.co
          </p>
        </div>

        <p className="mt-8 text-[15px] text-neutral-500">
          Response times may vary during early beta testing.
        </p>
      </section>
    </main>
  );
}