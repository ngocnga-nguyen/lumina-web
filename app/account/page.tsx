"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { CircleUser } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email || null);
      setName(user.user_metadata?.full_name || "");
    };

    loadUser();
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="grid grid-cols-3 items-center bg-[#faf6f5] px-5 py-5">
        <Link href="/browse" className="text-sm transition hover:opacity-70">
          ← Browse
        </Link>

        <Link href="/" className="justify-self-center font-medium">
          Lumina
        </Link>

        <div />
      </header>

      <section className="mx-auto max-w-xl px-5 py-12">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#faf6f5]">
            <CircleUser size={28} strokeWidth={1.5} />
          </div>

          <div>
            <h1
              className="text-[38px] font-semibold leading-tight"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Account
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Manage your Lumina account.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-[24px] border border-neutral-200 bg-white p-5">
            <p className="text-[12px] uppercase tracking-[0.14em] text-neutral-400">
  Name
</p>

<p className="mt-2 mb-6 text-[15px]">
  {name || "Not set"}
</p>
          <p className="text-[12px] uppercase tracking-[0.14em] text-neutral-400">
            Email
          </p>

          <p className="mt-2 text-[15px]">
            {email || "Loading..."}
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          <Link
            href="/saved"
            className="rounded-[18px] border border-neutral-200 px-5 py-4 text-sm transition hover:bg-[#faf6f5]"
          >
            Saved Artists
          </Link>

          <Link
            href="/my-requests"
            className="rounded-[18px] border border-neutral-200 px-5 py-4 text-sm transition hover:bg-[#faf6f5]"
          >
            My Requests
          </Link>

          <button
            onClick={signOut}
            className="rounded-[18px] border border-neutral-200 px-5 py-4 text-left text-sm text-neutral-500 transition hover:bg-[#faf6f5] hover:text-black"
          >
            Sign Out
          </button>
        </div>
      </section>
    </main>
  );
}