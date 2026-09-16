"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, ExternalLink, MoreHorizontal, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import MobileManagementSheet from "@/components/MobileManagementSheet";
import ProfessionalOnboardingContext from "@/components/ProfessionalOnboardingContext";

type Service = {
  id: string;
  service_name: string;
  price: number | null;
  duration: string | null;
  description: string | null;
};

export default function DashboardServicesPage() {
  const router = useRouter();
  const [artistId, setArtistId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [onboardingMode, setOnboardingMode] = useState(false);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);

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

      const isOnboarding =
        new URLSearchParams(window.location.search).get("onboarding") ===
        "services";
      setOnboardingMode(isOnboarding);
      if (isOnboarding) setMobileEditorOpen(true);

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

  const closeMobileEditor = () => {
    if (loading) return;
    resetForm();
    setMobileEditorOpen(false);
  };

  const addService = () => {
    resetForm();
    setMobileEditorOpen(true);
  };

  const saveService = async () => {
    if (!artistId) {
      alert("Artist profile not found.");
      return;
    }

    const cleanName = form.service_name.trim();
    const price = Number(form.price);

    if (!cleanName || !form.price) {
      alert("Please add a service name and starting price.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      alert("Please enter a valid starting price.");
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
    setMobileEditorOpen(false);
    if (onboardingMode) {
      router.push("/dashboard/onboarding?step=portfolio");
    }
  };

  const editService = (service: Service) => {
    setEditingServiceId(service.id);
    setForm({
      service_name: service.service_name,
      price: service.price?.toString() || "",
      duration: service.duration || "",
      description: service.description || "",
    });
    setMobileEditorOpen(true);
    if (window.innerWidth >= 1024) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

  const serviceForm = (
    <>
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Service name"
          value={form.service_name}
          onChange={(e) => setForm({ ...form, service_name: e.target.value })}
          className="min-w-0 w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
        />
        <input
          type="number"
          placeholder="Starting price"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className="min-w-0 w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
        />
        <input
          type="text"
          placeholder="Duration, example: 60 min"
          value={form.duration}
          onChange={(e) => setForm({ ...form, duration: e.target.value })}
          className="min-w-0 w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="h-[120px] min-w-0 w-full resize-none break-words rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[15px] text-lumina-text outline-none transition [overflow-wrap:anywhere] placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
        />
      </div>
      <button
        onClick={() => void saveService()}
        disabled={loading}
        className="mt-6 min-h-11 w-full rounded-full bg-lumina-black px-6 text-[14px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading
          ? "Saving..."
          : onboardingMode
            ? "Save and continue"
            : editingServiceId
              ? "Save changes"
              : "Save service"}
      </button>
      {editingServiceId && (
        <button
          onClick={closeMobileEditor}
          disabled={loading}
          className="mt-3 min-h-11 w-full rounded-full border border-lumina-border px-6 text-[13px] text-lumina-text-muted disabled:opacity-50"
        >
          Cancel
        </button>
      )}
    </>
  );

  return (
    <div className="bg-lumina-surface text-lumina-text">
      <section className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-14">
        {onboardingMode && (
          <ProfessionalOnboardingContext
            step="services"
            title="Add at least one service"
          />
        )}
        <div className="lg:hidden">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">
            Professional workspace
          </p>
          <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div className="min-w-0">
              <h1 className="font-serif text-[31px] font-semibold leading-[1.04]">Services</h1>
              <p className="mt-1.5 text-[12px] text-lumina-text-muted">
                {services.length} {services.length === 1 ? "service" : "services"} on your profile
              </p>
            </div>
            <button
              type="button"
              onClick={addService}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-lumina-black px-3.5 text-[12px] font-medium text-white"
            >
              <Plus size={14} aria-hidden="true" /> Add service
            </button>
          </div>
          {artistId && (
            <Link
              href={`/artist/${artistId}`}
              className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-lumina-text-muted transition hover:text-lumina-text"
            >
              View public profile <ExternalLink size={12} aria-hidden="true" />
            </Link>
          )}
        </div>

        <div className="hidden lg:block">
          <h1
            className="text-[42px] leading-[1.02] font-semibold md:text-[56px]"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Manage services
          </h1>
          <p className="mt-4 max-w-[680px] text-[16px] leading-[1.6] text-lumina-text-muted">
            Create service cards that will appear on your Lumina profile.
          </p>
        </div>

        <div className="mt-5 space-y-2.5 lg:hidden">
          {services.length === 0 ? (
            <div className="rounded-[18px] border border-lumina-border bg-lumina-surface px-4 py-5">
              <h2 className="text-[15px] font-medium">No services yet</h2>
              <p className="mt-1 text-[12px] leading-[1.5] text-lumina-text-muted">
                Add your first service to build your public profile.
              </p>
            </div>
          ) : (
            services.map((service) => (
              <article
                key={service.id}
                className="rounded-[17px] border border-lumina-border/80 bg-lumina-surface px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-[20px] font-semibold leading-tight">
                      {service.service_name}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                      <span className="font-medium">From ${service.price}</span>
                      <span className="inline-flex items-center gap-1 text-lumina-text-muted">
                        <Clock3 size={12} aria-hidden="true" />
                        {service.duration || "Duration not set"}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[12px] leading-[1.5] text-lumina-text-muted">
                      {service.description || "No description added."}
                    </p>
                  </div>
                  <details className="relative shrink-0">
                    <summary
                      aria-label={`More actions for ${service.service_name}`}
                      className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full text-lumina-text-muted transition hover:bg-lumina-surface-soft [&::-webkit-details-marker]:hidden"
                    >
                      <MoreHorizontal size={18} aria-hidden="true" />
                    </summary>
                    <div className="absolute right-0 top-10 z-20 min-w-[132px] overflow-hidden rounded-[14px] border border-lumina-border bg-lumina-surface py-1.5 shadow-[0_14px_36px_rgba(17,17,17,0.1)]">
                      <button
                        type="button"
                        onClick={() => editService(service)}
                        className="block min-h-10 w-full px-4 text-left text-[12px] font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteService(service.id)}
                        className="block min-h-10 w-full px-4 text-left text-[12px] text-lumina-text-muted"
                      >
                        Delete
                      </button>
                    </div>
                  </details>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-10 hidden grid-cols-1 gap-10 lg:grid lg:grid-cols-[420px_1fr]">
          <div className="rounded-[24px] border border-lumina-border p-6">
            <h2
              className="text-[30px] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {editingServiceId ? "Edit service" : "New service"}
            </h2>

            <div className="mt-6">{serviceForm}</div>
          </div>

          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2
                className="text-[30px] font-semibold"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Service cards
              </h2>

              <p className="text-[14px] text-lumina-text-muted">
                {services.length} saved
              </p>
            </div>

            {services.length === 0 ? (
              <div className="rounded-[24px] border border-lumina-border bg-lumina-surface p-6">
                <h3 className="text-[16px] font-medium text-lumina-text">No services yet</h3>
                <p className="mt-1 text-[14px] leading-[1.55] text-lumina-text-muted">
                  Add your first service to build your profile.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="rounded-[20px] border border-lumina-border bg-lumina-surface p-5"
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
                          className="text-[13px] text-lumina-text-muted hover:text-lumina-text"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void deleteService(service.id)}
                          className="text-[13px] text-lumina-text-muted hover:text-lumina-text"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 text-[18px]">
                      Starting at ${service.price}
                    </p>

                    <p className="mt-5 whitespace-pre-line text-[14px] leading-[1.6] text-lumina-text">
                      {service.description || "No description added."}
                    </p>

                    <p className="mt-8 text-right text-[13px] text-lumina-text-muted">
                      ◔ {service.duration || "duration"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <MobileManagementSheet
        open={mobileEditorOpen}
        title={editingServiceId ? "Edit service" : "Add service"}
        busy={loading}
        onClose={closeMobileEditor}
      >
        <div className="pt-2">{serviceForm}</div>
      </MobileManagementSheet>
    </div>
  );
}
