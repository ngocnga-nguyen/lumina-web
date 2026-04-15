"use client";

import Link from "next/link";

export default function Home() {
  const categories = [
    {
      name: "Nails",
      image:
        "https://i.pinimg.com/736x/9f/e7/07/9fe707173c179fe6a8267e4537ec15ce.jpg",
    },
    {
      name: "Facials",
      image:
        "https://i.pinimg.com/736x/03/4b/26/034b2662f1747eefe22a5df207cfee0c.jpg",
    },
    {
      name: "Lashes",
      image:
        "https://i.pinimg.com/736x/97/ee/7c/97ee7c69d550e00ab76d3572a60934c4.jpg",
    },
    {
      name: "Hair",
      image:
        "https://i.pinimg.com/736x/d3/94/0b/d3940b17db908e6eb6aadb81b8c9723f.jpg",
    },
    {
      name: "Makeup",
      image:
        "https://i.pinimg.com/736x/70/62/7d/70627ddbf190865d5a620e8d7789a1a4.jpg",
    },
  ];

  const artists = [
    {
      name: "Linsey J",
      role: "Hair Stylist",
      rating: "4.6",
      reviews: "55 reviews",
      location: "Broken Arrow, OK",
      image:
        "https://i.pinimg.com/1200x/a2/ba/58/a2ba58f16fad11e3d9ad74028a62d0b1.jpg",
    },
    {
      name: "Emma L",
      role: "Lash Artist",
      rating: "4.9",
      reviews: "127 reviews",
      location: "Broken Arrow, OK",
      image:
        "https://i.pinimg.com/736x/2f/ea/ce/2feace35146ff9eeefdef6c75c30b77a.jpg",
    },
    {
      name: "Lily W",
      role: "Aesthetician",
      rating: "4.5",
      reviews: "23 reviews",
      location: "Tulsa, OK",
      image:
        "https://i.pinimg.com/1200x/2d/4a/5d/2d4a5de7488d7d29cc6f928c572ebed7.jpg",
    },
    {
      name: "Anna H",
      role: "Nail Technician",
      rating: "4.8",
      reviews: "45 reviews",
      location: "Pryor, OK",
      image:
        "https://i.pinimg.com/1200x/cb/0b/28/cb0b286e2bf90921e952fceb9475b93b.jpg",
    },
  ];

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Top nav */}
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
        <div className="font-medium">Lumina</div>

        <nav className="flex items-center gap-6 text-sm md:gap-16 md:text-[15px]">
          <Link href="/browse" className="transition hover:opacity-70">
            Browse Artists
          </Link>

          <Link href="/join-as-artist" className="transition hover:opacity-70">
            Join as an Artist
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="bg-white px-4 pt-10 pb-16 md:px-14 md:pt-20 md:pb-28">
        <div className="max-w-[900px]">
          <h1
            className="max-w-[780px] text-[42px] leading-[1.0] tracking-[-0.03em] font-semibold md:text-[68px] lg:text-[84px]"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Find beauty
            <br />
            professionals
            <br />
            you can trust
          </h1>

          <p
            className="mt-8 max-w-[930px] text-[22px] leading-[1.2] md:mt-12 md:text-[30px] lg:mt-14 lg:text-[34px]"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            See results, read trusted reviews, and make
            <br className="hidden md:block" />
            informed decision before booking
          </p>

          <div className="mt-10 md:mt-16 lg:mt-20">
            <div className="flex w-full max-w-[390px] items-center rounded-full bg-[#efedeb] px-5 py-3">
              <span className="mr-3 text-lg text-neutral-500">⌕</span>
              <input
                type="text"
                placeholder="search professional near me"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Explore by Categories */}
      <section className="px-4 pb-16 md:px-14 md:pb-24 lg:pb-28">
        <div className="text-center">
          <h2 className="text-[16px] font-semibold uppercase tracking-[0.08em] md:text-[18px]">
            Explore by Categories
          </h2>
          <p className="mt-3 text-[16px] text-neutral-700 md:text-[18px]">
            Find the right professional for your style and needs
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-5 md:mt-14 md:grid-cols-3 lg:grid-cols-5 lg:gap-12">
          {categories.map((category) => (
            <div key={category.name} className="flex flex-col items-center">
              <img
                src={category.image}
                alt={category.name}
                className="h-[180px] w-full object-cover md:h-[220px] lg:h-[260px]"
              />
              <p className="mt-3 text-[15px] md:mt-4 md:text-[16px]">
                {category.name}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How Lumina Works */}
      <section className="px-4 pb-16 md:px-14 md:pb-24 lg:pb-32">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-20">
          <div>
            <h2
              className="text-[42px] leading-[1.05] font-semibold md:text-[54px] lg:text-[64px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              How
              <br />
              Lumina
              <br />
              works
            </h2>

            <p className="mt-6 max-w-[300px] text-[18px] text-neutral-700 md:mt-10 md:text-[22px]">
              Finding your perfect beauty professional is simple
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 pt-2 md:grid-cols-3 md:gap-10 lg:pt-6 lg:gap-16">
            <div>
              <div className="mb-3 text-xl md:mb-4">✨</div>
              <h3 className="text-[18px] font-medium md:text-[20px]">1. Discover</h3>
              <p className="mt-2 text-[14px] text-neutral-600 md:text-[15px]">
                Browse professionals and explore real client results
              </p>
            </div>

            <div>
              <div className="mb-3 text-xl md:mb-4">♡</div>
              <h3 className="text-[18px] font-medium md:text-[20px]">2. Compare</h3>
              <p className="mt-2 text-[14px] text-neutral-600 md:text-[15px]">
                Compare pricing, reviews, and trust signals
              </p>
            </div>

            <div>
              <div className="mb-3 text-xl md:mb-4">📅</div>
              <h3 className="text-[18px] font-medium md:text-[20px]">3. Choose</h3>
              <p className="mt-2 text-[14px] text-neutral-600 md:text-[15px]">
                Know exactly what to expect before booking
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Top-rated artists */}
      <section className="px-4 pb-16 md:px-14 md:pb-24 lg:pb-32">
        <div className="text-center">
          <h2 className="text-[16px] font-semibold uppercase tracking-[0.08em] md:text-[18px]">
            Top-rated artists in your area
          </h2>
          <p className="mt-3 text-[16px] text-neutral-700 md:text-[18px]">
            Discover talented artists trusted by our community
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 md:mt-14 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {artists.map((artist) => (
            <div key={artist.name}>
              <img
                src={artist.image}
                alt={artist.name}
                className="h-[220px] w-full object-cover"
              />

              <h3 className="mt-4 text-[18px] font-medium md:mt-5">
                {artist.name}
              </h3>
              <p className="text-[15px] text-neutral-500 md:text-[16px]">
                {artist.role}
              </p>

              <p className="mt-3 text-[14px] text-neutral-500">
                ⭐ {artist.rating} ({artist.reviews})
              </p>

              <div className="mt-6 flex items-center justify-between text-[14px] md:mt-8">
                <span className="text-neutral-700">{artist.location}</span>
                <Link
                  href="/browse"
                  className="text-neutral-400 transition hover:text-black"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Lumina */}
      <section className="px-4 pb-16 md:px-14 md:pb-24 lg:pb-32">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-14">
          <div>
            <h2
              className="text-[42px] leading-[1.02] font-semibold md:text-[56px] lg:text-[72px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Why
              <br />
              Choose
              <br />
              Lumina?
            </h2>

            <p
              className="mt-8 max-w-[280px] text-[18px] leading-[1.35] md:mt-12 md:text-[22px] lg:text-[24px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              A platform designed
              <br />
              for authentic
              <br />
              connections and
              <br />
              quality work
            </p>
          </div>

          <div className="pt-2 md:pt-4 lg:pt-8">
            <h3 className="text-[18px] font-semibold md:text-[20px]">
              Real Trust Signals
            </h3>
            <p className="mt-4 text-[15px] leading-[1.5] text-neutral-700 md:mt-5 md:text-[16px]">
              Know who’s legit with verified reviews and real client results
            </p>
          </div>

          <div className="pt-2 md:pt-4 lg:pt-8">
            <h3 className="text-[18px] font-semibold md:text-[20px]">
              Clarify before you commit
            </h3>
            <p className="mt-4 text-[15px] leading-[1.5] text-neutral-700 md:mt-5 md:text-[16px]">
              See pricing, services, and what you’re actually paying for
            </p>
          </div>

          <div className="pt-2 md:pt-4 lg:pt-8">
            <h3 className="text-[18px] font-semibold md:text-[20px]">
              Compare with ease
            </h3>
            <p className="mt-4 text-[15px] leading-[1.5] text-neutral-700 md:mt-5 md:text-[16px]">
              Save your favorites, compare options, and choose what fits you best
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-20 text-center md:px-14 md:pb-32 lg:pb-40">
        <h2
          className="text-[36px] leading-[1.08] font-semibold md:text-[52px] lg:text-[64px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Find someone you can trust today
        </h2>

        <p className="mt-6 text-[16px] text-neutral-700 md:mt-8 md:text-[18px]">
          Discover, compare, and choose beauty professionals with confidence
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 md:mt-14 md:flex-row md:gap-6">
          <Link
            href="/browse"
            className="rounded-full bg-black px-8 py-3 text-[15px] text-white"
          >
            Browse Artists
          </Link>

          <Link
            href="/join-as-artist"
            className="rounded-full border border-black px-8 py-3 text-[15px] transition hover:bg-black hover:text-white"
          >
            Join as an Artist
          </Link>
        </div>
      </section>
    </main>
  );
}