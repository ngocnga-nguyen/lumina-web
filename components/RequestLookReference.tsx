import Image from "next/image";
import type { DiscoveryRequestReference } from "@/lib/discovery-request-reference";

export default function RequestLookReference({ reference, professional, category }: {
  reference: DiscoveryRequestReference; professional: string; category: string;
}) {
  return <section aria-label="Selected look reference" className="mt-4 flex min-w-0 items-center gap-3 rounded-lg border border-lumina-border px-3 py-3">
    <Image src={reference.image} alt={reference.title} width={64} height={80} unoptimized className="h-20 w-16 shrink-0 rounded object-cover" />
    <div className="min-w-0 [overflow-wrap:anywhere]">
      <p className="text-[10px] uppercase tracking-[0.1em] text-lumina-text-muted">Selected look</p>
      <h3 className="mt-1 text-[14px] font-medium">{reference.title}</h3>
      <p className="mt-1 text-[12px] text-lumina-text-muted">{professional} · {category}</p>
    </div>
  </section>;
}
