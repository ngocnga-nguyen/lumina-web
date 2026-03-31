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
      rating: "4.2",
      reviews: "34 reviews",
      location: "Claremore, OK",
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
      <header className="flex items-center justify-between bg-[#faf6f5] px-10 py-6 text-[15px]">
        <div className="font-medium">Lumina</div>

        <nav className="flex items-center gap-16">
          <Link href="/browse" className="transition hover:opacity-70">
          Browse Artists
          </Link>
          <a href="#" className="transition hover:opacity-70">
            Join as an Artist
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="bg-white px-14 pt-20 pb-28">
        <div className="max-w-[900px]">
          <h1
            className="max-w-[780px] text-[84px] leading-[0.98] tracking-[-0.03em] font-semibold"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Find beauty
            <br />
            professionals
            <br />
            you can trust
          </h1>

          <p
            className="mt-14 max-w-[930px] text-[34px] leading-[1.18]"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            See results, read trusted reviews, and make
            <br />
            informed decision before booking
          </p>

          <div className="mt-20 flex justify-center">
            <div className="flex w-[390px] items-center rounded-full bg-[#efedeb] px-5 py-3">
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
      <section className="px-14 pb-28">
        <div className="text-center">
          <h2 className="text-[18px] font-semibold uppercase tracking-[0.08em]">
            Explore by Categories
          </h2>
          <p className="mt-3 text-[18px] text-neutral-700">
            Find the right professional for your style and needs
          </p>
        </div>

        <div className="mt-14 grid grid-cols-5 gap-12">
          {categories.map((category) => (
            <div key={category.name} className="flex flex-col items-center">
              <img
                src={category.image}
                alt={category.name}
                className="h-[260px] w-full object-cover"
              />
              <p className="mt-4 text-[16px]">{category.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How Lumina Works */}
      <section className="px-14 pb-32">
        <div className="grid grid-cols-2 items-start gap-20">
          <div>
            <h2
              className="text-[64px] leading-[1.05] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              How
              <br />
              Lumina
              <br />
              works
            </h2>

            <p className="mt-10 max-w-[300px] text-[22px] text-neutral-700">
              Finding your perfect beauty professional is simple
            </p>
          </div>

          <div className="grid grid-cols-3 gap-16 pt-6">
            <div>
              <div className="mb-4 text-xl">✨</div>
              <h3 className="text-[20px] font-medium">1. Discover</h3>
              <p className="mt-2 text-[15px] text-neutral-600">
                Browse professionals and explore real client results
              </p>
            </div>

            <div>
              <div className="mb-4 text-xl">♡</div>
              <h3 className="text-[20px] font-medium">2. Compare</h3>
              <p className="mt-2 text-[15px] text-neutral-600">
                Compare pricing, reviews, and trust signals
              </p>
            </div>

            <div>
              <div className="mb-4 text-xl">📅</div>
              <h3 className="text-[20px] font-medium">3. Choose</h3>
              <p className="mt-2 text-[15px] text-neutral-600">
                Know exactly what to expect before booking
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Top-rated artists */}
      <section className="px-14 pb-32">
        <div className="text-center">
          <h2 className="text-[18px] font-semibold uppercase tracking-[0.08em]">
            Top-rated artists in your area
          </h2>
          <p className="mt-3 text-[18px] text-neutral-700">
            Discover talented artists trusted by our community
          </p>
        </div>

        <div className="mt-14 grid grid-cols-4 gap-12">
          {artists.map((artist) => (
            <div key={artist.name}>
              <img
                src={artist.image}
                alt={artist.name}
                className="h-[220px] w-full object-cover"
              />

              <h3 className="mt-5 text-[18px] font-medium">{artist.name}</h3>
              <p className="text-[16px] text-neutral-500">{artist.role}</p>

              <p className="mt-3 text-[14px] text-neutral-500">
                ⭐ {artist.rating} ({artist.reviews})
              </p>

              <div className="mt-8 flex items-center justify-between text-[14px]">
                <span className="text-neutral-700">{artist.location}</span>
                <a href="#" className="text-neutral-400 hover:text-black transition">
                  View Profile
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    {/* Why Choose Lumina */}
<section className="px-14 pb-32">
  <div className="grid grid-cols-4 gap-14 items-start">
    {/* Left side */}
    <div>
      <h2
        className="text-[72px] leading-[1.02] font-semibold"
        style={{ fontFamily: "Georgia, Times New Roman, serif" }}
      >
        Why
        <br />
        Choose
        <br />
        Lumina?
      </h2>

      <p
        className="mt-12 max-w-[280px] text-[24px] leading-[1.25]"
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

    {/* Right side cards */}
    <div className="pt-8">
      <h3 className="text-[20px] font-semibold">Real Trust Signals</h3>
      <p className="mt-5 text-[16px] leading-[1.5] text-neutral-700">
        Know who’s legit with verified reviews and real client results
      </p>
    </div>

    <div className="pt-8">
      <h3 className="text-[20px] font-semibold">Clarify before you commit</h3>
      <p className="mt-5 text-[16px] leading-[1.5] text-neutral-700">
        See pricing, services, and what you’re actually paying for
      </p>
    </div>

    <div className="pt-8">
      <h3 className="text-[20px] font-semibold">Compare with ease</h3>
      <p className="mt-5 text-[16px] leading-[1.5] text-neutral-700">
        Save your favorites, compare options, and choose what fits you best
      </p>
    </div>
  </div>
</section>
{/* Final CTA */}
<section className="px-14 pb-40 text-center">
  <h2
    className="text-[64px] leading-[1.05] font-semibold"
    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
  >
    Find someone you can trust today
  </h2>

  <p className="mt-8 text-[18px] text-neutral-700">
    Discover, compare, and choose beauty professionals with confidence
  </p>

  <div className="mt-14 flex justify-center gap-6">
    <button className="rounded-full bg-black px-8 py-3 text-white text-[15px]">
      Browse Artists
    </button>

    <button className="rounded-full border border-black px-8 py-3 text-[15px]">
      Join as an Artist
    </button>
  </div>
</section>
</main>
  );
}