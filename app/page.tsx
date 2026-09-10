"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { ArrowRight, Check, MapPin, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import ArtistCard from "@/components/ArtistCard";
import LuminaBrand from "@/components/LuminaBrand";
import SearchBar from "@/components/SearchBar";
import { supabase } from "@/lib/supabase";
import { useLuminaAdminAccess } from "@/lib/use-lumina-admin-access";

type Artist = {
  id: string;
  name: string;
  category: string;
  location: string;
  price_start: number;
  profile_image_url?: string | null;
};

const serif = { fontFamily: "Georgia, Times New Roman, serif" };
const editorialContainer =
  "mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-12";
const wideVisualContainer =
  "mx-auto w-full max-w-[clamp(1280px,92vw,1560px)] px-5 sm:px-8 lg:px-12";

const categoryImages: Record<string, string> = {
  "Nail Technician": "/categories/nail.jpg",
  "Hair Stylist": "/categories/hair.jpg",
  "Makeup Artist": "/categories/makeup.jpg",
  "Lash Technician": "/categories/lash.jpg",
  "Brow Artist": "/categories/brow.jpg",
  "Facial Esthetician": "/categories/facial.jpg",
};

const heroServices = [
  { label: "Nail Technician", image: "/categories/nail.jpg" },
  { label: "Hair Stylist", image: "/categories/hair.jpg" },
  { label: "Makeup Artist", image: "/categories/makeup.jpg" },
  { label: "Lash Technician", image: "/categories/lash.jpg" },
  { label: "Brow Artist", image: "/categories/brow.jpg" },
  { label: "Facial Esthetician", image: "/categories/facial.jpg" },
];

const benefits = [
  {
    icon: Sparkles,
    title: "Real work",
    body: "See professional-uploaded portfolios and service results.",
  },
  {
    icon: Check,
    title: "Clear starting prices",
    body: "Understand the starting point before you send a request.",
  },
  {
    icon: ShieldCheck,
    title: "Verified reviews",
    body: "Reviews unlock after a completed Lumina appointment.",
  },
  {
    icon: MessageCircle,
    title: "Request first",
    body: "Discuss details and availability before you commit.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [artistProfile, setArtistProfile] = useState<any>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const isLuminaAdmin = useLuminaAdminAccess(user?.id);
  const [heroServiceIndex, setHeroServiceIndex] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const dragDistance = useRef(0);
  const wheelLock = useRef(false);

  const currentHeroService = heroServices[heroServiceIndex];

  const nextHeroService = () => {
    setHeroServiceIndex((current) => (current + 1) % heroServices.length);
  };

  const previousHeroService = () => {
    setHeroServiceIndex(
      (current) => (current - 1 + heroServices.length) % heroServices.length
    );
  };

  const handleHeroPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartX.current = event.clientX;
    dragDistance.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleHeroPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    dragDistance.current = event.clientX - dragStartX.current;
  };

  const finishHeroPointer = () => {
    if (dragStartX.current === null) return;
    if (dragDistance.current < -45) nextHeroService();
    if (dragDistance.current > 45) previousHeroService();
    dragStartX.current = null;
    dragDistance.current = 0;
  };

  const handleHeroWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (wheelLock.current || Math.abs(event.deltaX) < 16) return;
    wheelLock.current = true;
    if (event.deltaX > 0) nextHeroService();
    else previousHeroService();
    window.setTimeout(() => {
      wheelLock.current = false;
    }, 450);
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      router.replace(`/account/reset-password${hash}`);
    }
  }, [router]);

  useEffect(() => {
    const loadArtists = async () => {
      try {
        const { data, error } = await supabase
          .from("artists")
          .select("id, name, category, location, price_start, profile_image_url")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setArtists((data as Artist[]) || []);
      } catch (error) {
        console.error("Unable to load homepage artists:", error);
        setArtists([]);
      } finally {
        setArtistsLoading(false);
      }
    };

    loadArtists();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(nextHeroService, 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadAccount = async () => {
      const { data } = await supabase.auth.getUser();
      const signedInUser = data.user;
      setUser(signedInUser);
      if (!signedInUser) return;

      const { data: profile } = await supabase
        .from("artists")
        .select("id, name, profile_image_url")
        .eq("id", signedInUser.id)
        .maybeSingle();

      setArtistProfile(profile || null);
    };

    loadAccount();

    const { data: listener } = supabase.auth.onAuthStateChange(() => loadAccount());
    return () => listener.subscription.unsubscribe();
  }, []);

  const categories = useMemo(() => {
    const counts = artists.reduce<Record<string, number>>((result, artist) => {
      result[artist.category] = (result[artist.category] || 0) + 1;
      return result;
    }, {});

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [artists]);

  const searchSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    const values = new Set<string>();
    artists.forEach((artist) => {
      [artist.name, artist.category, artist.location].forEach((value) => {
        if (value?.toLowerCase().includes(query)) values.add(value);
      });
    });
    return Array.from(values).slice(0, 5);
  }, [artists, searchQuery]);

  const handleSearch = () => {
    const query = searchQuery.trim();
    router.push(query ? `/browse?search=${encodeURIComponent(query)}` : "/browse");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAccountMenuOpen(false);
    setUser(null);
    setArtistProfile(null);
    router.refresh();
  };

  const avatar =
    artistProfile?.profile_image_url || user?.user_metadata?.avatar_url || null;
  const displayName =
    artistProfile?.name || user?.user_metadata?.full_name || user?.email || "Account";

  return (
    <main data-lumina-public-page className="min-h-screen overflow-x-hidden bg-lumina-surface text-lumina-text">
      <header className="border-b border-lumina-border bg-lumina-bg-soft">
        <div className="grid h-[76px] w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-3 sm:px-4 lg:px-5 xl:px-6">
          <Link href="/" aria-label="Lumina home" className="block w-[116px] justify-self-start sm:w-[132px]">
            <LuminaBrand variant="wordmark" priority className="h-auto w-full" />
          </Link>

          <nav className="hidden items-center gap-7 justify-self-center text-[14px] md:flex">
            <Link href="/browse" className="transition hover:text-lumina-attention">Browse</Link>
            <Link href="/browse/map" className="transition hover:text-lumina-attention">Map</Link>
            <Link href="/how-it-works" className="transition hover:text-lumina-attention">How it works</Link>
          </nav>

          {user ? (
            <div className="relative justify-self-end">
              <button
                type="button"
                aria-expanded={accountMenuOpen}
                aria-label="Open account menu"
                onClick={() => setAccountMenuOpen((open) => !open)}
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-lumina-border bg-lumina-surface text-sm font-medium shadow-sm"
              >
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-14 z-40 w-[260px] rounded-[22px] border border-lumina-glass-border bg-lumina-surface/95 p-3 text-lumina-text shadow-xl backdrop-blur-[14px]">
                  <div className="border-b border-lumina-border px-3 py-3">
                    <p className="truncate text-[14px] font-medium">{displayName}</p>
                    <p className="mt-1 truncate text-[12px] text-lumina-text-muted">{user.email}</p>
                  </div>
                  <div className="py-2 text-[14px]">
                    {artistProfile ? (
                      <>
                        <Link href="/dashboard" className="block rounded-xl px-3 py-2.5 font-medium hover:bg-lumina-blush/70">Open dashboard</Link>
                        <Link href={`/artist/${artistProfile.id}`} className="block rounded-xl px-3 py-2.5 hover:bg-lumina-blush/70">View public profile</Link>
                        <Link href="/dashboard/settings" className="block rounded-xl px-3 py-2.5 hover:bg-lumina-blush/70">Settings &amp; privacy</Link>
                      </>
                    ) : (
                      <>
                        <Link href="/client" className="block rounded-xl px-3 py-2.5 font-medium hover:bg-lumina-blush/70">Open my account</Link>
                        <Link href="/account" className="block rounded-xl px-3 py-2.5 hover:bg-lumina-blush/70">Profile / Settings</Link>
                      </>
                    )}
                    {isLuminaAdmin && (
                      <Link href="/admin/reviews" className="flex items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-lumina-blush/70">
                        <ShieldCheck size={15} strokeWidth={1.6} aria-hidden="true" />
                        Admin / Moderation
                      </Link>
                    )}
                    <button type="button" onClick={handleLogout} className="w-full rounded-xl px-3 py-2.5 text-left text-lumina-text-muted hover:bg-lumina-blush/70 hover:text-lumina-black">Sign out</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-self-end gap-2 sm:gap-3">
              <Link href="/login" className="rounded-full bg-lumina-black px-4 py-2.5 text-[13px] text-white transition hover:opacity-80 sm:px-5">Log in</Link>
              <Link href="/join-as-artist" className="hidden rounded-full border border-lumina-border bg-lumina-surface px-5 py-2.5 text-[13px] transition hover:border-lumina-black sm:block">Join as Artist</Link>
            </div>
          )}
        </div>
      </header>

      <div className="bg-lumina-surface">
      <section className={`${wideVisualContainer} grid gap-10 pb-14 pt-12 md:pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16 lg:pb-20 lg:pt-20 xl:grid-cols-[minmax(500px,0.9fr)_minmax(0,1.1fr)]`}>
        <div className="max-w-[660px]">
          <p className="mb-5 text-[12px] uppercase tracking-[0.24em] text-lumina-attention">Beauty. Trust. Care.</p>
          <h1 className="text-[52px] leading-[0.93] tracking-[-0.045em] sm:text-[68px] lg:text-[82px]" style={serif}>
              Clarity before<br />you commit<span className="text-lumina-text">.</span>
          </h1>
          <p className="mt-7 max-w-[540px] text-[18px] leading-[1.65] text-lumina-text-muted sm:text-[20px]">
            Discover beauty professionals through clear services, starting prices,
            portfolios, and verified client reviews before you decide.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/browse" className="inline-flex items-center gap-2 rounded-full bg-lumina-black px-6 py-3.5 text-[14px] text-white transition hover:opacity-80">
              Explore artists <ArrowRight size={16} />
            </Link>
            <Link href="/how-it-works" className="inline-flex items-center gap-2 rounded-full border border-lumina-border bg-lumina-surface px-6 py-3.5 text-[14px] transition hover:border-lumina-black">
              How it works <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">▶</span>
            </Link>
          </div>
          <p className="mt-5 text-[13px] text-lumina-text-muted">
            Beauty professional? <Link href="/join-as-artist" className="text-lumina-black underline underline-offset-4">Create a professional account</Link>
          </p>
        </div>

        <div
          className="group relative mx-auto w-full max-w-[740px] cursor-grab select-none overflow-hidden rounded-[28px] border border-lumina-border bg-lumina-surface shadow-[0_24px_70px_rgba(39,36,40,0.09)] active:cursor-grabbing xl:mx-0 xl:max-w-[780px] xl:justify-self-end"
          onPointerDown={handleHeroPointerDown}
          onPointerMove={handleHeroPointerMove}
          onPointerUp={finishHeroPointer}
          onPointerCancel={finishHeroPointer}
          onWheel={handleHeroWheel}
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            <img key={currentHeroService.image} src={currentHeroService.image} alt={`${currentHeroService.label} service`} className="h-full w-full animate-[fadeIn_450ms_ease] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/5" />
            <span className="absolute left-6 top-6 rounded-full border border-white/50 bg-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white backdrop-blur-sm">Featured service</span>
            <div className="absolute bottom-7 left-7 right-7 text-white">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/75">This moment in beauty</p>
              <h2 className="mt-2 text-[34px] sm:text-[46px]" style={serif}>{currentHeroService.label}</h2>
              <Link href={`/browse?search=${encodeURIComponent(currentHeroService.label)}`} className="mt-3 inline-flex items-center gap-2 text-[14px]" onPointerDown={(event) => event.stopPropagation()}>
                View matching professionals <ArrowRight size={15} />
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <p className="text-[12px] text-lumina-text-muted">Swipe, drag, or use your trackpad</p>
            <div className="flex items-center gap-2">
              {heroServices.map((service, index) => (
                <button key={service.label} type="button" aria-label={`Show ${service.label}`} onClick={() => setHeroServiceIndex(index)} className={`h-2 rounded-full transition-all ${index === heroServiceIndex ? "w-7 bg-lumina-black" : "w-2 bg-lumina-border hover:bg-lumina-text-muted"}`} />
              ))}
            </div>
          </div>
        </div>
      </section>
      </div>

      <section className={wideVisualContainer}>
        <div className="grid overflow-hidden rounded-[22px] border border-lumina-glass-border bg-lumina-glass backdrop-blur-[12px] sm:grid-cols-2 lg:grid-cols-4">
          {[
            [artists.length || "New", "active professional profiles"],
            [categories.length || heroServices.length, "beauty categories to explore"],
            ["No charge", "to send a request"],
            ["Completed", "appointments unlock verified reviews"],
          ].map(([value, label], index) => (
            <div key={String(label)} className={`px-6 py-6 text-center ${index ? "border-t border-lumina-border sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 lg:border-l" : ""}`}>
              <p className="text-[20px]" style={serif}>{value}</p>
              <p className="mt-1 text-[12px] text-lumina-text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${editorialContainer} py-20 lg:py-24`}>
        <div>
          <div className="text-center">
            <p className="text-[12px] uppercase tracking-[0.24em] text-lumina-attention">Find the right match</p>
            <h2 className="mt-3 text-[38px] sm:text-[50px]" style={serif}>Search with more clarity.</h2>
            <p className="mx-auto mt-3 max-w-[560px] text-[16px] leading-7 text-lumina-text-muted">Start with a service, artist, or city—then refine the results that matter to you.</p>
          </div>

          <div className="mx-auto mt-8 w-full max-w-[1100px]">
            <div className="relative text-left">
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by city, artist, or service" showButton onSearch={handleSearch} />
              {searchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[20px] border border-lumina-glass-border bg-lumina-surface/95 p-2 shadow-xl backdrop-blur-[14px]">
                  {searchSuggestions.map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => { setSearchQuery(suggestion); router.push(`/browse?search=${encodeURIComponent(suggestion)}`); }} className="block w-full rounded-[14px] px-4 py-3 text-left text-[14px] hover:bg-lumina-blush/70">{suggestion}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <Link href="/browse?panel=category" className="rounded-full border border-lumina-border bg-lumina-surface px-5 py-2.5 text-[13px] hover:border-lumina-black">Category</Link>
              <Link href="/browse?panel=price" className="rounded-full border border-lumina-border bg-lumina-surface px-5 py-2.5 text-[13px] hover:border-lumina-black">Starting price</Link>
              <Link href="/browse?nearby=1" className="rounded-full border border-lumina-border bg-lumina-surface px-5 py-2.5 text-[13px] hover:border-lumina-black">Nearby</Link>
              <Link href="/browse/map" className="inline-flex items-center gap-2 rounded-full border border-lumina-border bg-lumina-surface px-5 py-2.5 text-[13px] hover:border-lumina-black"><MapPin size={14} /> Map view</Link>
              <Link href="/browse?panel=filters" className="rounded-full border border-lumina-border bg-lumina-surface px-5 py-2.5 text-[13px] hover:border-lumina-black">More filters</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-lumina-border bg-lumina-surface py-16 lg:py-20">
        <div className={wideVisualContainer}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[12px] uppercase tracking-[0.24em] text-lumina-attention">
                Explore Lumina professionals
              </p>
              <h2 className="mt-3 text-[36px] sm:text-[48px]" style={serif}>
                Professionals to explore.
              </h2>
              <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-lumina-text-muted">
                Browse real profiles, compare services and starting prices, and open a profile to learn more.
              </p>
            </div>
            <Link href="/browse" className="inline-flex items-center gap-2 text-[14px]">
              Explore all artists <ArrowRight size={15} />
            </Link>
          </div>

          {artistsLoading ? (
            <div className="-mx-5 mt-9 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="w-[78vw] max-w-[315px] shrink-0 snap-start overflow-hidden rounded-[22px] border border-lumina-border bg-lumina-surface lg:w-auto lg:max-w-none">
                  <div className="aspect-[4/3] animate-pulse bg-lumina-pearl" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-lumina-pearl" />
                    <div className="h-3 w-1/2 animate-pulse rounded-full bg-lumina-surface-soft" />
                    <div className="h-3 w-3/4 animate-pulse rounded-full bg-lumina-surface-soft" />
                  </div>
                </div>
              ))}
            </div>
          ) : artists.length === 1 ? (
            <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <ArtistCard
                artist={artists[0]}
                className="w-full max-w-[360px]"
                viewerIsArtist={Boolean(artistProfile)}
                isOwnProfile={artists[0].id === artistProfile?.id}
              />
            </div>
          ) : artists.length > 1 ? (
            <div className="-mx-5 mt-9 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
              {artists.slice(0, 8).map((artist) => (
                <ArtistCard key={artist.id} artist={artist} className="w-[78vw] max-w-[315px] shrink-0 snap-start lg:w-auto lg:max-w-none" viewerIsArtist={Boolean(artistProfile)} isOwnProfile={artist.id === artistProfile?.id} />
              ))}
            </div>
          ) : (
            <div className="mt-9 flex flex-col gap-4 rounded-[24px] border border-lumina-glass-border bg-lumina-glass p-7 backdrop-blur-[12px] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-[22px]" style={serif}>New professionals are joining Lumina.</h3>
                <p className="mt-2 text-[14px] text-lumina-text-muted">
                  Explore the marketplace to see every available profile and service.
                </p>
              </div>
              <Link href="/browse" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-lumina-black px-5 py-3 text-[13px] text-white">
                Browse artists <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-lumina-border bg-lumina-surface py-16 lg:py-20">
        <div className={wideVisualContainer}>
          <div className="rounded-[24px] border border-lumina-glass-border bg-lumina-glass p-7 backdrop-blur-[12px] sm:p-9 lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-lumina-attention">Compare with clarity</p>
              <h2 className="mt-3 max-w-[560px] text-[30px] sm:text-[38px]" style={serif}>Look beyond the first impression.</h2>
              <p className="mt-3 max-w-[640px] text-[15px] leading-7 text-lumina-text-muted">Open a profile to compare the details that shape a confident decision.</p>
              <div className="mt-7 divide-y divide-lumina-border border-y border-lumina-border">
                {[
                  ["01", "Services", "Review what is offered and the starting price."],
                  ["02", "Work", "Explore portfolio examples and profile details."],
                  ["03", "Trust", "Read reviews tied to completed Lumina appointments."],
                ].map(([number, title, description]) => (
                  <div key={number} className="grid gap-2 py-4 sm:grid-cols-[42px_110px_1fr] sm:items-baseline">
                    <span className="text-[11px] tracking-[0.16em] text-lumina-text-muted">{number}</span>
                    <span className="text-[14px] font-medium">{title}</span>
                    <span className="text-[14px] leading-6 text-lumina-text-muted">{description}</span>
                  </div>
                ))}
              </div>
            </div>
            <Link href="/browse" className="mt-7 inline-flex items-center gap-2 text-[14px] font-medium">
              Browse professionals <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className={`${wideVisualContainer} py-16 lg:py-20`}>
        <p className="text-[12px] uppercase tracking-[0.24em] text-lumina-attention">Browse by category</p>
        <h2 className="mt-3 max-w-[800px] text-[36px] leading-tight sm:text-[50px]" style={serif}>Start with the service you’re looking for.</h2>
        <div className="mt-9 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {(categories.length ? categories : heroServices.map((service) => ({ name: service.label, count: 0 }))).map((category) => (
            <Link key={category.name} href={`/browse?search=${encodeURIComponent(category.name)}`} className="group overflow-hidden rounded-[20px] border border-lumina-border bg-lumina-surface">
              <div className="aspect-[4/3] overflow-hidden bg-lumina-pearl"><img src={categoryImages[category.name] || "/categories/nail.jpg"} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /></div>
              <div className="p-4">
                <h3 className="text-[17px]" style={serif}>{category.name}</h3>
                <p className="mt-1 text-[11px] text-lumina-text-muted">{category.count ? `${category.count} ${category.count === 1 ? "professional" : "professionals"}` : "Explore professionals"}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${wideVisualContainer} pb-20`}>
        <div className="grid overflow-hidden rounded-[28px] border border-lumina-glass-border bg-lumina-glass backdrop-blur-[12px] lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14">
            <p className="text-[12px] uppercase tracking-[0.22em] text-lumina-attention">Compare with confidence</p>
            <h2 className="mt-4 text-[38px] leading-tight sm:text-[48px]" style={serif}>Save before you decide.</h2>
            <p className="mt-4 max-w-[460px] text-[16px] leading-7 text-lumina-text-muted">Keep promising professionals together and compare their services, starting prices, work, and reviews.</p>
            <div className="mt-7"><Link href={user && !artistProfile ? "/saved" : "/browse"} className="inline-flex items-center gap-2 rounded-full bg-lumina-black px-6 py-3.5 text-[14px] text-white">Start comparing <ArrowRight size={15} /></Link></div>
          </div>
          <div className="grid min-h-[330px] grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-5">
            {["/categories/hair.jpg", "/categories/makeup.jpg", "/categories/nail.jpg"].map((image, index) => (
              <div key={image} className={`overflow-hidden rounded-[20px] ${index === 1 ? "translate-y-6" : ""}`}><img src={image} alt="Beauty service inspiration" className="h-full w-full object-cover" /></div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-lumina-bg-soft py-20">
        <div className={wideVisualContainer}>
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[12px] uppercase tracking-[0.24em] text-lumina-attention">How Lumina works</p>
              <h2 className="mt-3 text-[38px] sm:text-[50px]" style={serif}>From discovery to a verified review.</h2>
            </div>
            <Link href="/how-it-works" className="inline-flex items-center gap-2 text-[14px]">See the complete guide <ArrowRight size={15} /></Link>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {[
              ["01", "Discover", "Search profiles and work."],
              ["02", "Choose", "Review services and prices."],
              ["03", "Request", "Share details and availability."],
              ["04", "Confirm", "Review the proposal."],
              ["05", "Complete", "The artist records completion."],
              ["06", "Review", "Share a verified experience."],
            ].map(([number, title, body]) => (
              <div key={number} className="rounded-[20px] border border-lumina-border bg-lumina-surface p-5">
                <p className="text-[11px] text-lumina-attention">{number}</p>
                <h3 className="mt-6 text-[18px]" style={serif}>{title}</h3>
                <p className="mt-2 text-[12px] leading-5 text-lumina-text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${editorialContainer} py-20`}>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-lumina-pearl text-lumina-text"><Icon size={19} strokeWidth={1.6} /></div>
              <h3 className="mt-5 text-[21px]" style={serif}>{title}</h3>
              <p className="mt-2 max-w-[260px] text-[14px] leading-6 text-lumina-text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-lumina-border bg-lumina-surface py-20">
        <div className={`${wideVisualContainer} grid gap-5 lg:grid-cols-2`}>
          <div className="flex h-full flex-col rounded-[28px] border border-lumina-border bg-lumina-surface p-8 sm:p-11">
            <div className="lg:flex-1">
              <p className="text-[12px] uppercase tracking-[0.22em] text-lumina-attention">For clients</p>
              <h2 className="mt-4 text-[36px] leading-tight" style={serif}>Find someone you feel good choosing.</h2>
              <p className="mt-4 max-w-[470px] text-[15px] leading-7 text-lumina-text-muted">Save professionals, send requests, keep conversations organized, and leave reviews after completed services.</p>
            </div>
            <div className="mt-7 lg:mt-0 lg:pt-7">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-full border border-lumina-border bg-lumina-surface px-6 py-3.5 text-[14px] text-lumina-text transition-colors duration-200 hover:border-lumina-black hover:bg-lumina-black hover:text-white focus-visible:border-lumina-black focus-visible:bg-lumina-black focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2">Create client account <ArrowRight size={15} /></Link>
            </div>
          </div>
          <div className="flex h-full flex-col rounded-[28px] border border-lumina-border bg-lumina-surface p-8 sm:p-11">
            <div className="lg:flex-1">
              <p className="text-[12px] uppercase tracking-[0.22em] text-lumina-text-muted">For professionals</p>
              <h2 className="mt-4 text-[36px] leading-tight" style={serif}>Let your work build lasting trust.</h2>
              <p className="mt-4 max-w-[470px] text-[15px] leading-7 text-lumina-text-muted">Present your services, pricing, portfolio, requests, completed appointments, and client feedback in one place.</p>
              <p className="mt-3 max-w-[500px] text-[14px] leading-6 text-lumina-text-muted">Organize client history, consultations, results, private notes, service preferences, reminders, and conversations in one workspace.</p>
            </div>
            <div className="mt-7 lg:mt-0 lg:pt-7">
              <Link href="/join-as-artist" className="inline-flex items-center gap-2 rounded-full border border-lumina-border bg-lumina-surface px-6 py-3.5 text-[14px] text-lumina-text transition-colors duration-200 hover:border-lumina-black hover:bg-lumina-black hover:text-white focus-visible:border-lumina-black focus-visible:bg-lumina-black focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2">Join as Artist <ArrowRight size={15} /></Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-lumina-border bg-lumina-bg-soft">
        <div className="flex w-full flex-col gap-8 px-3 py-10 sm:px-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center lg:px-5 xl:px-6">
          <Link href="/" className="w-[120px] md:justify-self-start"><LuminaBrand variant="wordmark" className="h-auto w-full" /></Link>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-lumina-text-muted md:justify-self-center">
            <Link href="/browse">Browse</Link>
            <Link href="/browse/map">Map</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
          <p className="text-[12px] text-lumina-text-muted md:justify-self-end">© 2026 Lumina</p>
        </div>
      </footer>
    </main>
  );
}
