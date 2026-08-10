"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AccountMenu from "@/components/AccountMenu";

type Service = {
  id: string;
  service_name: string;
  price: number | null;
  duration: string | null;
  description: string | null;
};

export default function DashboardServicesPage() {
  const [artistId, setArtistId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const [form, setForm] = useState({
    service_name: "",
    price: "",
    duration: "",
    description: "",
  });

  useEffect(() => {
    const fetchArtistAndServices = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: artist, error: artistError } = await supabase
        .from("artists")
        .select("id")
        .eq("id", user.id)
        .single();

      if (artistError || !artist) {
        console.log(artistError);
        return;
      }

      setArtistId(artist.id);

      const { data: serviceData, error: serviceError } = await supabase
        .from("services")
        .select("*")
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false });

      if (serviceError) {
        console.log(serviceError);
        return;
      }

      setServices(serviceData || []);
    };

    fetchArtistAndServices();
  }, []);

  const resetForm = () => {
    setForm({
      service_name: "",
      price: "",
      duration: "",
      description: "",
    });
    setEditingServiceId(null);
  };

  const saveService = async () => {
    if (!artistId) {
      alert("Artist profile not found.");
      return;
    }

    const cleanName = form.service_name.trim();
    const price = Number(form.price);

    if (!cleanName || !form.price) {
      alert("Please add a service name and price.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      alert("Please enter a valid service price.");
      return;
    }

    setLoading(true);

    const serviceValues = {
      service_name: cleanName,
      price,
      duration: form.duration.trim() || null,
      description: form.description.trim() || null,
    };
    const query = editingServiceId
      ? supabase
          .from("services")
          .update(serviceValues)
          .eq("id", editingServiceId)
          .eq("artist_id", artistId)
      : supabase.from("services").insert([
          {
            artist_id: artistId,
            ...serviceValues,
          },
        ]);
    const { data, error } = await query.select().single();

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setServices((currentServices) =>
      editingServiceId
        ? currentServices.map((service) =>
            service.id === editingServiceId ? data : service
          )
        : [data, ...currentServices]
    );
    resetForm();
  };

  const editService = (service: Service) => {
    setEditingServiceId(service.id);
    setForm({
      service_name: service.service_name,
      price: service.price?.toString() || "",
      duration: service.duration || "",
      description: service.description || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteService = async (id: string) => {
    if (!window.confirm("Delete this service?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setServices(services.filter((service) => service.id !== id));
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-5 py-5 text-[15px]">
        <Link href="/dashboard">← Dashboard</Link>

        <Link href="/" className="font-medium">
          Lumina
        </Link>

        <AccountMenu />
      </header>

      <section className="px-5 py-10 md:px-10">
        <h1
          className="text-[44px] leading-[1.02] font-semibold md:text-[64px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Manage services
        </h1>

        <p className="mt-4 max-w-[680px] text-[16px] leading-[1.6] text-neutral-600">
          Create service cards that will appear on your Lumina profile.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[420px_1fr]">
          <div className="rounded-[24px] border border-neutral-200 p-6">
            <h2
              className="text-[30px] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {editingServiceId ? "Edit service" : "New service"}
            </h2>

            <div className="mt-6 space-y-4">
              <input
                type="text"
                placeholder="Service name"
                value={form.service_name}
                onChange={(e) =>
                  setForm({ ...form, service_name: e.target.value })
                }
                className="w-full border border-neutral-200 px-4 py-3 outline-none"
              />

              <input
                type="number"
                placeholder="Price"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full border border-neutral-200 px-4 py-3 outline-none"
              />

              <input
                type="text"
                placeholder="Duration, example: 60 min"
                value={form.duration}
                onChange={(e) =>
                  setForm({ ...form, duration: e.target.value })
                }
                className="w-full border border-neutral-200 px-4 py-3 outline-none"
              />

              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="h-[130px] w-full resize-none border border-neutral-200 px-4 py-3 outline-none"
              />
            </div>

            <button
              onClick={() => void saveService()}
              disabled={loading}
              className="mt-6 w-full rounded-full bg-black px-6 py-3 text-white disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : editingServiceId
                ? "Update Service"
                : "Save Service"}
            </button>

            {editingServiceId && (
              <button
                onClick={resetForm}
                disabled={loading}
                className="mt-3 w-full rounded-full border border-neutral-200 px-6 py-3 text-[13px] text-neutral-600 disabled:opacity-50"
              >
                Cancel editing
              </button>
            )}
          </div>

          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2
                className="text-[30px] font-semibold"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Service cards
              </h2>

              <p className="text-[14px] text-neutral-500">
                {services.length} saved
              </p>
            </div>

            {services.length === 0 ? (
              <div className="rounded-[24px] bg-[#fbf4f4] p-6 text-neutral-600">
                No services yet. Add your first service to build your profile.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="rounded-[20px] bg-[#fbf4f4] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3
                        className="text-[26px] font-semibold"
                        style={{
                          fontFamily: "Georgia, Times New Roman, serif",
                        }}
                      >
                        {service.service_name}
                      </h3>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => editService(service)}
                          className="text-[13px] text-neutral-500 hover:text-black"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void deleteService(service.id)}
                          className="text-[13px] text-neutral-400 hover:text-black"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 text-[18px]">${service.price}</p>

                    <p className="mt-5 whitespace-pre-line text-[14px] leading-[1.6] text-neutral-700">
                      {service.description || "No description added."}
                    </p>

                    <p className="mt-8 text-right text-[13px] text-neutral-500">
                      ◔ {service.duration || "duration"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
