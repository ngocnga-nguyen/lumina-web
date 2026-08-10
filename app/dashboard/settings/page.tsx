"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AccountMenu from "@/components/AccountMenu";

export default function ArtistSettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingOutOthers, setSigningOutOthers] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: artist } = await supabase
        .from("artists")
        .select("is_active")
        .eq("id", user.id)
        .maybeSingle();

      if (!artist) {
        router.push("/account");
        return;
      }

      setEmail(user.email || "");
      setIsVisible(artist.is_active ?? true);
      setLoading(false);
    };

    void loadSettings();
  }, [router]);

  const requestEmailChange = async () => {
    const cleanEmail = newEmail.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    if (cleanEmail === email.toLowerCase()) {
      alert("That is already your current email.");
      return;
    }

    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: cleanEmail });
    setChangingEmail(false);

    if (error) {
      alert(error.message);
      return;
    }

    setNewEmail("");
    setShowEmailChange(false);
    alert(
      "Verification sent. Check your inbox and follow the link to finish changing your email."
    );
  };

  const sendPasswordReset = async () => {
    if (!email) return;

    setSendingPasswordReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/reset-password`,
    });
    setSendingPasswordReset(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password reset link sent. Check your email to continue.");
  };

  const updateVisibility = async () => {
    const nextVisibility = !isVisible;
    setVisibilityLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("artists")
      .update({ is_active: nextVisibility })
      .eq("id", user.id);

    setVisibilityLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setIsVisible(nextVisibility);
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
  };

  const signOutOtherDevices = async () => {
    if (!window.confirm("Sign out of Lumina on all other devices? You will stay signed in here.")) return;
    setSigningOutOthers(true);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setSigningOutOthers(false);
    if (error) {
      alert(error.message);
      return;
    }
    alert("Other devices have been signed out. You are still signed in on this device.");
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="grid grid-cols-3 items-center bg-[#faf6f5] px-5 py-5">
        <Link href="/dashboard" className="text-sm transition hover:opacity-70">
          ← Dashboard
        </Link>
        <Link href="/" className="justify-self-center font-medium">
          Lumina
        </Link>
        <div className="justify-self-end">
          <AccountMenu />
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-5 py-12">
        <h1
          className="text-[42px] font-semibold leading-tight"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Settings &amp; Privacy
        </h1>
        <p className="mt-3 text-[15px] text-neutral-500">
          Manage your professional account, security, and visibility.
        </p>

        {loading ? (
          <div className="mt-8 rounded-[22px] bg-[#faf9f7] p-5 text-[14px] text-neutral-500">
            Loading settings…
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            <section className="rounded-[24px] border border-neutral-200 p-5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-neutral-400">
                Account &amp; security
              </p>

              <div className="mt-5">
                <p className="text-[13px] text-neutral-500">Sign-in email</p>
                <p className="mt-1 text-[15px]">{email}</p>
                <p className="mt-2 text-[12px] text-neutral-400">
                  Used for sign-in and account recovery.
                </p>

                {!showEmailChange ? (
                  <button
                    onClick={() => setShowEmailChange(true)}
                    className="mt-3 text-[13px] font-medium underline decoration-neutral-300 underline-offset-4"
                  >
                    Change email
                  </button>
                ) : (
                  <div className="mt-4 rounded-[16px] bg-[#faf9f7] p-4">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      placeholder="New email address"
                      className="w-full rounded-[12px] border border-neutral-200 bg-white px-4 py-3 text-[14px] outline-none focus:border-neutral-400"
                    />
                    <p className="mt-2 text-[11px] text-neutral-400">
                      Your current email remains active until verification.
                    </p>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowEmailChange(false);
                          setNewEmail("");
                        }}
                        disabled={changingEmail}
                        className="rounded-full border border-neutral-200 px-4 py-2 text-[12px] text-neutral-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => void requestEmailChange()}
                        disabled={changingEmail}
                        className="rounded-full bg-black px-5 py-2 text-[12px] text-white disabled:bg-neutral-300"
                      >
                        {changingEmail ? "Sending…" : "Send verification"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-neutral-100 pt-5">
                <p className="text-[13px] font-medium">Password</p>
                <p className="mt-1 text-[12px] text-neutral-500">
                  Receive a secure link at your verified email.
                </p>
                <button
                  onClick={() => void sendPasswordReset()}
                  disabled={sendingPasswordReset}
                  className="mt-3 rounded-full border border-neutral-200 px-4 py-2 text-[12px] text-neutral-600 disabled:opacity-50"
                >
                  {sendingPasswordReset ? "Sending…" : "Change password"}
                </button>
              </div>

              <div className="mt-6 border-t border-neutral-100 pt-5">
                <p className="text-[13px] font-medium">Other devices</p>
                <p className="mt-1 text-[12px] leading-[1.5] text-neutral-500">End every other Lumina session while keeping this device signed in.</p>
                <button
                  onClick={() => void signOutOtherDevices()}
                  disabled={signingOutOthers}
                  className="mt-3 rounded-full border border-neutral-200 px-4 py-2 text-[12px] text-neutral-600 disabled:opacity-50"
                >
                  {signingOutOthers ? "Signing out…" : "Sign out of other devices"}
                </button>
              </div>
            </section>

            <section className="rounded-[24px] border border-neutral-200 p-5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-neutral-400">
                Privacy &amp; visibility
              </p>
              <div className="mt-5 flex items-center justify-between gap-5">
                <div>
                  <p className="text-[14px] font-medium">
                    Professional profile visibility
                  </p>
                  <p className="mt-1 text-[12px] leading-[1.5] text-neutral-500">
                    {isVisible
                      ? "Clients can find your profile in browse, search, and map."
                      : "Your profile is hidden from browse, search, and map."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void updateVisibility()}
                  disabled={visibilityLoading}
                  aria-pressed={isVisible}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
                    isVisible ? "bg-black" : "bg-neutral-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                      isVisible ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </section>

            <section className="rounded-[24px] border border-neutral-200 p-5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-neutral-400">
                Professional profile
              </p>
              <p className="mt-3 text-[13px] leading-[1.6] text-neutral-500">
                Public business details, services, photos, pricing, and booking links are managed separately.
              </p>
              <Link
                href="/dashboard/profile"
                className="mt-4 inline-block rounded-full bg-black px-5 py-2.5 text-[12px] text-white"
              >
                Edit professional profile
              </Link>
            </section>

            <button
              onClick={() => void signOut()}
              className="w-full rounded-[18px] border border-neutral-200 px-5 py-4 text-left text-[13px] text-neutral-500 transition hover:bg-[#faf6f5] hover:text-black"
            >
              Sign out
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
