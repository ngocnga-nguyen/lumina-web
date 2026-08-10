"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
useEffect(() => {
  const checkSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return;

    const { data: artist } = await supabase
      .from("artists")
      .select("id")
      .eq("id", session.user.id)
      .single();

    if (artist) {
      router.push("/dashboard");
    } else {
      router.push("/browse");
    }
  };

  checkSession();
}, [router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      alert("Enter your email above first.");
      return;
    }

    setResetSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/account/reset-password`,
    });
    setResetSending(false);

    if (error) {
      alert(error.message);
      return;
    }

    setResetSent(true);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please fill out all fields.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    const user = data.user;

    if (!user) {
      setLoading(false);
      return;
    }

    // check if user is an artist
    const { data: artist } = await supabase
      .from("artists")
      .select("id")
      .eq("id", user.id)
      .single();

    setLoading(false);

    // professional account
    if (artist) {
      router.push("/dashboard");
      return;
    }

    // normal client account
    router.push("/browse");
  };

  return (
    <main className="min-h-screen bg-[#faf7f5] px-4 py-10 text-black md:px-10">
      <Link href="/" className="text-[15px] hover:opacity-70">
        ← Back to Lumina
      </Link>

      <div className="mx-auto mt-16 max-w-[460px] rounded-[28px] bg-white p-8 shadow-sm md:p-10">
        <h1
          className="text-[42px] leading-[1.0] font-semibold"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Login to Lumina
        </h1>

        <p className="mt-4 text-[15px] text-neutral-600">
          Login to continue browsing, saving artists, or managing your professional profile.
        </p>

        <form
  className="mt-8 space-y-4"
  onSubmit={(e) => {
    e.preventDefault();
    handleLogin();
  }}
>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[16px] border border-neutral-200 px-4 py-4 text-[15px] outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-[16px] border border-neutral-200 px-4 py-4 text-[15px] outline-none"
          />

          <div className="text-right">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetSending}
              className="text-[13px] text-neutral-600 underline underline-offset-4 transition hover:text-black disabled:opacity-50"
            >
              {resetSending ? "Sending reset link…" : "Forgot password?"}
            </button>
          </div>

          {resetSent && (
            <p className="rounded-[14px] bg-[#faf6f5] px-4 py-3 text-[13px] leading-[1.5] text-neutral-700">
              Check your email for a secure password reset link.
            </p>
          )}

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full rounded-full bg-black px-6 py-4 text-[15px] text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        </form>

        <p className="mt-6 text-center text-[14px] text-neutral-500">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-black underline">
            Create account
          </Link>
        </p>

        <p className="mt-4 text-center text-[14px] text-neutral-500">
          Are you a beauty professional?{" "}
          <Link href="/join-as-artist" className="text-black underline">
            Join as an Artist
          </Link>
        </p>
      </div>
    </main>
  );
}
