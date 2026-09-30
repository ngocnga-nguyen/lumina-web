"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { initializeProfessional } from "@/lib/professional-initialization";

export default function LoginPage() {
  const router = useRouter();
  const getSafeRedirect = () => {
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    return redirect?.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : null;
  };
  const [accountError, setAccountError] = useState(false);
  const [accountAttempt, setAccountAttempt] = useState(0);
  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      try {
        setAccountError(false);
        const result = await initializeProfessional(supabase);
        if (!mounted || result.status === "unauthenticated") return;
        if (result.status === "artist") {
          router.push(getSafeRedirect() || (result.created ? "/dashboard/onboarding" : "/dashboard"));
        } else {
          router.push("/browse");
        }
      } catch (error) {
        if (mounted) {
          console.log("Account role check failed:", error);
          setAccountError(true);
        }
      }
    };

    void checkSession();
    return () => { mounted = false; };
  }, [accountAttempt, router]);
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

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      const user = data.user;
      if (!user) return;

      const result = await initializeProfessional(supabase);
      if (result.status === "unauthenticated") throw new Error("Session unavailable");
      if (result.status === "artist") {
        router.push(getSafeRedirect() || (result.created ? "/dashboard/onboarding" : "/dashboard"));
        return;
      }
      router.push("/browse");
    } catch (error) {
      console.log("Account login or role check failed:", error);
      setAccountError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-lumina-bg px-4 py-10 text-lumina-text md:px-10">
      <Link href="/" className="text-[15px] hover:opacity-70">
        ← Back to Lumina
      </Link>

      <div className="mx-auto mt-10 max-w-[460px] rounded-[24px] bg-lumina-surface p-6 shadow-sm sm:mt-16 sm:p-8 md:p-10">
        <h1
          className="text-[38px] leading-[1.02] font-semibold sm:text-[42px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Login to Lumina
        </h1>

        <p className="mt-4 text-[15px] text-lumina-text-muted">
          Login to continue browsing, saving artists, or managing your professional profile.
        </p>

        {accountError && (
          <div role="alert" className="mt-6 text-sm">
            <p>We couldn&apos;t finish loading your account or setting up your professional profile. Please try again.</p>
            <button type="button" className="mt-2 underline" onClick={() => setAccountAttempt((attempt) => attempt + 1)}>
              Retry account setup
            </button>
          </div>
        )}

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
            className="w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
          />

          <div className="text-right">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetSending}
              className="text-[13px] text-lumina-text-muted underline underline-offset-4 transition hover:text-lumina-text disabled:opacity-50"
            >
              {resetSending ? "Sending reset link…" : "Forgot password?"}
            </button>
          </div>

          {resetSent && (
            <p className="rounded-[14px] border border-lumina-success/20 bg-lumina-success-soft px-4 py-3 text-[13px] leading-[1.5] text-lumina-success">
              Check your email for a secure password reset link.
            </p>
          )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-full bg-lumina-black px-6 py-3 text-[14px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        </form>

        <p className="mt-6 text-center text-[14px] text-lumina-text-muted">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-lumina-text underline">
            Create account
          </Link>
        </p>

        <p className="mt-4 text-center text-[14px] text-lumina-text-muted">
          Are you a beauty professional?{" "}
          <Link href="/join-as-artist" className="text-lumina-text underline">
            Join as a professional
          </Link>
        </p>
      </div>
    </main>
  );
}
