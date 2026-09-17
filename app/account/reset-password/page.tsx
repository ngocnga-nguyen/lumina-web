"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingLink, setCheckingLink] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [returnTo, setReturnTo] = useState<"/account" | "/dashboard/settings">("/account");

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // A fixed role marker chooses one of two known routes; never accept a URL from the link.
      setReturnTo(new URLSearchParams(window.location.search).get("role") === "professional" ? "/dashboard/settings" : "/account");
      setHasRecoverySession(Boolean(session));
      setCheckingLink(false);
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
        setCheckingLink(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const updatePassword = async () => {
    if (password.length < 8) {
      alert("Use at least 8 characters for your new password.");
      return;
    }

    if (password !== confirmPassword) {
      alert("The passwords do not match.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Your password has been updated.");
    router.push(returnTo);
  };

  return (
    <main className="min-h-screen bg-lumina-surface text-lumina-text">
      <header className="grid grid-cols-3 items-center bg-lumina-surface-soft px-5 py-5">
        <Link href={returnTo} className="text-sm transition hover:opacity-70">
          ← {returnTo === "/account" ? "Account" : "Settings"}
        </Link>
        <Link href="/" className="justify-self-center font-medium">
          Lumina
        </Link>
        <div />
      </header>

      <section className="mx-auto max-w-md px-5 py-14">
        <h1
          className="text-[38px] font-semibold leading-[1.02] sm:text-[42px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Create a new password
        </h1>
        <p className="mt-4 text-[15px] leading-[1.6] text-lumina-text-muted">
          Choose a password you don’t use on other websites.
        </p>

        {checkingLink ? (
          <div className="mt-8 rounded-[20px] bg-lumina-surface-soft p-5 text-[14px] text-lumina-text-muted">
            Checking your secure link…
          </div>
        ) : !hasRecoverySession ? (
          <div className="mt-8 rounded-[20px] border border-lumina-border p-5">
            <p className="text-[14px] text-lumina-text">
              This password link is invalid or has expired.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-[13px] font-medium underline underline-offset-4"
            >
              Return to login to request a new link
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4 rounded-[24px] border border-lumina-border p-5">
            <label className="block text-[12px] text-lumina-text-muted">
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none transition focus:border-lumina-text-muted/50"
              />
            </label>

            <label className="block text-[12px] text-lumina-text-muted">
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void updatePassword();
                }}
                className="mt-2 w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none transition focus:border-lumina-text-muted/50"
              />
            </label>

            <button
              onClick={() => void updatePassword()}
              disabled={saving}
              className="w-full rounded-full bg-lumina-black px-6 py-3 text-[14px] text-white disabled:bg-lumina-pearl disabled:text-lumina-text-muted"
            >
              {saving ? "Updating…" : "Update password"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
