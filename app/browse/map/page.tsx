import Link from "next/link";

export default function BrowseMapPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* Top nav */}
      <header className="flex items-center justify-between bg-[#faf6f5] px-10 py-6 text-[15px]">
        <Link href="/" className="font-medium">
          Lumina
        </Link>

        <div className="text-[15px]">Browse Artists</div>

        <div className="flex items-center gap-3">
          <span className="text-[20px] text-[#e9a8a8]">♡</span>
          <span className="text-[15px]">Saved</span>
        </div>
      </header>

      <section className="px-10 pt-10 pb-20">
        <div className="flex items-start justify-between">
          <div>
            <Link href="/browse" className="text-[16px]">
              ← Back
            </Link>

            <h1
              className="mt-8 text-[54px] leading-[1.02] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Professionals near me
            </h1>

            <p className="mt-3 text-[18px] text-neutral-700">
              Discover 8 talented beauty professionals
            </p>
          </div>

          <div className="w-[580px]">
            <div className="flex items-center rounded-full bg-[#efedeb] px-5 py-3">
              <span className="mr-3 text-lg text-neutral-500">⌕</span>
              <input
                type="text"
                placeholder="search professional near me"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>

            <div className="mt-8 flex justify-center gap-10 text-[15px] text-neutral-700">
              <button>All</button>
              <button>Nail</button>
              <button>Hair</button>
              <button>Aesthetician</button>
              <button>Makeup</button>
            </div>
          </div>

          <div className="text-[16px]">Map</div>
        </div>

        <div className="mt-14 flex justify-center">
          <div className="relative h-[620px] w-[1080px] bg-[#e7e2dc]">
            {/* Fake map lines */}
            <div className="absolute left-[8%] top-[20%] h-[2px] w-[75%] bg-orange-400" />
            <div className="absolute left-[15%] top-[50%] h-[2px] w-[60%] bg-blue-500" />
            <div className="absolute left-[35%] top-[72%] h-[2px] w-[40%] bg-green-500" />
            <div className="absolute left-[55%] top-[18%] h-[55%] w-[2px] bg-orange-400" />
            <div className="absolute left-[68%] top-[28%] h-[40%] w-[2px] bg-blue-500" />
            <div className="absolute left-[82%] top-[12%] h-[50%] w-[2px] bg-red-500" />

            {/* marker dots */}
            <div className="absolute left-[64%] top-[47%] h-4 w-4 rounded-full bg-pink-300" />
            <div className="absolute left-[71%] top-[38%] h-4 w-4 rounded-full bg-pink-300" />
            <div className="absolute left-[58%] top-[58%] h-4 w-4 rounded-full bg-pink-300" />

            {/* artist card */}
            <div className="absolute left-[61%] top-[34%] w-[260px] bg-white p-4 shadow-md">
              <h3 className="text-[22px] font-medium">Maya Johnson</h3>
              <p className="text-[15px] text-neutral-500">Makeup Artist</p>

              <p className="mt-3 text-[14px] text-neutral-600">
                4.9 (127 reviews) &nbsp;&nbsp; 10+ years experience
              </p>

              <p className="mt-4 text-[14px] text-neutral-700">
                Soft glam specialist known for natural, camera-ready finishes
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}