import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import LuminaBrand from "@/components/LuminaBrand";

const serif = { fontFamily: "Georgia, Times New Roman, serif" };

const clientSteps = [
  {
    icon: Search,
    number: "01",
    title: "Discover",
    body: "Browse professionals by service, location, starting price, portfolio, and reviews.",
  },
  {
    icon: Sparkles,
    number: "02",
    title: "Compare",
    body: "Save options and compare the details that matter before making a decision.",
  },
  {
    icon: MessageCircle,
    number: "03",
    title: "Send a request",
    body: "Share the service, preferred timing, inspiration, and questions with the professional.",
  },
  {
    icon: CalendarCheck,
    number: "04",
    title: "Review the proposal",
    body: "The professional responds with timing, estimated price, and next booking steps.",
  },
  {
    icon: CheckCircle2,
    number: "05",
    title: "Complete the service",
    body: "After the appointment, the assigned professional marks the service complete in Lumina.",
  },
  {
    icon: Star,
    number: "06",
    title: "Share a verified review",
    body: "Only the client connected to that completed appointment can leave its verified review.",
  },
];

const professionalSteps = [
  "Build a clear profile with services, starting prices, availability, and examples of your work.",
  "Receive organized client requests instead of piecing details together across messages.",
  "Respond with a proposal, communicate with the client, and share the next booking step.",
  "Mark completed services and build a reputation through appointment-linked reviews.",
];

export default function HowItWorksPage() {
  return (
    <main data-lumina-public-page className="min-h-screen bg-lumina-surface text-lumina-text">
      <header className="border-b border-lumina-border bg-lumina-bg-soft">
        <div className="grid h-[76px] w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-3 sm:px-4 lg:px-5 xl:px-6">
          <Link href="/" aria-label="Lumina home" className="block w-[116px] justify-self-start sm:w-[132px]">
            <LuminaBrand variant="wordmark" priority className="h-auto w-full" />
          </Link>

          <nav className="hidden items-center gap-7 justify-self-center text-[14px] md:flex">
            <Link href="/browse" className="transition hover:text-lumina-attention">Browse</Link>
            <Link href="/browse/map" className="transition hover:text-lumina-attention">Map</Link>
            <span className="text-lumina-attention">How it works</span>
          </nav>

          <div className="flex items-center justify-self-end gap-2 sm:gap-3">
            <Link href="/login" className="hidden rounded-full bg-lumina-black px-4 py-2 text-sm text-white transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2 sm:inline-flex">
              Log in
            </Link>
            <Link href="/signup" className="rounded-full border border-lumina-border bg-lumina-surface px-4 py-2 text-sm transition-colors duration-200 hover:border-lumina-black hover:bg-lumina-black hover:text-white focus-visible:border-lumina-black focus-visible:bg-lumina-black focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1180px] px-5 pb-16 pt-16 text-center sm:px-8 sm:pt-24">
        <p className="text-xs uppercase tracking-[0.28em] text-lumina-attention">Clarity at every step</p>
        <h1 style={serif} className="mx-auto mt-5 max-w-[780px] text-[52px] leading-[0.98] sm:text-[68px] lg:text-[72px]">
          How Lumina works
        </h1>
        <p className="mx-auto mt-6 max-w-[680px] text-[17px] leading-7 text-lumina-text-muted sm:text-[19px]">
          Lumina helps clients discover beauty professionals, discuss the details, and build trust before committing to an appointment.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/browse" className="inline-flex items-center justify-center gap-2 rounded-full bg-lumina-black px-7 py-3.5 text-sm text-white">
            Explore professionals <ArrowRight size={16} />
          </Link>
          <Link href="/join-as-artist" className="inline-flex items-center justify-center rounded-full border border-lumina-border bg-lumina-surface px-7 py-3.5 text-sm transition-colors duration-200 hover:border-lumina-black hover:bg-lumina-black hover:text-white focus-visible:border-lumina-black focus-visible:bg-lumina-black focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2">
            Join as a professional
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 pb-20 sm:px-8">
        <div className="overflow-hidden rounded-[28px] border border-lumina-glass-border bg-lumina-glass p-6 backdrop-blur-[12px] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="text-left">
              <p className="text-xs uppercase tracking-[0.24em] text-lumina-attention">Quick walkthrough</p>
              <h2 style={serif} className="mt-4 text-[36px] leading-tight sm:text-[48px]">
                See the journey before you begin.
              </h2>
              <p className="mt-5 max-w-[520px] leading-7 text-lumina-text-muted">
                Step-by-step video guides are coming during private beta. The complete flow you can use today is outlined below.
              </p>
            </div>
            <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-lumina-border bg-lumina-surface p-8 text-center sm:min-h-[340px]">
              <div>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-lumina-border bg-transparent text-lumina-text-muted">
                  <Sparkles size={27} />
                </div>
                <p style={serif} className="mt-5 text-2xl">Lumina walkthroughs</p>
                <p className="mt-2 text-sm leading-6 text-lumina-text-muted">Short client and professional videos will live here.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-lumina-border bg-lumina-surface py-20">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
          <div className="max-w-[650px]">
            <p className="text-xs uppercase tracking-[0.24em] text-lumina-attention">For clients</p>
            <h2 style={serif} className="mt-4 text-[40px] leading-tight sm:text-[54px]">From discovery to a trusted review.</h2>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clientSteps.map(({ icon: Icon, number, title, body }) => (
              <article key={number} className="rounded-[20px] border border-lumina-border bg-lumina-surface p-6 sm:p-7">
                <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-lumina-border bg-transparent text-lumina-text-muted">
                    <Icon size={20} />
                  </div>
                  <span className="text-xs tracking-[0.18em] text-lumina-text-muted/60">{number}</span>
                </div>
                <h3 style={serif} className="mt-8 text-[27px]">{title}</h3>
                <p className="mt-3 text-[15px] leading-6 text-lumina-text-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8">
        <div className="grid gap-10 rounded-[28px] border border-lumina-glass-border bg-lumina-glass p-7 backdrop-blur-[12px] sm:p-11 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-lumina-border bg-transparent text-lumina-text-muted">
              <UserRound size={22} />
            </div>
            <p className="mt-6 text-xs uppercase tracking-[0.24em] text-lumina-attention">For professionals</p>
            <h2 style={serif} className="mt-4 text-[40px] leading-tight sm:text-[50px]">Show your work. Manage the next step.</h2>
          </div>

          <div className="space-y-3">
            {professionalSteps.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-[20px] border border-lumina-border bg-lumina-surface p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lumina-black text-xs text-white">{index + 1}</span>
                <p className="pt-1 text-[15px] leading-6 text-lumina-text-muted">{step}</p>
              </div>
            ))}
            <div className="border-t border-lumina-border pt-5">
              <h3 style={serif} className="text-[22px] text-lumina-text">Built for the work after booking, too.</h3>
              <p className="mt-2 text-[14px] leading-6 text-lumina-text-muted">
                Keep client history, Consultation context, Results / Photos, private Notes, Service preferences, Reminders, and request-linked Messages organized in one workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-lumina-border bg-lumina-black px-5 py-20 text-center text-white sm:px-8">
        <p className="text-xs uppercase tracking-[0.25em] text-lumina-blush">Ready when you are</p>
        <h2 style={serif} className="mx-auto mt-5 max-w-[700px] text-[40px] leading-tight sm:text-[56px]">
          Find a professional with more clarity and less guesswork.
        </h2>
        <Link href="/browse" className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/40 bg-lumina-surface px-7 py-3.5 text-sm text-lumina-text transition-colors duration-200 hover:bg-transparent hover:text-white focus-visible:bg-transparent focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-lumina-black">
          Browse Lumina <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="border-t border-lumina-border bg-lumina-bg-soft">
        <div className="flex w-full flex-col gap-6 px-3 py-10 text-sm text-lumina-text-muted sm:px-4 md:flex-row md:items-center md:justify-between lg:px-5 xl:px-6">
          <Link href="/" aria-label="Lumina home" className="block w-[118px]">
            <LuminaBrand variant="wordmark" className="h-auto w-full" />
          </Link>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Link href="/browse">Browse</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/login">Log in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
