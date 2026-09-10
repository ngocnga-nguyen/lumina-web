"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ArtistSignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !fullName) {
      alert("Please fill out your name, email, and password.");
      return;
    }

    setLoading(true);

    const displayName = businessName.trim() || fullName;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent("/dashboard/onboarding")}`,
        data: {
          full_name: fullName,
          business_name: businessName,
          account_type: "artist",
        },
      },
    });

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    const user = data.user;

    if (user) {
      const { error: artistError } = await supabase.from("artists").insert([
        {
          id: user.id,
          name: displayName,
          category: "Beauty Professional",
          location: "Location coming soon",
          price_start: 0,
          email,
          is_active: false,
        },
      ]);

      if (artistError) {
        console.log(artistError);
        alert(artistError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);

    alert("Professional account created ✨ Please check your email to confirm your account.");

    setEmail("");
    setPassword("");
    setFullName("");
    setBusinessName("");

    router.push(
      `/login?redirect=${encodeURIComponent("/dashboard/onboarding")}`
    );
  };

  return (
    <main className="min-h-screen bg-lumina-bg px-4 py-10 text-lumina-text md:px-10">
      <Link href="/join-as-artist" className="text-[15px] hover:opacity-70">
        ← Back to artist info
      </Link>

      <div className="mx-auto mt-10 max-w-[460px] rounded-[24px] bg-lumina-surface p-6 shadow-sm sm:mt-16 sm:p-8 md:p-10">
        <h1
          className="text-[38px] leading-[1.02] font-semibold sm:text-[42px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Create professional account
        </h1>

        <p className="mt-4 text-[15px] text-lumina-text-muted">
          This account is for beauty professionals who want to manage a public Lumina profile.
        </p>

        <form
  className="mt-8 space-y-4"
  onSubmit={(e) => {
    e.preventDefault();
    handleSignup();
  }}
>
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
          />

          <input
            type="text"
            placeholder="Business or artist name, optional"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
          />

          <input
            type="email"
            placeholder="Professional email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
          />


        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-full bg-lumina-black px-6 py-3 text-[14px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating professional account..." : "Create professional account"}
        </button>
        </form>

        <p className="mt-6 text-center text-[14px] text-lumina-text-muted">
          Already have a professional account?{" "}
          <Link href="/login" className="text-lumina-text underline">
            Professional login
          </Link>
        </p>

        <p className="mt-4 text-center text-[14px] text-lumina-text-muted">
          Looking for beauty services?{" "}
          <Link href="/signup" className="text-lumina-text underline">
            Create a client account
          </Link>
        </p>
      </div>
    </main>
  );
}
