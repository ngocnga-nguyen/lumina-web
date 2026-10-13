"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Public destinations, never a replacement workspace/sidebar or account menu.
export default function MarketplacePublicNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Explore marketplace" className="marketplace-public-nav">
    <Link href="/discover" aria-current={pathname === "/discover" ? "page" : undefined}>Discover</Link>
    <Link href="/browse" aria-current={pathname.startsWith("/browse") ? "page" : undefined}>Professionals</Link>
  </nav>;
}
