"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function JoinAsArtistPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    location: "",
    price: "",
    bio: "",
    email: "",
    phone: "",
    socialLink: "",
    servicesOffered: "",
    availability: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("artists").insert([
      {
        name: form.name,
        category: form.category,
        location: form.location,
        price_start: Number(form.price),
        bio: form.bio,
        email: form.email,
        phone: form.phone,
        social_link: form.socialLink,
        services_offered: form.servicesOffered,
        availability: form.availability,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
        <Link href="/" className="font-medium">
          Lumina
        </Link>

        <div className="hidden md:block">Join as Artist</div>

        <Link href="/browse" className="text-sm transition hover:opacity-70">
          Browse
        </Link>
      </header>

      {!submitted ? (
        <section className="px-4 py-10 md:px-10 md:py-14">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_560px] lg:gap-20">
            <div className="max-w-[640px]">
              <p className="text-[12px] uppercase tracking-[0.15em] text-neutral-400">
                Early access
              </p>

              <h1
                className="mt-4 text-[38px] leading-[1.02] font-semibold md:text-[56px] lg:text-[68px]"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Join Lumina
                <br />
                as an Artist
              </h1>

              <p
                className="mt-6 max-w-[560px] text-[18px] leading-[1.5] text-neutral-700 md:text-[22px]"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Create your beauty profile, showcase your services, and help
                local clients find you with more confidence before they book.
              </p>

              <div className="mt-10 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-[#e9a8a8]">✨</span>
                  <p className="text-[15px] text-neutral-700 md:text-[16px]">
                    Add your own profile details, services, and contact info
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-[#e9a8a8]">♡</span>
                  <p className="text-[15px] text-neutral-700 md:text-[16px]">
                    Build trust before a client ever sends a request
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-[#e9a8a8]">📍</span>
                  <p className="text-[15px] text-neutral-700 md:text-[16px]">
                    Be searchable by service, city, and location
                  </p>
                </div>
              </div>

              <div className="mt-10 rounded-[18px] bg-[#f8f2f2] p-5 md:p-6">
                <p className="text-[13px] uppercase tracking-[0.12em] text-neutral-400">
                  Why join early
                </p>
                <p className="mt-3 text-[15px] leading-[1.6] text-neutral-700 md:text-[16px]">
                  Early artists help shape Lumina and get first access to
                  profile visibility as the platform grows.
                </p>
              </div>
            </div>

            <div className="rounded-[22px] bg-[#fbf7f6] p-5 md:p-8">
              <div className="mb-6">
                <p className="text-[12px] uppercase tracking-[0.12em] text-neutral-400">
                  Artist profile setup
                </p>
                <h2
                  className="mt-3 text-[30px] font-semibold md:text-[36px]"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  Create your profile
                </h2>
                <p className="mt-2 text-[14px] text-neutral-600 md:text-[15px]">
                  Fill this out so your profile can appear on Lumina.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
  <label className="mb-2 block text-[14px] text-neutral-700">
    Artist or Business Name
  </label>

  <input
    type="text"
    placeholder="Your name or business name"
    value={form.name}
    onChange={(e) =>
      setForm({ ...form, name: e.target.value })
    }
    className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
    required
  />

  <p className="mt-1 text-[12px] text-neutral-500">
    This is how your profile will appear to clients
  </p>
</div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Service Type
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                    required
                  >
                    <option value="" disabled>
                      Select a service
                    </option>
                    <option value="Lash Artist">Lash Artist</option>
                    <option value="Nail Technician">Nail Technician</option>
                    <option value="Hair Stylist">Hair Stylist</option>
                    <option value="Aesthetician">Aesthetician</option>
                    <option value="Makeup Artist">Makeup Artist</option>
                    <option value="Brow Artist">Brow Artist</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="City, State"
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Starting Price
                  </label>
                  <input
                    type="number"
                    placeholder="Example: 85"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="Phone number"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Social Media or Website
                  </label>
                  <input
                    type="text"
                    placeholder="Instagram, TikTok, website, booking link, etc."
                    value={form.socialLink}
                    onChange={(e) =>
                      setForm({ ...form, socialLink: e.target.value })
                    }
                    className="w-full border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Services Offered
                  </label>
                  <textarea
                    placeholder="Example: Acrylic full sets, gel manicures, freestyle sets, nail art"
                    value={form.servicesOffered}
                    onChange={(e) =>
                      setForm({ ...form, servicesOffered: e.target.value })
                    }
                    className="h-[95px] w-full resize-none border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Availability
                  </label>
                  <textarea
                    placeholder="Example: Monday-Friday, 10am-6pm"
                    value={form.availability}
                    onChange={(e) =>
                      setForm({ ...form, availability: e.target.value })
                    }
                    className="h-[90px] w-full resize-none border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] text-neutral-700">
                    Short Bio
                  </label>
                  <textarea
                    placeholder="Tell clients what you specialize in"
                    value={form.bio}
                    onChange={(e) =>
                      setForm({ ...form, bio: e.target.value })
                    }
                    className="h-[120px] w-full resize-none border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-4 w-full rounded-full bg-black px-6 py-3 text-[15px] text-white transition hover:opacity-90"
                >
                  Join Lumina
                </button>
              </form>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex min-h-[70vh] items-center justify-center px-4 py-16">
          <div className="w-full max-w-[520px] rounded-[24px] bg-[#fbf7f6] p-8 text-center md:p-10">
            <p className="text-[28px] text-[#e9a8a8]">✨</p>
            <h1
              className="mt-4 text-[34px] font-semibold md:text-[42px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              You’re in
            </h1>
            <p className="mt-4 text-[15px] leading-[1.6] text-neutral-700 md:text-[16px]">
              Thanks for joining early access. Your profile details have been
              saved, and we’ll review your listing before it goes live.
            </p>

            <div className="mt-8">
              <Link
                href="/"
                className="rounded-full border border-black px-6 py-3 text-[15px] transition hover:bg-black hover:text-white"
              >
                Back to home
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}