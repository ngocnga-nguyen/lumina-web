"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !fullName) {
      alert("Please fill out all fields.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
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
      await supabase.from("artists").insert([
        {
          id: user.id,
          name: fullName,
          category: "Beauty Professional",
          location: "Location coming soon",
          price_start: 0,
        },
      ]);
    }

    setLoading(false);

    alert(
      "Account created ✨ Please check your email to confirm your account."
    );

    setEmail("");
    setPassword("");
    setFullName("");
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
          Join Lumina
        </h1>

        <p className="mt-4 text-[15px] text-neutral-600">
          Create your professional account and start building your profile.
        </p>

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
      </div>
    </main>
  );
}