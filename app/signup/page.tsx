"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !fullName) {
      alert("Please fill out all fields.");
      return;
    }

    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          account_type: "client",
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
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: user.id,
          full_name: fullName,
          email: cleanEmail,
          account_type: "client",
        },
      ]);

      if (profileError) {
        console.log(profileError);
      }
    }

    setSubmittedEmail(cleanEmail);
    setSuccess(true);
    setLoading(false);

    setEmail("");
    setPassword("");
    setFullName("");
  };

  const resendConfirmation = async () => {
    if (!submittedEmail) return;

    setResending(true);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: submittedEmail,
    });

    setResending(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Confirmation email resent. Please check your inbox and spam folder.");
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
          Create your account
        </h1>

        <p className="mt-4 text-[15px] text-neutral-600">
          Save artists, compare profiles, and keep track of who you want to book.
        </p>

        {success ? (
          <div className="mt-8 rounded-[22px] bg-[#faf6f5] p-5">
            <p className="text-[18px] font-medium">Check your email ✨</p>

            <p className="mt-3 text-[14px] leading-[1.6] text-neutral-600">
              We sent a confirmation link to{" "}
              <span className="font-medium text-black">{submittedEmail}</span>.
              Please confirm your email before logging in.
            </p>

            <p className="mt-3 text-[13px] leading-[1.6] text-neutral-500">
              If you don’t see it, check your spam or promotions folder.
            </p>

            <button
              onClick={resendConfirmation}
              disabled={resending}
              className="mt-5 w-full rounded-full border border-black px-5 py-3 text-[14px] transition hover:bg-black hover:text-white disabled:opacity-50"
            >
              {resending ? "Resending..." : "Resend confirmation email"}
            </button>

            <Link
              href="/login"
              className="mt-4 block text-center text-[14px] text-black underline"
            >
              Go to login
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 space-y-4">
              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-[16px] border border-neutral-200 px-4 py-4 text-[15px] outline-none"
              />

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
            </div>

            <button
              onClick={handleSignup}
              disabled={loading}
              className="mt-8 w-full rounded-full bg-black px-6 py-4 text-[15px] text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>

            <p className="mt-6 text-center text-[14px] text-neutral-500">
              Already have an account?{" "}
              <Link href="/login" className="text-black underline">
                Login
              </Link>
            </p>

            <p className="mt-4 text-center text-[14px] text-neutral-500">
              Are you a beauty professional?{" "}
              <Link href="/join-as-artist" className="text-black underline">
                Join as an Artist
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}