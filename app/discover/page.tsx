"use client";
import "@/app/discovery.css";

import { useState } from "react";
import PublicPageHeader from "@/components/PublicPageHeader";
import DiscoverLooks from "@/components/DiscoverLooks";
import { LocalLookLibraryProvider, useLocalLookLibrary } from "@/lib/local-look-library";
import { discoveryCategories, discoveryCategory } from "@/lib/discovery-categories";

function DiscoverContent() {
  const [category, setCategory] = useState("All");
  const { artists } = useLocalLookLibrary();

  return (
    <main data-lumina-public-page className="min-h-screen bg-lumina-surface text-lumina-text">
      <PublicPageHeader marketplace backHref="/" />
      <section className="discover-destination mx-auto max-w-[1600px] px-4 pb-14 pt-6 md:px-10 md:pb-20 md:pt-12 lg:px-12 xl:px-16">
        <header className="discover-editorial">
          <p className="discover-eyebrow">Discover</p>
          <h1>Find your next look.</h1>
          <p className="discover-intro">Beauty inspiration, connected to the professionals behind it.</p>
        </header>
        <div className="discover-categories" role="group" aria-label="Discover categories">
          {discoveryCategories.map(value => (
            <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>
              {value}
            </button>
          ))}
        </div>
        {process.env.NODE_ENV === "development" && <p className="look-local-notice"><a className="underline" href="/discover">Public work</a> · <a className="underline" href="/discover?demo=1">Local AI demo preview</a></p>}
        <DiscoverLooks artistIds={category === "All" ? undefined : artists.filter(a => discoveryCategory(a.category) === category).map(a => a.id)} />
      </section>
    </main>
  );
}

export default function DiscoverPage() {
  return <LocalLookLibraryProvider><DiscoverContent /></LocalLookLibraryProvider>;
}
